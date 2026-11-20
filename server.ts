import 'dotenv/config';
import dns from 'node:dns';
dns.setDefaultResultOrder('ipv4first');
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import {
  clampScore,
  computeSessionNumericMetrics,
  getQuestionDistribution,
  normalizeGeneratedQuestions,
  resolveEffectiveRole,
  validateAnswerText,
  validateSetupConfig,
} from './src/utils/interviewLogic.ts';
import type {
  AnswerEvaluation,
  InterviewConfig,
  InterviewQuestion,
  QuestionAttempt,
} from './src/types/interview.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const MODEL_NAME = 'gemini-3.1-flash-lite';

interface ActiveSessionContext {
  sessionId: string;
  config: InterviewConfig;
  effectiveRole: string;
  questions: InterviewQuestion[];
  attempts: QuestionAttempt[];
  createdAt: number;
}

const activeSessions = new Map<string, ActiveSessionContext>();

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error(
      'GEMINI_API_KEY is not configured. Please set a valid Gemini API key in Settings > Secrets.',
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function withRetry<T>(fn: () => Promise<T>, retries = 2): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const msg = err instanceof Error ? err.message : String(err);
      const isTransient =
        msg.includes('503') ||
        msg.includes('429') ||
        msg.includes('UNAVAILABLE') ||
        msg.includes('ECONNRESET');
      if (!isTransient || i === retries) {
        throw err;
      }
      await new Promise((r) => setTimeout(r, 500 * Math.pow(2, i)));
    }
  }
  throw lastErr;
}

function formatGeminiError(err: unknown): { status: number; message: string } {
  const raw = err instanceof Error ? err.message : String(err);
  if (
    raw.includes('GEMINI_API_KEY') ||
    raw.includes('API_KEY_INVALID') ||
    raw.includes('PERMISSION_DENIED')
  ) {
    return {
      status: 400,
      message:
        'Gemini API key is missing or invalid. Please check your key in the Settings > Secrets panel.',
    };
  }
  if (raw.includes('RESOURCE_EXHAUSTED') || raw.includes('429')) {
    return {
      status: 429,
      message:
        'AI service rate limit reached. Please wait a moment and try again.',
    };
  }
  if (raw.includes('NOT_FOUND') || raw.includes('404')) {
    return {
      status: 502,
      message:
        'Configured AI model was not found. Please verify model availability.',
    };
  }
  return {
    status: 502,
    message: raw || 'Failed to communicate with AI interviewer service.',
  };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, model: MODEL_NAME });
  });

  // 1. Generate 5 tailored interview questions
  app.post('/api/interview/generate', async (req, res) => {
    try {
      const config = req.body?.config as InterviewConfig | undefined;
      if (!config) {
        return res.status(400).json({ error: 'Interview configuration is required.' });
      }

      const validation = validateSetupConfig(config);
      if (!validation.valid) {
        return res.status(400).json({ error: validation.error });
      }

      const effectiveRole = resolveEffectiveRole(config);
      const distribution = getQuestionDistribution(config.interviewType);
      const techCount = distribution.filter((c) => c === 'Technical').length;
      const hrCount = distribution.filter((c) => c === 'HR').length;
      const focusNote =
        config.focusAreas && config.focusAreas.length > 0
          ? `Prioritize targeting these weak areas from previous practice: ${config.focusAreas.join(', ')}.`
          : 'Cover a realistic, well-rounded variety of topics for this role.';

      const prompt = [
        `Generate exactly 5 realistic, distinct interview questions for a candidate applying for the role of "${effectiveRole}".`,
        `Candidate Experience Level: ${config.experienceLevel}.`,
        `Target Difficulty: ${config.difficulty}.`,
        `Interview Type: ${config.interviewType}.`,
        `Category distribution (STRICT): ${techCount} Technical question(s) followed by ${hrCount} HR/Behavioral question(s).`,
        `Randomization seed for fresh variety: ${Date.now()}-${Math.floor(Math.random() * 10000)}.`,
        focusNote,
        `Requirements:`,
        `- If Fresher, focus on core fundamentals, problem-solving, projects, and foundational concepts rather than 8-year architecture war stories.`,
        `- If Experienced, include production trade-offs, scalability, debugging, ownership, and leadership.`,
        `- Keep each question clear, direct, and realistic for a live interview.`,
        `- For Technical questions, set category to "Technical". For HR questions, set category to "HR".`,
      ].join('\n');

      const ai = getGeminiClient();
      const response = await withRetry(() =>
        ai.models.generateContent({
          model: MODEL_NAME,
          contents: prompt,
          config: {
            systemInstruction:
              'You are a senior technical and HR hiring interviewer. Produce strictly valid JSON matching the requested schema. Never repeat cliché trivia if deeper practical questions fit better.',
            thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  category: {
                    type: Type.STRING,
                    description: 'Either "Technical" or "HR"',
                  },
                  difficulty: {
                    type: Type.STRING,
                    description: 'Easy, Medium, or Hard',
                  },
                  topic: {
                    type: Type.STRING,
                    description: 'Short 2-4 word skill or competency topic',
                  },
                  text: {
                    type: Type.STRING,
                    description: 'The full interview question prompt',
                  },
                },
                required: ['category', 'difficulty', 'topic', 'text'],
              },
            },
          },
        }),
      );

      const rawText = (response.text ?? '[]').trim();
      const parsed = JSON.parse(rawText) as Array<Partial<InterviewQuestion>>;
      const questions = normalizeGeneratedQuestions(
        Array.isArray(parsed) ? parsed : [],
        config.interviewType,
        config.difficulty,
      );

      const sessionId = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      activeSessions.set(sessionId, {
        sessionId,
        config,
        effectiveRole,
        questions,
        attempts: [],
        createdAt: Date.now(),
      });

      // Prune sessions older than 6 hours
      const cutoff = Date.now() - 6 * 60 * 60 * 1000;
      for (const [key, val] of activeSessions.entries()) {
        if (val.createdAt < cutoff) activeSessions.delete(key);
      }

      return res.json({
        sessionId,
        effectiveRole,
        questions,
      });
    } catch (err) {
      const mapped = formatGeminiError(err);
      return res.status(mapped.status).json({ error: mapped.message });
    }
  });

  // 2. Evaluate an individual answer with full session context
  app.post('/api/interview/evaluate', async (req, res) => {
    try {
      const { sessionId, config, question, userAnswer, priorAttempts } = req.body as {
        sessionId?: string;
        config?: InterviewConfig;
        question?: InterviewQuestion;
        userAnswer?: string;
        priorAttempts?: QuestionAttempt[];
      };

      if (!question || !config) {
        return res.status(400).json({ error: 'Question and configuration are required.' });
      }

      const answerCheck = validateAnswerText(userAnswer ?? '');
      if (!answerCheck.valid) {
        return res.status(400).json({ error: answerCheck.error });
      }

      const effectiveRole = resolveEffectiveRole(config);
      const cachedSession = sessionId ? activeSessions.get(sessionId) : undefined;
      const historyAttempts =
        cachedSession && cachedSession.attempts.length > 0
          ? cachedSession.attempts
          : Array.isArray(priorAttempts)
            ? priorAttempts
            : [];

      const sessionHistorySummary =
        historyAttempts.length > 0
          ? historyAttempts
              .map(
                (a) =>
                  `Q${a.question.questionNumber} (${a.question.category} - ${a.question.topic}): "${a.question.text}" | Candidate scored ${a.evaluation.score}/10 | Key feedback: ${a.evaluation.interviewerFeedback}`,
              )
              .join('\n')
          : 'This is the first question of the session.';

      const prompt = [
        `Evaluate the candidate's interview answer strictly and constructively.`,
        `Role: ${effectiveRole} (${config.experienceLevel}, ${config.difficulty} difficulty, ${config.interviewType} interview).`,
        `Previous Questions & Evaluations in This Session (use this context so feedback stays coherent and non-repetitive):`,
        sessionHistorySummary,
        ``,
        `Current Question #${question.questionNumber} [${question.category} · ${question.difficulty} · ${question.topic}]:`,
        `"${question.text}"`,
        ``,
        `Candidate's Answer:`,
        `"${(userAnswer ?? '').trim()}"`,
        ``,
        `Scoring & Evaluation Rules (CRITICAL):`,
        `- Evaluate on: Technical accuracy, Relevance to the question, Clarity, Completeness, and Communication quality.`,
        `- Do NOT award high scores (>5) to incorrect, off-topic, nonsensical, or buzzword-only answers. Be fair, honest, and beginner-friendly.`,
        `- Never invent technical facts or misrepresent concepts.`,
        `- Score scale: 0-3 (incorrect/irrelevant/very incomplete), 4-5 (partial understanding, major gaps), 6-7 (solid core answer, missing depth or edge cases), 8-9 (strong, accurate, well-structured), 10 (exceptional).`,
        `- Provide a concrete, well-written Sample Better Answer tailored to the candidate's experience level (${config.experienceLevel}).`,
      ].join('\n');

      const ai = getGeminiClient();
      const response = await withRetry(() =>
        ai.models.generateContent({
          model: MODEL_NAME,
          contents: prompt,
          config: {
            systemInstruction:
              'You are a strict yet supportive senior interviewer and mentor. Return strictly valid JSON matching the schema. Never inflate scores for wrong answers.',
            thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                score: {
                  type: Type.NUMBER,
                  description: 'Overall answer score from 0 to 10 (one decimal max)',
                },
                communicationScore: {
                  type: Type.NUMBER,
                  description: 'Clarity and communication quality from 0 to 10',
                },
                confidenceScore: {
                  type: Type.NUMBER,
                  description: 'Structured conviction and decisiveness from 0 to 10',
                },
                whatWasGood: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: '2-3 specific strengths in the candidate answer',
                },
                whatWasMissing: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: '1-3 specific concepts, steps, or details missing',
                },
                areasToImprove: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: '1-3 actionable improvements',
                },
                sampleBetterAnswer: {
                  type: Type.STRING,
                  description: 'A clear, model interview response the candidate can learn from',
                },
                interviewerFeedback: {
                  type: Type.STRING,
                  description: 'Constructive 2-3 sentence summary directly from the AI interviewer',
                },
              },
              required: [
                'score',
                'communicationScore',
                'confidenceScore',
                'whatWasGood',
                'whatWasMissing',
                'areasToImprove',
                'sampleBetterAnswer',
                'interviewerFeedback',
              ],
            },
          },
        }),
      );

      const raw = JSON.parse((response.text ?? '{}').trim()) as Partial<AnswerEvaluation>;
      const evaluation: AnswerEvaluation = {
        score: clampScore(Number(raw.score ?? 0)),
        communicationScore: clampScore(Number(raw.communicationScore ?? raw.score ?? 0)),
        confidenceScore: clampScore(Number(raw.confidenceScore ?? raw.score ?? 0)),
        whatWasGood:
          Array.isArray(raw.whatWasGood) && raw.whatWasGood.length > 0
            ? raw.whatWasGood
            : ['Attempted to address the question directly.'],
        whatWasMissing:
          Array.isArray(raw.whatWasMissing) && raw.whatWasMissing.length > 0
            ? raw.whatWasMissing
            : ['Could include more concrete technical specifics or real examples.'],
        areasToImprove:
          Array.isArray(raw.areasToImprove) && raw.areasToImprove.length > 0
            ? raw.areasToImprove
            : ['Structure the answer with clear reasoning and trade-offs.'],
        sampleBetterAnswer:
          typeof raw.sampleBetterAnswer === 'string' && raw.sampleBetterAnswer.trim()
            ? raw.sampleBetterAnswer.trim()
            : 'Focus on defining the core concept first, explaining why it matters, and backing it up with a concise example.',
        interviewerFeedback:
          typeof raw.interviewerFeedback === 'string' && raw.interviewerFeedback.trim()
            ? raw.interviewerFeedback.trim()
            : 'Good effort. Review the missing points and compare your structure with the sample answer.',
      };

      if (cachedSession) {
        const existingIdx = cachedSession.attempts.findIndex(
          (a) => a.question.questionNumber === question.questionNumber,
        );
        const attempt: QuestionAttempt = {
          question,
          userAnswer: (userAnswer ?? '').trim(),
          evaluation,
          submittedAt: new Date().toISOString(),
        };
        if (existingIdx >= 0) {
          cachedSession.attempts[existingIdx] = attempt;
        } else {
          cachedSession.attempts.push(attempt);
        }
      }

      return res.json({ evaluation });
    } catch (err) {
      const mapped = formatGeminiError(err);
      return res.status(mapped.status).json({ error: mapped.message });
    }
  });

  // 3. Generate comprehensive Final Interview Report
  app.post('/api/interview/report', async (req, res) => {
    try {
      const { config, attempts } = req.body as {
        config?: InterviewConfig;
        attempts?: QuestionAttempt[];
      };

      if (!config || !Array.isArray(attempts) || attempts.length === 0) {
        return res
          .status(400)
          .json({ error: 'Interview configuration and evaluated attempts are required.' });
      }

      const effectiveRole = resolveEffectiveRole(config);
      const numeric = computeSessionNumericMetrics(attempts);

      const attemptDigest = attempts
        .map(
          (a) =>
            `Q${a.question.questionNumber} [${a.question.category} · ${a.question.topic}] Score: ${a.evaluation.score}/10 | Question: ${a.question.text} | Missing: ${a.evaluation.whatWasMissing.join('; ')} | Feedback: ${a.evaluation.interviewerFeedback}`,
        )
        .join('\n');

      const prompt = [
        `Synthesize a personalized final interview coaching report for a ${config.experienceLevel} "${effectiveRole}" candidate (${config.difficulty} difficulty, ${config.interviewType} mode).`,
        `Exact Session Scores: Total ${numeric.totalScore}/50, Average ${numeric.averageScore}/10, Technical ${numeric.technicalScore}/10, HR ${numeric.hrScore}/10, Communication ${numeric.communicationScore}/10.`,
        `Question-by-Question Digest:`,
        attemptDigest,
        ``,
        `Provide:`,
        `- overallSummary: 2-3 sentence assessment of interview readiness grounded strictly in the scores and performance above.`,
        `- skillsNeedingImprovement: 3-5 concrete technical or behavioral skill areas derived from what was missed.`,
        `- preparationRecommendations: 3-5 actionable study/practice steps tailored to these specific gaps.`,
      ].join('\n');

      const ai = getGeminiClient();
      const response = await withRetry(() =>
        ai.models.generateContent({
          model: MODEL_NAME,
          contents: prompt,
          config: {
            systemInstruction:
              'You are an executive interview coach. Return strictly valid JSON matching the schema, grounded solely in the provided session results.',
            thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                overallSummary: { type: Type.STRING },
                skillsNeedingImprovement: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                preparationRecommendations: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
              },
              required: [
                'overallSummary',
                'skillsNeedingImprovement',
                'preparationRecommendations',
              ],
            },
          },
        }),
      );

      const parsed = JSON.parse((response.text ?? '{}').trim()) as {
        overallSummary?: string;
        skillsNeedingImprovement?: string[];
        preparationRecommendations?: string[];
      };

      const report = {
        ...numeric,
        overallSummary:
          parsed.overallSummary?.trim() ||
          `Completed a 5-question ${config.interviewType} interview for ${effectiveRole} with an average score of ${numeric.averageScore}/10.`,
        skillsNeedingImprovement:
          Array.isArray(parsed.skillsNeedingImprovement) &&
          parsed.skillsNeedingImprovement.length > 0
            ? parsed.skillsNeedingImprovement
            : ['Deepening Core Concepts', 'Structured Answer Delivery'],
        preparationRecommendations:
          Array.isArray(parsed.preparationRecommendations) &&
          parsed.preparationRecommendations.length > 0
            ? parsed.preparationRecommendations
            : [
                'Review the sample better answers for your lowest-scoring questions and practice explaining trade-offs aloud.',
              ],
      };

      return res.json({ report });
    } catch (err) {
      const mapped = formatGeminiError(err);
      return res.status(mapped.status).json({ error: mapped.message });
    }
  });

  // Vite dev middleware or production static files
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AetherPrep AI server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
