import type {
  DashboardAggregates,
  DifficultyLevel,
  InterviewConfig,
  InterviewQuestion,
  InterviewReport,
  InterviewSessionRecord,
  InterviewType,
  QuestionAttempt,
  QuestionCategory,
  ReportHighlight,
} from '../types/interview';

export const TOTAL_QUESTIONS = 5;

export function resolveEffectiveRole(config: InterviewConfig): string {
  if (config.jobRole === 'Custom Job Role') {
    return (config.customRole ?? '').trim();
  }
  return config.jobRole.trim();
}

export function validateSetupConfig(config: InterviewConfig): {
  valid: boolean;
  error?: string;
} {
  const effectiveRole = resolveEffectiveRole(config);
  if (!effectiveRole) {
    return {
      valid: false,
      error: 'Please enter a custom job role before generating your interview.',
    };
  }
  if (effectiveRole.length < 2 || effectiveRole.length > 80) {
    return {
      valid: false,
      error: 'Job role must be between 2 and 80 characters.',
    };
  }
  return { valid: true };
}

export function validateAnswerText(answer: string): {
  valid: boolean;
  error?: string;
} {
  const trimmed = answer.trim();
  if (!trimmed) {
    return {
      valid: false,
      error: 'Please type your answer before submitting for AI evaluation.',
    };
  }
  if (trimmed.length < 10) {
    return {
      valid: false,
      error: 'Please provide a slightly more detailed answer (at least 10 characters) so the AI interviewer can evaluate it fairly.',
    };
  }
  return { valid: true };
}

/**
 * Enforces exact 5-question distribution:
 * - Mixed: 3 Technical + 2 HR
 * - Technical: 5 Technical
 * - HR: 5 HR
 */
export function getQuestionDistribution(
  interviewType: InterviewType,
): QuestionCategory[] {
  if (interviewType === 'Technical') {
    return ['Technical', 'Technical', 'Technical', 'Technical', 'Technical'];
  }
  if (interviewType === 'HR') {
    return ['HR', 'HR', 'HR', 'HR', 'HR'];
  }
  return ['Technical', 'Technical', 'Technical', 'HR', 'HR'];
}

export function normalizeGeneratedQuestions(
  rawQuestions: Array<Partial<InterviewQuestion>>,
  interviewType: InterviewType,
  defaultDifficulty: DifficultyLevel,
): InterviewQuestion[] {
  const expectedCategories = getQuestionDistribution(interviewType);
  const sliced = rawQuestions.slice(0, TOTAL_QUESTIONS);

  return expectedCategories.map((expectedCat, idx) => {
    const q = sliced[idx] ?? {};
    return {
      id: idx + 1,
      questionNumber: idx + 1,
      category: expectedCat,
      difficulty:
        q.difficulty === 'Easy' ||
        q.difficulty === 'Medium' ||
        q.difficulty === 'Hard'
          ? q.difficulty
          : defaultDifficulty,
      topic:
        typeof q.topic === 'string' && q.topic.trim().length > 0
          ? q.topic.trim()
          : `${expectedCat} Core`,
      text:
        typeof q.text === 'string' && q.text.trim().length > 0
          ? q.text.trim()
          : `Describe a key ${expectedCat.toLowerCase()} challenge you handled and your approach.`,
    };
  });
}

export function clampScore(value: number, min = 0, max = 10): number {
  if (!Number.isFinite(value)) return min;
  return Math.round(Math.min(max, Math.max(min, value)) * 10) / 10;
}

export function computeSessionNumericMetrics(attempts: QuestionAttempt[]): {
  totalScore: number;
  averageScore: number;
  technicalScore: number;
  hrScore: number;
  communicationScore: number;
  confidenceScore: number;
  strongestAnswers: ReportHighlight[];
  weakestAnswers: ReportHighlight[];
} {
  if (attempts.length === 0) {
    return {
      totalScore: 0,
      averageScore: 0,
      technicalScore: 0,
      hrScore: 0,
      communicationScore: 0,
      confidenceScore: 0,
      strongestAnswers: [],
      weakestAnswers: [],
    };
  }

  const totalScore =
    Math.round(
      attempts.reduce((sum, a) => sum + clampScore(a.evaluation.score), 0) * 10,
    ) / 10;
  const averageScore =
    Math.round((totalScore / attempts.length) * 10) / 10;

  const techAttempts = attempts.filter(
    (a) => a.question.category === 'Technical',
  );
  const hrAttempts = attempts.filter((a) => a.question.category === 'HR');

  const technicalScore =
    techAttempts.length > 0
      ? Math.round(
          (techAttempts.reduce((s, a) => s + clampScore(a.evaluation.score), 0) /
            techAttempts.length) *
            10,
        ) / 10
      : averageScore;

  const hrScore =
    hrAttempts.length > 0
      ? Math.round(
          (hrAttempts.reduce((s, a) => s + clampScore(a.evaluation.score), 0) /
            hrAttempts.length) *
            10,
        ) / 10
      : averageScore;

  const communicationScore =
    Math.round(
      (attempts.reduce(
        (s, a) => s + clampScore(a.evaluation.communicationScore),
        0,
      ) /
        attempts.length) *
        10,
    ) / 10;

  const confidenceScore =
    Math.round(
      (attempts.reduce(
        (s, a) => s + clampScore(a.evaluation.confidenceScore),
        0,
      ) /
        attempts.length) *
        10,
    ) / 10;

  const sortedDesc = [...attempts].sort(
    (a, b) => b.evaluation.score - a.evaluation.score,
  );
  const sortedAsc = [...attempts].sort(
    (a, b) => a.evaluation.score - b.evaluation.score,
  );

  const strongestAnswers: ReportHighlight[] = sortedDesc
    .slice(0, 2)
    .map((a) => ({
      questionNumber: a.question.questionNumber,
      category: a.question.category,
      score: clampScore(a.evaluation.score),
      summary:
        a.evaluation.whatWasGood[0] ||
        a.evaluation.interviewerFeedback ||
        a.question.topic,
    }));

  const weakestAnswers: ReportHighlight[] = sortedAsc
    .slice(0, 2)
    .map((a) => ({
      questionNumber: a.question.questionNumber,
      category: a.question.category,
      score: clampScore(a.evaluation.score),
      summary:
        a.evaluation.whatWasMissing[0] ||
        a.evaluation.areasToImprove[0] ||
        a.question.topic,
    }));

  return {
    totalScore,
    averageScore,
    technicalScore,
    hrScore,
    communicationScore,
    confidenceScore,
    strongestAnswers,
    weakestAnswers,
  };
}

export function aggregateDashboardStats(
  sessions: InterviewSessionRecord[],
): DashboardAggregates {
  if (sessions.length === 0) {
    return {
      totalSessions: 0,
      overallScore: 0,
      overallPercentage: 0,
      technicalScore: 0,
      communicationScore: 0,
      confidenceScore: 0,
      progressSeries: [],
      recommendations: [
        'Start your first 5-question AI mock interview to establish your baseline across technical and HR dimensions.',
      ],
    };
  }

  const avgOutOf10 =
    sessions.reduce((s, sess) => s + sess.report.averageScore, 0) /
    sessions.length;
  const techAvg =
    sessions.reduce((s, sess) => s + sess.report.technicalScore, 0) /
    sessions.length;
  const commAvg =
    sessions.reduce((s, sess) => s + sess.report.communicationScore, 0) /
    sessions.length;
  const confAvg =
    sessions.reduce((s, sess) => s + sess.report.confidenceScore, 0) /
    sessions.length;

  // Chronological order for progress chart (oldest to newest, up to last 8)
  const ordered = [...sessions]
    .sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    )
    .slice(-8);

  const progressSeries = ordered.map((sess, i) => ({
    label: `S${i + 1}`,
    role: resolveEffectiveRole(sess.config),
    scoreOutOf10: Math.round(sess.report.averageScore * 10) / 10,
    dateLabel: new Date(sess.createdAt).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    }),
  }));

  const recSet = new Set<string>();
  const latestFirst = [...sessions].sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  for (const sess of latestFirst) {
    for (const rec of sess.report.preparationRecommendations) {
      if (recSet.size < 4) recSet.add(rec);
    }
  }

  return {
    totalSessions: sessions.length,
    overallScore: Math.round(avgOutOf10 * 10) / 10,
    overallPercentage: Math.round(avgOutOf10 * 10),
    technicalScore: Math.round(techAvg * 10),
    communicationScore: Math.round(commAvg * 10),
    confidenceScore: Math.round(confAvg * 10),
    progressSeries,
    recommendations: Array.from(recSet),
  };
}

export function formatReportMarkdown(session: InterviewSessionRecord): string {
  const role = resolveEffectiveRole(session.config);
  const { report, attempts, config } = session;
  const lines: string[] = [
    `# AetherPrep AI — Mock Interview Performance Report`,
    ``,
    `- **Role**: ${role}`,
    `- **Experience Level**: ${config.experienceLevel}`,
    `- **Difficulty**: ${config.difficulty}`,
    `- **Interview Type**: ${config.interviewType}`,
    `- **Date**: ${new Date(session.createdAt).toLocaleString()}`,
    ``,
    `## Score Summary`,
    `- **Total Score**: ${report.totalScore} / 50`,
    `- **Average Score**: ${report.averageScore} / 10`,
    `- **Technical Performance**: ${report.technicalScore} / 10`,
    `- **HR Performance**: ${report.hrScore} / 10`,
    `- **Communication Skills**: ${report.communicationScore} / 10`,
    `- **Confidence Index**: ${report.confidenceScore} / 10`,
    ``,
    `## Executive Summary`,
    report.overallSummary,
    ``,
    `## Skills Needing Improvement`,
    ...report.skillsNeedingImprovement.map((s) => `- ${s}`),
    ``,
    `## Personalized Preparation Recommendations`,
    ...report.preparationRecommendations.map((r) => `- ${r}`),
    ``,
    `## Question-by-Question Review`,
  ];

  for (const a of attempts) {
    lines.push(
      ``,
      `### Question ${a.question.questionNumber} (${a.question.category} · ${a.question.difficulty} · ${a.question.topic})`,
      `**Prompt:** ${a.question.text}`,
      `**Your Answer:** ${a.userAnswer}`,
      `**Score:** ${a.evaluation.score} / 10`,
      `**What Was Good:** ${a.evaluation.whatWasGood.join('; ')}`,
      `**What Was Missing:** ${a.evaluation.whatWasMissing.join('; ')}`,
      `**Areas to Improve:** ${a.evaluation.areasToImprove.join('; ')}`,
      `**Sample Better Answer:** ${a.evaluation.sampleBetterAnswer}`,
      `**Interviewer Feedback:** ${a.evaluation.interviewerFeedback}`,
    );
  }

  return lines.join('\n');
}

export const SEED_SESSIONS: InterviewSessionRecord[] = [
  {
    id: 'seed-python-1',
    createdAt: '2026-11-14T10:15:00.000Z',
    isSeeded: true,
    config: {
      jobRole: 'Python Developer',
      experienceLevel: 'Fresher',
      difficulty: 'Medium',
      interviewType: 'Mixed',
    },
    attempts: [
      {
        question: {
          id: 1,
          questionNumber: 1,
          category: 'Technical',
          difficulty: 'Medium',
          topic: 'Memory & Generators',
          text: 'How do Python generators improve memory efficiency compared to returning a full list, and when would you avoid using one?',
        },
        userAnswer:
          'Generators yield one item at a time using lazy evaluation so they do not store the whole sequence in memory. You should avoid them if you need random indexing or multiple passes over the data.',
        evaluation: {
          score: 8.2,
          communicationScore: 8.0,
          confidenceScore: 8.0,
          whatWasGood: [
            'Accurately explained lazy evaluation and single-item yielding.',
            'Identified key trade-offs: lack of random access and single-pass exhaustion.',
          ],
          whatWasMissing: [
            'Could mention generator expressions vs yield functions and O(1) auxiliary space.',
          ],
          areasToImprove: [
            'Give a concrete production example such as streaming multi-gigabyte log files.',
          ],
          sampleBetterAnswer:
            'Generators produce values on demand via the iterator protocol, maintaining O(1) memory instead of O(N) for a materialized list. This makes them ideal for streaming large files or infinite pipelines. However, because they are single-pass and do not support indexing or len(), a list is better when random access or repeated iteration is needed.',
          interviewerFeedback:
            'Clear and technically accurate explanation; adding a concrete workload example will make it stand out.',
        },
        submittedAt: '2026-11-14T10:18:00.000Z',
      },
      {
        question: {
          id: 2,
          questionNumber: 2,
          category: 'Technical',
          difficulty: 'Medium',
          topic: 'Concurrency & GIL',
          text: 'Explain how the Python Global Interpreter Lock affects multithreading vs multiprocessing.',
        },
        userAnswer:
          'The GIL allows only one thread to execute Python bytecode at a time, so CPU-bound tasks do not scale with threads and should use multiprocessing. I/O-bound tasks still benefit from threading or asyncio.',
        evaluation: {
          score: 8.5,
          communicationScore: 8.5,
          confidenceScore: 8.2,
          whatWasGood: [
            'Correctly distinguished CPU-bound vs I/O-bound workloads.',
            'Clearly connected bytecode execution to the GIL bottleneck.',
          ],
          whatWasMissing: [
            'Could briefly note C extensions like NumPy releasing the GIL.',
          ],
          areasToImprove: [
            'Compare asyncio event-loop overhead against OS thread context switching.',
          ],
          sampleBetterAnswer:
            'The GIL serializes Python bytecode execution within a single process, meaning CPU-bound Python loops cannot run in parallel across cores using threads—multiprocessing or C extensions that release the GIL are required. For I/O-bound work, threads release the GIL while waiting on sockets or disk, making threading or asyncio effective.',
          interviewerFeedback:
            'Strong foundational grasp of Python concurrency trade-offs.',
        },
        submittedAt: '2026-11-14T10:21:00.000Z',
      },
      {
        question: {
          id: 3,
          questionNumber: 3,
          category: 'Technical',
          difficulty: 'Medium',
          topic: 'REST API Design',
          text: 'How would you design pagination and error handling for a FastAPI endpoint serving 100k records?',
        },
        userAnswer:
          'I would use limit and offset query parameters and return HTTP 400 or 500 status codes with JSON messages.',
        evaluation: {
          score: 6.4,
          communicationScore: 7.0,
          confidenceScore: 6.5,
          whatWasGood: [
            'Identified standard pagination parameters and structured JSON errors.',
          ],
          whatWasMissing: [
            'Missed cursor/keyset pagination for large datasets to avoid slow OFFSET scans.',
            'Did not mention Pydantic validation models or RFC 7807 style error envelopes.',
          ],
          areasToImprove: [
            'Explain why OFFSET degrades at high page numbers and how keyset pagination solves it.',
          ],
          sampleBetterAnswer:
            'For 100k+ records, keyset (cursor) pagination using an indexed created_at or id column avoids deep OFFSET scans and stays O(log N). In FastAPI, I would enforce bounds with Pydantic Query validators, return consistent error schemas via custom exception handlers (422 for validation, 404/409 for domain errors), and include next_cursor metadata.',
          interviewerFeedback:
            'Good start, though interviewers expect awareness of cursor pagination at scale.',
        },
        submittedAt: '2026-11-14T10:25:00.000Z',
      },
      {
        question: {
          id: 4,
          questionNumber: 4,
          category: 'HR',
          difficulty: 'Medium',
          topic: 'Ownership & Debugging',
          text: 'Tell me about a time you broke something or missed an edge case in a project. How did you handle it?',
        },
        userAnswer:
          'In a college Flask project I forgot to validate empty CSV uploads which crashed the parser. I added schema checks, wrote unit tests for malformed files, and documented the API contract.',
        evaluation: {
          score: 7.8,
          communicationScore: 8.2,
          confidenceScore: 7.8,
          whatWasGood: [
            'Took direct ownership without blaming others.',
            'Showed follow-through by adding regression tests and documentation.',
          ],
          whatWasMissing: [
            'Could quantify impact or timeline using full STAR structure.',
          ],
          areasToImprove: [
            'Frame behavioral stories explicitly with Situation, Task, Action, and Result.',
          ],
          sampleBetterAnswer:
            'During our team capstone using Flask, an unvalidated empty CSV upload triggered a 500 error during demo prep. I took ownership, added explicit MIME and row-level schema validation returning clear 400 messages, wrote 6 pytest edge-case tests, and updated our README contract—preventing any further crashes in final evaluation.',
          interviewerFeedback:
            'Honest, constructive response showing solid engineering habits.',
        },
        submittedAt: '2026-11-14T10:28:00.000Z',
      },
      {
        question: {
          id: 5,
          questionNumber: 5,
          category: 'HR',
          difficulty: 'Medium',
          topic: 'Collaboration',
          text: 'How do you handle technical disagreement with a teammate during code review?',
        },
        userAnswer:
          'I focus on objective criteria like readability, performance, and testability, listen to their reasoning, and prototype or benchmark if needed.',
        evaluation: {
          score: 7.6,
          communicationScore: 8.0,
          confidenceScore: 7.5,
          whatWasGood: [
            'Kept focus on objective engineering trade-offs rather than ego.',
          ],
          whatWasMissing: [
            'Missing a concrete past example demonstrating this mindset.',
          ],
          areasToImprove: [
            'Pair principles with a brief real story of resolving a PR disagreement.',
          ],
          sampleBetterAnswer:
            'I treat code reviews as collaborative problem-solving anchored on maintainability and performance. First, I ask clarifying questions to understand their constraints. When a teammate and I disagreed on caching strategy, we ran a quick benchmark together and agreed on an in-memory TTL cache with clear eviction metrics.',
          interviewerFeedback:
            'Healthy collaborative attitude; anchoring it to a real example strengthens credibility.',
        },
        submittedAt: '2026-11-14T10:31:00.000Z',
      },
    ],
    report: {
      totalScore: 38.5,
      averageScore: 7.7,
      technicalScore: 7.7,
      hrScore: 7.7,
      communicationScore: 7.9,
      confidenceScore: 7.6,
      overallSummary:
        'Solid foundational readiness for Python Developer roles with strong command of core language internals (GIL, generators) and collaborative ownership, with room to deepen backend scalability patterns.',
      strongestAnswers: [
        {
          questionNumber: 2,
          category: 'Technical',
          score: 8.5,
          summary: 'Clear explanation of GIL vs I/O and CPU-bound concurrency.',
        },
        {
          questionNumber: 1,
          category: 'Technical',
          score: 8.2,
          summary: 'Accurate breakdown of lazy evaluation and generator trade-offs.',
        },
      ],
      weakestAnswers: [
        {
          questionNumber: 3,
          category: 'Technical',
          score: 6.4,
          summary: 'Needed keyset pagination and structured API error schemas.',
        },
      ],
      skillsNeedingImprovement: [
        'Cursor / Keyset Pagination & Database Scaling',
        'Structured STAR Metrics in Behavioral Answers',
      ],
      preparationRecommendations: [
        'Practice designing paginated REST endpoints with keyset cursors and Pydantic error envelopes.',
        'Structure behavioral answers using measurable STAR outcomes.',
      ],
    },
  },
  {
    id: 'seed-frontend-2',
    createdAt: '2026-11-17T15:40:00.000Z',
    isSeeded: true,
    config: {
      jobRole: 'Frontend Developer',
      experienceLevel: 'Fresher',
      difficulty: 'Medium',
      interviewType: 'Mixed',
    },
    attempts: [],
    report: {
      totalScore: 41.5,
      averageScore: 8.3,
      technicalScore: 8.4,
      hrScore: 8.1,
      communicationScore: 8.4,
      confidenceScore: 8.0,
      overallSummary:
        'Strong improvement in clarity and technical depth across React rendering, state isolation, and accessibility fundamentals.',
      strongestAnswers: [
        {
          questionNumber: 1,
          category: 'Technical',
          score: 8.8,
          summary: 'Strong breakdown of React reconciliation and memoization trade-offs.',
        },
      ],
      weakestAnswers: [
        {
          questionNumber: 3,
          category: 'Technical',
          score: 7.2,
          summary: 'Expand on Core Web Vitals optimization (INP & LCP).',
        },
      ],
      skillsNeedingImprovement: [
        'Core Web Vitals (INP, CLS, LCP) Diagnostics',
        'Concise Behavioral Pacing',
      ],
      preparationRecommendations: [
        'Review browser rendering pipeline and Interaction to Next Paint (INP) profiling.',
        'Keep technical explanations structured: concept, trade-off, then real example.',
      ],
    },
  },
];
