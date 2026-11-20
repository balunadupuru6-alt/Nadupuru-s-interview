import { motion } from 'motion/react';
import {
  ArrowRight,
  BarChart3,
  BrainCircuit,
  CheckCircle2,
  Layers,
  MessageSquareText,
  ShieldCheck,
  Target,
} from 'lucide-react';
import { HolographicOrbCanvas } from './HolographicOrbCanvas';
import { PRESET_JOB_ROLES } from '../types/interview';

interface LandingPageProps {
  onStartInterview: () => void;
  onOpenDashboard: () => void;
  onSelectRoleShortcut: (role: string) => void;
}

const FEATURES = [
  {
    icon: BrainCircuit,
    kicker: '01. Adaptive Generation',
    title: 'Role-Specific 5-Question Sessions',
    description:
      'Every mock interview generates five fresh questions calibrated to your chosen engineering or design role, seniority level, and difficulty.',
  },
  {
    icon: MessageSquareText,
    kicker: '02. Deep Evaluation',
    title: 'Honest Technical & Clarity Scoring',
    description:
      'Receive a structured 6-part breakdown after every answer: score out of 10, strengths, gaps, improvements, sample answer, and interviewer coaching.',
  },
  {
    icon: Layers,
    kicker: '03. Session Memory',
    title: 'Context-Aware Follow-Up Coaching',
    description:
      'The AI interviewer tracks your answers across all five questions so feedback builds on your earlier responses rather than repeating generic advice.',
  },
  {
    icon: BarChart3,
    kicker: '04. 3D Analytics',
    title: 'Comprehensive Final Readiness Report',
    description:
      'Inspect circular gauges, a 3D question performance chart, strongest and weakest answers, and exportable preparation plans.',
  },
];

const WORKFLOW_STEPS = [
  {
    step: '01',
    title: 'Configure Your Track',
    detail:
      'Select from 7 specialized tech roles or enter a custom role, pick Fresher or Experienced level, set difficulty, and choose Technical, HR, or Mixed (3 Technical + 2 HR).',
  },
  {
    step: '02',
    title: 'Answer Under Guidance',
    detail:
      'Work through 5 structured questions alongside the reactive 3D holographic interviewer orb. Submit each response for immediate AI critique and a model answer.',
  },
  {
    step: '03',
    title: 'Review & Target Weak Areas',
    detail:
      'Unlock your final /50 readiness report, download a full Markdown summary, or launch a focused follow-up session targeting your weakest topics.',
  },
];

export function LandingPage({
  onStartInterview,
  onOpenDashboard,
  onSelectRoleShortcut,
}: LandingPageProps) {
  const scrollToFeatures = () => {
    document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="holo-grid-bg">
      {/* Hero Section */}
      <section className="relative mx-auto max-w-7xl px-4 pt-10 pb-16 sm:px-6 lg:px-8 lg:pt-14 lg:pb-24">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12">
          {/* Left Copy Column */}
          <div className="lg:col-span-6 space-y-6">
            <div className="flex items-center gap-2.5 text-xs font-medium tracking-wider text-rose-300">
              <span>AI Mock Interview Studio</span>
              <span aria-hidden="true" className="text-neutral-600">·</span>
              <span className="text-white/80">Technical &amp; HR Coaching</span>
            </div>

            <h1
              className="font-display font-extrabold tracking-tight text-white leading-[1.08]"
              style={{
                fontSize: 'clamp(2.25rem, 4.1vw, 3.6rem)',
                textWrap: 'balance',
              }}
            >
              YOUR NEXT INTERVIEW. YOUR NEXT BREAKTHROUGH.
            </h1>

            <p className="max-w-xl text-base leading-relaxed text-neutral-300 sm:text-lg">
              Practice smarter. Answer confidently. Get interview-ready with your
              personal AI interviewer.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <button
                type="button"
                onClick={onStartInterview}
                className="holo-cta inline-flex items-center gap-2 rounded-xl px-6 py-3.5 text-sm font-semibold text-white transition-all whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
              >
                <span>Start Interview</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>

              <button
                type="button"
                onClick={scrollToFeatures}
                className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-black/70 px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:border-[#be123c] hover:bg-[#6b0f24]/30 whitespace-nowrap shrink-0"
              >
                <span>Explore Features</span>
              </button>

              <button
                type="button"
                onClick={onOpenDashboard}
                className="px-2 py-2 text-sm font-medium text-rose-300 hover:text-white underline-offset-4 hover:underline whitespace-nowrap shrink-0"
              >
                Open Dashboard
              </button>
            </div>

            <div className="grid grid-cols-3 gap-4 border-t border-white/10 pt-6">
              <div>
                <div className="font-mono text-xl font-bold tabular-nums text-white">
                  5 Qs
                </div>
                <div className="text-xs text-neutral-400 mt-0.5">
                  Structured per session
                </div>
              </div>
              <div>
                <div className="font-mono text-xl font-bold tabular-nums text-rose-300">
                  3 + 2
                </div>
                <div className="text-xs text-neutral-400 mt-0.5">
                  Mixed Tech &amp; HR split
                </div>
              </div>
              <div>
                <div className="font-mono text-xl font-bold tabular-nums text-white">
                  6-Point
                </div>
                <div className="text-xs text-neutral-400 mt-0.5">
                  Per-answer AI rubric
                </div>
              </div>
            </div>
          </div>

          {/* Right 3D Holographic Orb + Floating Interview Artifacts */}
          <div className="lg:col-span-6">
            <div className="relative h-[380px] sm:h-[460px] lg:h-[520px] w-full rounded-2xl border border-white/15 bg-[#0a0709]/85 overflow-hidden">
              <HolographicOrbCanvas
                orbState="idle"
                showFloatingObjects={true}
                className="h-full w-full"
              />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between border-t border-white/10 bg-black/85 px-5 py-3 text-xs text-neutral-300">
                <span>Interactive 3D Holographic Interviewer</span>
                <span className="font-mono text-rose-300 tabular-nums">
                  Real-Time Gemini Evaluation
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section
        id="features"
        className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 border-t border-white/10"
      >
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.45 }}
          className="max-w-2xl space-y-3"
        >
          <p className="text-xs font-medium tracking-wider text-rose-300">
            Platform Capabilities
          </p>
          <h2
            className="font-display text-2xl font-bold tracking-tight text-white sm:text-3xl"
            style={{ textWrap: 'balance' }}
          >
            Built for realistic interview pressure and measurable growth
          </h2>
          <p className="text-sm leading-relaxed text-neutral-300 sm:text-base">
            Every session evaluates technical accuracy, relevance, clarity,
            completeness, and communication quality without inflated scores.
          </p>
        </motion.div>

        <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2">
          {FEATURES.map((feat, idx) => {
            const Icon = feat.icon;
            return (
              <motion.article
                key={feat.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.4, delay: idx * 0.06 }}
                className="holo-panel rounded-2xl p-6 sm:p-7 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-rose-300">
                      {feat.kicker}
                    </span>
                    <Icon className="h-5 w-5 text-white" aria-hidden="true" />
                  </div>
                  <h3 className="mt-4 font-display text-lg font-semibold text-white">
                    {feat.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-neutral-300">
                    {feat.description}
                  </p>
                </div>
              </motion.article>
            );
          })}
        </div>
      </section>

      {/* Workflow Section */}
      <section
        id="workflow"
        className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 border-t border-white/10"
      >
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.45 }}
          className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
        >
          <div>
            <p className="text-xs font-medium tracking-wider text-rose-300">
              How It Works
            </p>
            <h2 className="mt-2 font-display text-2xl font-bold text-white sm:text-3xl">
              Three steps from setup to final readiness report
            </h2>
          </div>
          <button
            type="button"
            onClick={onStartInterview}
            className="text-sm font-semibold text-rose-300 hover:text-white inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <span>Configure a session now</span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </motion.div>

        <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {WORKFLOW_STEPS.map((item) => (
            <div key={item.step} className="holo-panel rounded-2xl p-6">
              <div className="font-mono text-2xl font-bold tabular-nums text-rose-300">
                {item.step}
              </div>
              <h3 className="mt-3 font-display text-lg font-semibold text-white">
                {item.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-neutral-300">
                {item.detail}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Role Tracks Section */}
      <section
        id="roles"
        className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 border-t border-white/10"
      >
        <div className="holo-panel-elevated rounded-2xl p-6 sm:p-10">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-center">
            <div className="lg:col-span-5 space-y-3">
              <div className="flex items-center gap-2 text-xs font-medium text-rose-300">
                <Target className="h-4 w-4" aria-hidden="true" />
                <span>Supported Career Tracks</span>
              </div>
              <h2 className="font-display text-2xl font-bold text-white">
                Launch directly into your target role
              </h2>
              <p className="text-sm leading-relaxed text-neutral-300">
                Pick a preset discipline or define any custom job title. Both
                Fresher and Experienced difficulty calibration are built in.
              </p>
              <div className="pt-2 flex flex-wrap items-center gap-3 text-xs text-neutral-400">
                <span className="inline-flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-rose-300" aria-hidden="true" />
                  Strict technical accuracy rubric
                </span>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-white" aria-hidden="true" />
                  Beginner-friendly explanations
                </span>
              </div>
            </div>

            <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[...PRESET_JOB_ROLES, 'Custom Job Role'].map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => onSelectRoleShortcut(role)}
                  className="rounded-xl border border-white/15 bg-black/75 px-3.5 py-3 text-left text-xs sm:text-sm font-medium text-white transition-all hover:border-[#be123c] hover:bg-[#800020]/30 hover:text-rose-100"
                >
                  {role}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 text-xs text-neutral-400 sm:flex-row sm:px-6 lg:px-8">
          <span>AetherPrep AI — 3D Mock Interview Assistant</span>
          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={onOpenDashboard}
              className="hover:text-white transition-colors"
            >
              Dashboard
            </button>
            <button
              type="button"
              onClick={onStartInterview}
              className="hover:text-white transition-colors"
            >
              New Interview
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
