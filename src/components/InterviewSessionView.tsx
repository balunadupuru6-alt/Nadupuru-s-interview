import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Loader2,
  Send,
  Sparkles,
} from 'lucide-react';
import { HolographicOrbCanvas } from './HolographicOrbCanvas';
import { CircularScoreGauge } from './CircularScoreGauge';
import {
  resolveEffectiveRole,
  TOTAL_QUESTIONS,
  validateAnswerText,
} from '../utils/interviewLogic';
import type {
  AnswerEvaluation,
  InterviewConfig,
  InterviewQuestion,
  OrbState,
  QuestionAttempt,
} from '../types/interview';

interface InterviewSessionViewProps {
  config: InterviewConfig;
  questions: InterviewQuestion[];
  currentIndex: number;
  attempts: QuestionAttempt[];
  isEvaluating: boolean;
  isFinalizingReport: boolean;
  errorMessage: string | null;
  onSubmitAnswer: (answer: string) => Promise<void>;
  onNextQuestion: () => void;
  onFinishReport: () => void;
}

export function InterviewSessionView({
  config,
  questions,
  currentIndex,
  attempts,
  isEvaluating,
  isFinalizingReport,
  errorMessage,
  onSubmitAnswer,
  onNextQuestion,
  onFinishReport,
}: InterviewSessionViewProps) {
  const currentQuestion = questions[currentIndex];
  const existingAttempt = attempts.find(
    (a) => a.question.questionNumber === currentQuestion?.questionNumber,
  );

  const [answerText, setAnswerText] = useState(
    existingAttempt?.userAnswer ?? '',
  );
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    setAnswerText(existingAttempt?.userAnswer ?? '');
    setValidationError(null);
    setIsTyping(false);
  }, [currentIndex, existingAttempt?.userAnswer]);

  if (!currentQuestion) {
    return null;
  }

  const evaluation: AnswerEvaluation | undefined = existingAttempt?.evaluation;
  const isLastQuestion = currentIndex === TOTAL_QUESTIONS - 1;
  const progressPercent = ((currentIndex + 1) / TOTAL_QUESTIONS) * 100;

  let orbState: OrbState = 'idle';
  let orbCaption = 'AI Interviewer ready for your response';
  if (isEvaluating || isFinalizingReport) {
    orbState = 'evaluating';
    orbCaption = isFinalizingReport
      ? 'Synthesizing final interview report...'
      : 'Analyzing technical accuracy, clarity, and completeness...';
  } else if (evaluation) {
    orbState = 'feedback';
    orbCaption = 'Evaluation complete. Review your personalized feedback.';
  } else if (isTyping || answerText.trim().length > 0) {
    orbState = 'listening';
    orbCaption = 'Monitoring response input...';
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const check = validateAnswerText(answerText);
    if (!check.valid) {
      setValidationError(check.error ?? 'Please enter a valid answer.');
      return;
    }
    setValidationError(null);
    await onSubmitAnswer(answerText.trim());
  };

  return (
    <div className="holo-grid-bg min-h-[calc(100vh-64px)] py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Session Header & Progress Bar */}
        <div className="holo-panel rounded-2xl p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs text-rose-300">
                <span>{resolveEffectiveRole(config)}</span>
                <span aria-hidden="true" className="text-neutral-600">·</span>
                <span className="text-white/85">{config.experienceLevel}</span>
                <span aria-hidden="true" className="text-neutral-600">·</span>
                <span className="text-white/85">{config.interviewType} Mode</span>
              </div>
              <h1 className="mt-1 font-display text-lg font-bold text-white">
                Question {currentQuestion.questionNumber}/{TOTAL_QUESTIONS}
              </h1>
            </div>

            <div className="flex items-center gap-2 font-mono text-xs tabular-nums text-neutral-300">
              <span>Progress</span>
              <span className="text-rose-300 font-semibold">
                {currentQuestion.questionNumber}/{TOTAL_QUESTIONS}
              </span>
            </div>
          </div>

          <div
            className="mt-3 h-2 w-full rounded-full bg-white/10 overflow-hidden"
            role="progressbar"
            aria-valuenow={currentQuestion.questionNumber}
            aria-valuemin={1}
            aria-valuemax={TOTAL_QUESTIONS}
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#800020] to-[#f43f5e] transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="mt-3 grid grid-cols-5 gap-2">
            {questions.map((q, idx) => {
              const done = attempts.some(
                (a) => a.question.questionNumber === q.questionNumber,
              );
              const active = idx === currentIndex;
              return (
                <div
                  key={q.id}
                  className={`rounded-lg px-1.5 sm:px-2.5 py-1.5 text-center text-[11px] font-medium border whitespace-nowrap ${
                    active
                      ? 'border-[#be123c] bg-[#800020]/45 text-white'
                      : done
                        ? 'border-white/30 bg-white/10 text-white'
                        : 'border-white/10 bg-black/50 text-neutral-400'
                  }`}
                >
                  Q{q.questionNumber} ·{' '}
                  <span className="sm:hidden">
                    {q.category === 'Technical' ? 'Tech' : 'HR'}
                  </span>
                  <span className="hidden sm:inline">{q.category}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Main Workspace: Left Reactive Orb + Right Question & Evaluation */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
          {/* Reactive 3D AI Interviewer Orb */}
          <aside className="lg:col-span-4 holo-panel rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-rose-300">
                AI Interviewer Orb
              </span>
              <span className="font-mono capitalize text-white">
                {orbState}
              </span>
            </div>
            <div className="h-[260px] w-full overflow-hidden">
              <HolographicOrbCanvas orbState={orbState} compact={true} />
            </div>
            <p className="text-center text-xs leading-relaxed text-neutral-300 px-2">
              {orbCaption}
            </p>
          </aside>

          {/* Question & Answer / Evaluation Column */}
          <div className="lg:col-span-8 space-y-6">
            {/* Question Card */}
            <section className="holo-panel-elevated rounded-2xl p-6 sm:p-8 space-y-5">
              <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-rose-300">
                <span className="font-mono tabular-nums text-white">
                  Question #{currentQuestion.questionNumber}
                </span>
                <span aria-hidden="true" className="text-neutral-600">·</span>
                <span>{currentQuestion.category}</span>
                <span aria-hidden="true" className="text-neutral-600">·</span>
                <span>{currentQuestion.difficulty} Difficulty</span>
                <span aria-hidden="true" className="text-neutral-600">·</span>
                <span className="text-neutral-300">{currentQuestion.topic}</span>
              </div>

              <h2 className="font-display text-xl font-semibold leading-snug text-white sm:text-2xl">
                {currentQuestion.text}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label
                      htmlFor="candidate-answer"
                      className="text-xs font-semibold text-neutral-200"
                    >
                      Your Answer
                    </label>
                    <span className="font-mono text-xs tabular-nums text-neutral-400">
                      {answerText.trim().length} chars
                    </span>
                  </div>
                  <textarea
                    id="candidate-answer"
                    rows={6}
                    value={answerText}
                    disabled={Boolean(evaluation) || isEvaluating}
                    onChange={(e) => {
                      setAnswerText(e.target.value);
                      setIsTyping(true);
                      setValidationError(null);
                    }}
                    onBlur={() => setIsTyping(false)}
                    placeholder="Explain your reasoning clearly, include trade-offs or concrete examples where relevant..."
                    className="w-full rounded-xl border border-white/20 bg-black/90 px-4 py-3.5 text-sm leading-relaxed text-white placeholder:text-neutral-500 focus:border-[#be123c] focus:outline-none focus:ring-2 focus:ring-[#9f1239]/35 disabled:opacity-80"
                  />
                </div>

                {(validationError || errorMessage) && (
                  <div
                    role="alert"
                    className="rounded-xl border border-rose-400/50 bg-[#4c0519]/75 px-4 py-3 text-sm text-rose-100"
                  >
                    {validationError || errorMessage}
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  {!evaluation ? (
                    <button
                      type="submit"
                      disabled={isEvaluating}
                      className="holo-cta inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white transition-all disabled:opacity-70"
                    >
                      {isEvaluating ? (
                        <>
                          <Loader2
                            className="h-4 w-4 animate-spin"
                            aria-hidden="true"
                          />
                          <span>Evaluating Answer...</span>
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4" aria-hidden="true" />
                          <span>Submit Answer</span>
                        </>
                      )}
                    </button>
                  ) : (
                    <div className="flex flex-wrap items-center gap-3 w-full justify-between">
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-white">
                        <CheckCircle2 className="h-4 w-4 text-rose-300" aria-hidden="true" />
                        Answer evaluated by AI interviewer
                      </span>

                      {!isLastQuestion ? (
                        <button
                          type="button"
                          onClick={onNextQuestion}
                          className="holo-cta inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white transition-all"
                        >
                          <span>Next Question</span>
                          <ArrowRight className="h-4 w-4" aria-hidden="true" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={onFinishReport}
                          disabled={isFinalizingReport}
                          className="holo-cta inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white transition-all disabled:opacity-70"
                        >
                          {isFinalizingReport ? (
                            <>
                              <Loader2
                                className="h-4 w-4 animate-spin"
                                aria-hidden="true"
                              />
                              <span>Generating Final Report...</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="h-4 w-4" aria-hidden="true" />
                              <span>Generate Final Report</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </form>
            </section>

            {/* 6-Part AI Answer Evaluation Panel */}
            {evaluation && (
              <section
                aria-label="AI Answer Evaluation"
                className="holo-panel-elevated rounded-2xl p-6 sm:p-8 space-y-6"
              >
                <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between border-b border-white/10 pb-6">
                  <div className="space-y-1.5 max-w-xl">
                    <div className="text-xs font-semibold text-rose-300">
                      6. Interviewer Feedback
                    </div>
                    <p className="text-sm leading-relaxed text-white">
                      {evaluation.interviewerFeedback}
                    </p>
                  </div>

                  <div className="shrink-0">
                    <CircularScoreGauge
                      value={evaluation.score}
                      max={10}
                      label="1. Answer Score"
                      accent={
                        evaluation.score >= 7.5
                          ? 'white'
                          : evaluation.score >= 5
                            ? 'rose'
                            : 'crimson'
                      }
                      size={104}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                  {/* 2. What Was Good */}
                  <div className="rounded-xl border border-white/20 bg-white/[0.04] p-4 space-y-2">
                    <h3 className="flex items-center gap-1.5 text-xs font-semibold text-white">
                      <CheckCircle2 className="h-4 w-4 text-rose-300" aria-hidden="true" />
                      <span>2. What Was Good</span>
                    </h3>
                    <ul className="space-y-1.5 text-xs leading-relaxed text-neutral-200">
                      {evaluation.whatWasGood.map((item, i) => (
                        <li key={i}>• {item}</li>
                      ))}
                    </ul>
                  </div>

                  {/* 3. What Was Missing */}
                  <div className="rounded-xl border border-[#be123c]/40 bg-[#4c0519]/30 p-4 space-y-2">
                    <h3 className="flex items-center gap-1.5 text-xs font-semibold text-rose-200">
                      <AlertTriangle className="h-4 w-4 text-rose-300" aria-hidden="true" />
                      <span>3. What Was Missing</span>
                    </h3>
                    <ul className="space-y-1.5 text-xs leading-relaxed text-neutral-200">
                      {evaluation.whatWasMissing.map((item, i) => (
                        <li key={i}>• {item}</li>
                      ))}
                    </ul>
                  </div>

                  {/* 4. Areas to Improve */}
                  <div className="rounded-xl border border-white/15 bg-black/55 p-4 space-y-2">
                    <h3 className="text-xs font-semibold text-rose-300">
                      4. Areas to Improve
                    </h3>
                    <ul className="space-y-1.5 text-xs leading-relaxed text-neutral-200">
                      {evaluation.areasToImprove.map((item, i) => (
                        <li key={i}>• {item}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* 5. Sample Better Answer */}
                <div className="rounded-xl border border-[#9f1239]/40 bg-black/75 p-5 space-y-2">
                  <div className="text-xs font-semibold text-rose-300">
                    5. Sample Better Answer
                  </div>
                  <p className="text-sm leading-relaxed text-neutral-200">
                    {evaluation.sampleBetterAnswer}
                  </p>
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
