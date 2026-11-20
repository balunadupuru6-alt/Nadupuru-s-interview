import { useMemo, useState } from 'react';
import {
  ArrowRight,
  Award,
  Calendar,
  ChevronRight,
  Lightbulb,
  Plus,
  Trash2,
} from 'lucide-react';
import { HolographicOrbCanvas } from './HolographicOrbCanvas';
import {
  aggregateDashboardStats,
  resolveEffectiveRole,
} from '../utils/interviewLogic';
import type {
  InterviewSessionRecord,
  InterviewType,
  OrbState,
} from '../types/interview';

interface DashboardViewProps {
  sessions: InterviewSessionRecord[];
  onStartNewInterview: (focusAreas?: string[]) => void;
  onViewReport: (session: InterviewSessionRecord) => void;
  onDeleteSession: (sessionId: string) => void;
}

export function DashboardView({
  sessions,
  onStartNewInterview,
  onViewReport,
  onDeleteSession,
}: DashboardViewProps) {
  const [orbState, setOrbState] = useState<OrbState>('idle');
  const [typeFilter, setTypeFilter] = useState<'All' | InterviewType>('All');

  const stats = useMemo(() => aggregateDashboardStats(sessions), [sessions]);

  const filteredSessions = useMemo(() => {
    const sorted = [...sessions].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    if (typeFilter === 'All') return sorted;
    return sorted.filter((s) => s.config.interviewType === typeFilter);
  }, [sessions, typeFilter]);

  // SVG progress polyline coordinates
  const chartPoints = useMemo(() => {
    const series = stats.progressSeries;
    if (series.length === 0) return { points: '', coords: [] as Array<{ x: number; y: number; label: string; score: number; role: string }> };
    const w = 520;
    const h = 160;
    const padX = 52;
    const padY = 22;
    const usableW = w - padX * 2;
    const usableH = h - padY * 2;

    const coords = series.map((item, idx) => {
      const x =
        series.length === 1
          ? w / 2
          : padX + (idx / (series.length - 1)) * usableW;
      const y = padY + (1 - Math.min(10, Math.max(0, item.scoreOutOf10)) / 10) * usableH;
      return {
        x,
        y,
        label: item.dateLabel,
        score: item.scoreOutOf10,
        role: item.role,
      };
    });

    const points = coords.map((c) => `${c.x},${c.y}`).join(' ');
    return { points, coords };
  }, [stats.progressSeries]);

  return (
    <div className="holo-grid-bg min-h-[calc(100vh-64px)] py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Welcome & Centerpiece 3D Orb */}
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-stretch">
          <div className="lg:col-span-7 holo-panel-elevated rounded-2xl p-6 sm:p-8 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-medium text-rose-300">
                <span>Performance Command Center</span>
                <span aria-hidden="true" className="text-neutral-600">·</span>
                <span className="font-mono tabular-nums text-white/80">
                  {stats.totalSessions} Completed Session{stats.totalSessions === 1 ? '' : 's'}
                </span>
              </div>
              <h1 className="font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
                Welcome back to your AI Interview Studio
              </h1>
              <p className="max-w-xl text-sm leading-relaxed text-neutral-300">
                Track your technical precision, communication clarity, and
                interview confidence across practice rounds. Launch a fresh
                5-question mock interview anytime.
              </p>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() => onStartNewInterview()}
                onMouseEnter={() => setOrbState('generating')}
                onMouseLeave={() => setOrbState('idle')}
                className="holo-cta inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white transition-all whitespace-nowrap shrink-0"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                <span>Start New Interview</span>
              </button>

              {sessions.length > 0 && (
                <button
                  type="button"
                  onClick={() => onViewReport(filteredSessions[0] ?? sessions[0])}
                  onMouseEnter={() => setOrbState('feedback')}
                  onMouseLeave={() => setOrbState('idle')}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-black/80 px-4 py-3 text-sm font-medium text-white hover:border-[#be123c] transition-colors whitespace-nowrap shrink-0"
                >
                  <span>Inspect Latest Report</span>
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </button>
              )}
            </div>
          </div>

          {/* 3D Holographic AI Orb Centerpiece */}
          <div className="lg:col-span-5 holo-panel rounded-2xl p-4 flex flex-col items-center justify-between min-h-[290px]">
            <div className="w-full flex items-center justify-between px-2 pt-1 text-xs text-neutral-400">
              <span>AI Interviewer Core</span>
              <span className="font-mono text-rose-300 capitalize">{orbState}</span>
            </div>
            <div className="w-full h-[220px] overflow-hidden">
              <HolographicOrbCanvas orbState={orbState} compact={true} />
            </div>
            <div className="flex items-center gap-2 pb-1">
              {(['idle', 'generating', 'evaluating', 'feedback'] as OrbState[]).map(
                (mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setOrbState(mode)}
                    className={`rounded-md px-2.5 py-1 text-[11px] font-medium capitalize transition-colors ${
                      orbState === mode
                        ? 'bg-[#881337]/50 text-white border border-[#be123c]'
                        : 'text-neutral-400 hover:text-white border border-transparent'
                    }`}
                  >
                    {mode}
                  </button>
                ),
              )}
            </div>
          </div>
        </section>

        {/* 4 Core KPI Glass Cards */}
        <section aria-label="Score metrics" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div
            onMouseEnter={() => setOrbState('feedback')}
            onMouseLeave={() => setOrbState('idle')}
            className="holo-panel rounded-2xl p-5 transition-colors hover:border-[#be123c]/60"
          >
            <div className="text-xs font-medium text-neutral-400">
              Overall Performance Score
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-mono text-3xl font-bold tabular-nums text-white">
                {stats.overallScore.toFixed(1)}
              </span>
              <span className="font-mono text-sm tabular-nums text-neutral-400">
                / 10
              </span>
            </div>
            <div className="mt-3 h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#800020] to-[#f43f5e] transition-all duration-500"
                style={{ width: `${stats.overallPercentage}%` }}
              />
            </div>
          </div>

          <div
            onMouseEnter={() => setOrbState('generating')}
            onMouseLeave={() => setOrbState('idle')}
            className="holo-panel rounded-2xl p-5 transition-colors hover:border-[#be123c]/60"
          >
            <div className="text-xs font-medium text-neutral-400">
              Technical Skills Score
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-mono text-3xl font-bold tabular-nums text-rose-300">
                {stats.technicalScore}%
              </span>
            </div>
            <div className="mt-3 h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-[#be123c] transition-all duration-500"
                style={{ width: `${stats.technicalScore}%` }}
              />
            </div>
          </div>

          <div
            onMouseEnter={() => setOrbState('listening')}
            onMouseLeave={() => setOrbState('idle')}
            className="holo-panel rounded-2xl p-5 transition-colors hover:border-[#be123c]/60"
          >
            <div className="text-xs font-medium text-neutral-400">
              Communication Score
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-mono text-3xl font-bold tabular-nums text-white">
                {stats.communicationScore}%
              </span>
            </div>
            <div className="mt-3 h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-white transition-all duration-500"
                style={{ width: `${stats.communicationScore}%` }}
              />
            </div>
          </div>

          <div
            onMouseEnter={() => setOrbState('evaluating')}
            onMouseLeave={() => setOrbState('idle')}
            className="holo-panel rounded-2xl p-5 transition-colors hover:border-[#be123c]/60"
          >
            <div className="text-xs font-medium text-neutral-400">
              Confidence Score
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-mono text-3xl font-bold tabular-nums text-rose-200">
                {stats.confidenceScore}%
              </span>
            </div>
            <div className="mt-3 h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-rose-300 transition-all duration-500"
                style={{ width: `${stats.confidenceScore}%` }}
              />
            </div>
          </div>
        </section>

        {/* Interview Progress Chart + Improvement Recommendations */}
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Progress Chart */}
          <div className="lg:col-span-7 holo-panel rounded-2xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-lg font-semibold text-white">
                  Interview Progress
                </h2>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Average score trajectory across completed mock sessions
                </p>
              </div>
              <span className="font-mono text-xs text-rose-300 tabular-nums">
                Scale 0–10
              </span>
            </div>

            {chartPoints.coords.length === 0 ? (
              <div className="mt-8 flex flex-col items-center justify-center rounded-xl border border-dashed border-white/15 py-12 text-center">
                <p className="text-sm text-neutral-400">
                  No interview trend data yet.
                </p>
                <button
                  type="button"
                  onClick={() => onStartNewInterview()}
                  className="mt-3 text-xs font-semibold text-rose-300 hover:underline"
                >
                  Complete your first session
                </button>
              </div>
            ) : (
              <div className="mt-5">
                <svg
                  viewBox="0 0 520 170"
                  className="w-full h-44 overflow-visible"
                  role="img"
                  aria-label="Interview score progression chart"
                >
                  {[2, 4, 6, 8, 10].map((tick) => {
                    const y = 20 + (1 - tick / 10) * 120;
                    return (
                      <g key={tick}>
                        <line
                          x1={28}
                          y1={y}
                          x2={492}
                          y2={y}
                          stroke="rgba(255, 255, 255, 0.1)"
                          strokeDasharray="4 4"
                        />
                        <text
                          x={8}
                          y={y + 4}
                          fill="#a3a3a3"
                          fontSize="10"
                          fontFamily="JetBrains Mono, monospace"
                        >
                          {tick}
                        </text>
                      </g>
                    );
                  })}

                  {chartPoints.coords.length > 1 && (
                    <polyline
                      fill="none"
                      stroke="#be123c"
                      strokeWidth="2.75"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      points={chartPoints.points}
                    />
                  )}

                  {chartPoints.coords.map((pt, i) => (
                    <g key={`${pt.role}-${i}`}>
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r="5.5"
                        fill="#070608"
                        stroke="#ffffff"
                        strokeWidth="2.5"
                      />
                      <text
                        x={pt.x}
                        y={pt.y - 11}
                        textAnchor="middle"
                        fill="#ffffff"
                        fontSize="11"
                        fontFamily="JetBrains Mono, monospace"
                      >
                        {pt.score.toFixed(1)}
                      </text>
                      <text
                        x={pt.x}
                        y={162}
                        textAnchor="middle"
                        fill="#a3a3a3"
                        fontSize="10"
                      >
                        {pt.label}
                      </text>
                    </g>
                  ))}
                </svg>
              </div>
            )}
          </div>

          {/* Improvement Recommendations */}
          <div className="lg:col-span-5 holo-panel rounded-2xl p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-rose-300">
                <Lightbulb className="h-4 w-4" aria-hidden="true" />
                <h2 className="font-display text-lg font-semibold text-white">
                  Improvement Recommendations
                </h2>
              </div>
              <ul className="mt-4 space-y-3">
                {stats.recommendations.map((rec, i) => (
                  <li
                    key={i}
                    className="rounded-xl border border-white/10 bg-black/50 px-4 py-3 text-sm leading-relaxed text-neutral-200"
                  >
                    {rec}
                  </li>
                ))}
              </ul>
            </div>

            <button
              type="button"
              onClick={() => onStartNewInterview(stats.recommendations.slice(0, 2))}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#be123c]/60 bg-[#800020]/30 px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#9f1239]/45 transition-colors"
            >
              <span>Practice Recommended Focus Areas</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </section>

        {/* Previous Interview Sessions */}
        <section className="holo-panel rounded-2xl p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-display text-lg font-semibold text-white">
                Previous Interview Sessions
              </h2>
              <p className="text-xs text-neutral-400 mt-0.5">
                Select any completed session to review detailed AI feedback and 3D analytics
              </p>
            </div>

            <div className="flex items-center gap-1 rounded-xl bg-black/80 p-1 border border-white/12">
              {(['All', 'Mixed', 'Technical', 'HR'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setTypeFilter(tab)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    typeFilter === tab
                      ? 'bg-[#881337]/60 text-white'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {filteredSessions.length === 0 ? (
            <div className="mt-6 rounded-xl border border-dashed border-white/15 py-10 text-center">
              <p className="text-sm text-neutral-400">
                No sessions match the selected filter.
              </p>
            </div>
          ) : (
            <div className="mt-5 divide-y divide-white/10">
              {filteredSessions.map((sess) => {
                const roleName = resolveEffectiveRole(sess.config);
                return (
                  <div
                    key={sess.id}
                    className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5">
                        <span className="font-display text-base font-semibold text-white">
                          {roleName}
                        </span>
                        {sess.isSeeded && (
                          <span className="text-xs text-neutral-500">
                            · Sample Benchmark
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-400">
                        <span>{sess.config.experienceLevel}</span>
                        <span aria-hidden="true">·</span>
                        <span>{sess.config.difficulty}</span>
                        <span aria-hidden="true">·</span>
                        <span>{sess.config.interviewType}</span>
                        <span aria-hidden="true">·</span>
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                          {new Date(sess.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="inline-flex items-center gap-1.5 font-mono text-base font-bold tabular-nums text-white">
                          <Award className="h-4 w-4 text-rose-300" aria-hidden="true" />
                          <span>{sess.report.totalScore.toFixed(1)} / 50</span>
                        </div>
                        <div className="font-mono text-xs tabular-nums text-neutral-400">
                          Avg {sess.report.averageScore.toFixed(1)}/10
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => onViewReport(sess)}
                        className="rounded-lg border border-white/20 bg-black px-3.5 py-2 text-xs font-semibold text-white hover:border-[#be123c] hover:bg-[#800020]/30 transition-colors whitespace-nowrap shrink-0"
                      >
                        View Report
                      </button>

                      <button
                        type="button"
                        aria-label={`Delete ${roleName} session`}
                        onClick={() => onDeleteSession(sess.id)}
                        className="rounded-lg border border-white/10 p-2 text-neutral-400 hover:border-[#be123c] hover:text-rose-300 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
