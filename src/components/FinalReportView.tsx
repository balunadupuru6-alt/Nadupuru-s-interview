import { useMemo, useState } from 'react';
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Download,
  RefreshCw,
  Target,
} from 'lucide-react';
import { CircularScoreGauge } from './CircularScoreGauge';
import { PerformanceChart3D, type ChartPillarItem } from './PerformanceChart3D';
import {
  formatReportMarkdown,
  resolveEffectiveRole,
} from '../utils/interviewLogic';
import type { InterviewSessionRecord } from '../types/interview';

interface FinalReportViewProps {
  session: InterviewSessionRecord;
  onRetryInterview: () => void;
  onPracticeWeakAreas: (weakAreas: string[]) => void;
  onBackToDashboard: () => void;
}

export function FinalReportView({
  session,
  onRetryInterview,
  onPracticeWeakAreas,
  onBackToDashboard,
}: FinalReportViewProps) {
  const [chartMode, setChartMode] = useState<'questions' | 'dimensions'>(
    session.attempts.length > 0 ? 'questions' : 'dimensions',
  );
  const [expandedQ, setExpandedQ] = useState<number | null>(null);

  const { report, config, attempts } = session;
  const roleName = resolveEffectiveRole(config);

  const chartItems: ChartPillarItem[] = useMemo(() => {
    if (chartMode === 'questions' && attempts.length > 0) {
      return attempts.map((a) => ({
        label: `Q${a.question.questionNumber}`,
        sublabel: `${a.question.category} · ${a.question.topic}`,
        value: a.evaluation.score,
        colorHex:
          a.question.category === 'Technical' ? '#9f1239' : '#f8fafc',
      }));
    }
    return [
      {
        label: 'Average',
        sublabel: 'Overall Session Mean',
        value: report.averageScore,
        colorHex: '#9f1239',
      },
      {
        label: 'Technical',
        sublabel: 'Technical Accuracy & Depth',
        value: report.technicalScore,
        colorHex: '#be123c',
      },
      {
        label: 'HR',
        sublabel: 'Behavioral & Ownership',
        value: report.hrScore,
        colorHex: '#f8fafc',
      },
      {
        label: 'Clarity',
        sublabel: 'Communication Quality',
        value: report.communicationScore,
        colorHex: '#fda4af',
      },
      {
        label: 'Confidence',
        sublabel: 'Structured Conviction',
        value: report.confidenceScore,
        colorHex: '#881337',
      },
    ];
  }, [chartMode, attempts, report]);

  const handleDownloadReport = () => {
    const markdown = formatReportMarkdown(session);
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeRole = roleName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    a.download = `aetherprep-${safeRole}-report.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="holo-grid-bg min-h-[calc(100vh-64px)] py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Header + Action Toolbar */}
        <section className="holo-panel-elevated rounded-2xl p-6 sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-rose-300">
                <span>Final Interview Report</span>
                <span aria-hidden="true" className="text-neutral-600">·</span>
                <span className="text-white">{roleName}</span>
                <span aria-hidden="true" className="text-neutral-600">·</span>
                <span className="text-neutral-300">{config.experienceLevel}</span>
                <span aria-hidden="true" className="text-neutral-600">·</span>
                <span className="text-neutral-300">{config.difficulty}</span>
              </div>
              <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">
                Interview Performance Assessment
              </h1>
              <p className="max-w-2xl text-sm leading-relaxed text-neutral-300">
                {report.overallSummary}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={onRetryInterview}
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-black px-4 py-2.5 text-xs font-semibold text-white hover:border-[#be123c] transition-colors whitespace-nowrap"
              >
                <RefreshCw className="h-4 w-4 text-rose-300" aria-hidden="true" />
                <span>Retry Interview</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  onPracticeWeakAreas(report.skillsNeedingImprovement)
                }
                className="holo-cta inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold text-white transition-all whitespace-nowrap"
              >
                <Target className="h-4 w-4" aria-hidden="true" />
                <span>Practice Weak Areas</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadReport}
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-black/90 px-4 py-2.5 text-xs font-semibold text-white hover:border-[#be123c] transition-colors whitespace-nowrap"
              >
                <Download className="h-4 w-4 text-rose-300" aria-hidden="true" />
                <span>Download Report</span>
              </button>

              <button
                type="button"
                onClick={onBackToDashboard}
                className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-4 py-2.5 text-xs font-semibold text-neutral-300 hover:text-white transition-colors whitespace-nowrap"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                <span>Back to Dashboard</span>
              </button>
            </div>
          </div>
        </section>

        {/* Circular Score Gauges */}
        <section className="holo-panel rounded-2xl p-6 sm:p-8">
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-5">
            <CircularScoreGauge
              value={report.totalScore}
              max={50}
              label="Total Score"
              sublabel="Out of 50"
              accent="burgundy"
            />
            <CircularScoreGauge
              value={report.averageScore}
              max={10}
              label="Average Score"
              sublabel="Per question mean"
              accent="white"
            />
            <CircularScoreGauge
              value={report.technicalScore}
              max={10}
              label="Technical"
              sublabel="Accuracy & depth"
              accent="crimson"
            />
            <CircularScoreGauge
              value={report.hrScore}
              max={10}
              label="HR Performance"
              sublabel="Behavioral clarity"
              accent="rose"
            />
            <CircularScoreGauge
              value={report.communicationScore}
              max={10}
              label="Communication"
              sublabel="Structure & tone"
              accent="white"
            />
          </div>
        </section>

        {/* 3D Performance Chart & Highlights */}
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="lg:col-span-7 holo-panel rounded-2xl p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
              <div>
                <h2 className="font-display text-lg font-semibold text-white">
                  3D Performance Breakdown
                </h2>
                <p className="text-xs text-neutral-400">
                  Click any 3D pillar or selector tab to inspect individual scores
                </p>
              </div>
              <div className="flex items-center gap-1 rounded-lg bg-black/80 p-1 border border-white/12">
                {attempts.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setChartMode('questions')}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                      chartMode === 'questions'
                        ? 'bg-[#881337]/60 text-white'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    By Question
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setChartMode('dimensions')}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                    chartMode === 'dimensions'
                      ? 'bg-[#881337]/60 text-white'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  By Skill
                </button>
              </div>
            </div>

            <PerformanceChart3D items={chartItems} />
          </div>

          <div className="lg:col-span-5 space-y-6">
            {/* Strongest Answers */}
            <div className="holo-panel rounded-2xl p-6 space-y-3">
              <h2 className="font-display text-base font-semibold text-white">
                Strongest Answers
              </h2>
              <div className="space-y-2.5">
                {report.strongestAnswers.map((item) => (
                  <div
                    key={`strong-${item.questionNumber}`}
                    className="rounded-xl border border-white/20 bg-white/[0.04] p-3.5"
                  >
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-white">
                        Question {item.questionNumber} · {item.category}
                      </span>
                      <span className="font-mono tabular-nums text-white">
                        {item.score.toFixed(1)}/10
                      </span>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-neutral-300">
                      {item.summary}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Weakest Answers */}
            <div className="holo-panel rounded-2xl p-6 space-y-3">
              <h2 className="font-display text-base font-semibold text-rose-300">
                Weakest Answers
              </h2>
              <div className="space-y-2.5">
                {report.weakestAnswers.map((item) => (
                  <div
                    key={`weak-${item.questionNumber}`}
                    className="rounded-xl border border-[#be123c]/40 bg-[#4c0519]/30 p-3.5"
                  >
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-white">
                        Question {item.questionNumber} · {item.category}
                      </span>
                      <span className="font-mono tabular-nums text-rose-300">
                        {item.score.toFixed(1)}/10
                      </span>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-neutral-300">
                      {item.summary}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Skills to Improve & Personalized Recommendations */}
        <section className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="holo-panel rounded-2xl p-6 space-y-3">
            <h2 className="font-display text-lg font-semibold text-white">
              Skills That Need Improvement
            </h2>
            <ul className="space-y-2.5">
              {report.skillsNeedingImprovement.map((skill, idx) => (
                <li
                  key={idx}
                  className="rounded-xl border border-white/12 bg-black/55 px-4 py-3 text-sm text-neutral-200"
                >
                  {skill}
                </li>
              ))}
            </ul>
          </div>

          <div className="holo-panel rounded-2xl p-6 space-y-3">
            <h2 className="font-display text-lg font-semibold text-white">
              Personalized Preparation Recommendations
            </h2>
            <ul className="space-y-2.5">
              {report.preparationRecommendations.map((rec, idx) => (
                <li
                  key={idx}
                  className="rounded-xl border border-[#be123c]/35 bg-[#4c0519]/25 px-4 py-3 text-sm text-neutral-200"
                >
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Question-by-Question Transcript & Coaching */}
        {attempts.length > 0 && (
          <section className="holo-panel rounded-2xl p-6 space-y-4">
            <h2 className="font-display text-lg font-semibold text-white">
              Complete Question-by-Question Breakdown
            </h2>
            <div className="divide-y divide-white/10">
              {attempts.map((attempt) => {
                const isOpen = expandedQ === attempt.question.questionNumber;
                return (
                  <div key={attempt.question.questionNumber} className="py-3">
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      onClick={() =>
                        setExpandedQ(
                          isOpen ? null : attempt.question.questionNumber,
                        )
                      }
                      className="flex w-full items-center justify-between gap-4 py-2 text-left"
                    >
                      <div>
                        <div className="text-xs text-rose-300">
                          Q{attempt.question.questionNumber} ·{' '}
                          {attempt.question.category} ·{' '}
                          {attempt.question.topic}
                        </div>
                        <div className="mt-1 text-sm font-medium text-white">
                          {attempt.question.text}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="font-mono text-sm font-bold tabular-nums text-white">
                          {attempt.evaluation.score.toFixed(1)}/10
                        </span>
                        {isOpen ? (
                          <ChevronUp className="h-4 w-4 text-neutral-400" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-neutral-400" />
                        )}
                      </div>
                    </button>

                    {isOpen && (
                      <div className="mt-3 space-y-3 rounded-xl border border-white/12 bg-black/75 p-4 text-xs leading-relaxed">
                        <div>
                          <span className="font-semibold text-neutral-400">
                            Your Answer:{' '}
                          </span>
                          <span className="text-neutral-200">
                            {attempt.userAnswer}
                          </span>
                        </div>
                        <div>
                          <span className="font-semibold text-rose-300">
                            Interviewer Feedback:{' '}
                          </span>
                          <span className="text-neutral-200">
                            {attempt.evaluation.interviewerFeedback}
                          </span>
                        </div>
                        <div>
                          <span className="font-semibold text-white">
                            Sample Better Answer:{' '}
                          </span>
                          <span className="text-neutral-200">
                            {attempt.evaluation.sampleBetterAnswer}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
