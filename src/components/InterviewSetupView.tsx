import { useState } from 'react';
import { ArrowLeft, Loader2, Sparkles } from 'lucide-react';
import { HolographicOrbCanvas } from './HolographicOrbCanvas';
import {
  PRESET_JOB_ROLES,
  type DifficultyLevel,
  type ExperienceLevel,
  type InterviewConfig,
  type InterviewType,
} from '../types/interview';
import { validateSetupConfig } from '../utils/interviewLogic';

interface InterviewSetupViewProps {
  initialConfig: InterviewConfig;
  isGenerating: boolean;
  serverError: string | null;
  onGenerate: (config: InterviewConfig) => void;
  onBack: () => void;
}

const EXPERIENCE_LEVELS: ExperienceLevel[] = ['Fresher', 'Experienced'];
const DIFFICULTIES: DifficultyLevel[] = ['Easy', 'Medium', 'Hard'];
const INTERVIEW_TYPES: Array<{
  type: InterviewType;
  note: string;
}> = [
  { type: 'Mixed', note: '3 Technical + 2 HR questions' },
  { type: 'Technical', note: '5 Role-specific technical questions' },
  { type: 'HR', note: '5 Behavioral & situational questions' },
];

export function InterviewSetupView({
  initialConfig,
  isGenerating,
  serverError,
  onGenerate,
  onBack,
}: InterviewSetupViewProps) {
  const [config, setConfig] = useState<InterviewConfig>(initialConfig);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const check = validateSetupConfig(config);
    if (!check.valid) {
      setValidationError(check.error ?? 'Invalid configuration.');
      return;
    }
    setValidationError(null);
    onGenerate(config);
  };

  const roleOptions = [...PRESET_JOB_ROLES, 'Custom Job Role'];

  return (
    <div className="holo-grid-bg min-h-[calc(100vh-64px)] py-8">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            disabled={isGenerating}
            className="inline-flex items-center gap-2 text-sm font-medium text-neutral-300 hover:text-white transition-colors disabled:opacity-50"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span>Back to Dashboard</span>
          </button>
          <span className="font-mono text-xs text-rose-300">
            5-Question Adaptive Session
          </span>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 items-start">
          {/* Configuration Form */}
          <form
            onSubmit={handleSubmit}
            noValidate
            className="lg:col-span-8 holo-panel-elevated rounded-2xl p-6 sm:p-8 space-y-7"
          >
            <div>
              <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">
                Configure Your Mock Interview
              </h1>
              <p className="mt-1.5 text-sm text-neutral-300">
                Tailor the role, seniority, difficulty, and interview format. Your
                AI interviewer generates 5 custom questions in real time.
              </p>
            </div>

            {config.focusAreas && config.focusAreas.length > 0 && (
              <div className="rounded-xl border border-[#be123c]/50 bg-[#800020]/25 p-4">
                <div className="text-xs font-semibold text-rose-200">
                  Targeted Weak-Area Practice Active
                </div>
                <p className="mt-1 text-xs text-neutral-200">
                  Focusing on: {config.focusAreas.join(' · ')}
                </p>
              </div>
            )}

            {/* 1. Job Role */}
            <fieldset className="space-y-3">
              <legend className="text-sm font-semibold text-white">
                1. Target Job Role
              </legend>
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                {roleOptions.map((role) => {
                  const selected = config.jobRole === role;
                  return (
                    <button
                      key={role}
                      type="button"
                      disabled={isGenerating}
                      onClick={() => {
                        setConfig((prev) => ({ ...prev, jobRole: role }));
                        setValidationError(null);
                      }}
                      className={`rounded-xl border px-3 py-3 text-left text-xs sm:text-sm font-medium transition-all ${
                        selected
                          ? 'border-[#be123c] bg-[#800020]/45 text-white shadow-[0_0_20px_-6px_rgba(190,18,60,0.65)]'
                          : 'border-white/12 bg-black/65 text-neutral-300 hover:border-[#be123c]/60 hover:text-white'
                      }`}
                    >
                      {role}
                    </button>
                  );
                })}
              </div>

              {config.jobRole === 'Custom Job Role' && (
                <div className="pt-2">
                  <label
                    htmlFor="custom-role-input"
                    className="block text-xs font-medium text-rose-300 mb-1.5"
                  >
                    Enter Custom Job Role
                  </label>
                  <input
                    id="custom-role-input"
                    type="text"
                    value={config.customRole ?? ''}
                    disabled={isGenerating}
                    onChange={(e) => {
                      setConfig((prev) => ({
                        ...prev,
                        customRole: e.target.value,
                      }));
                      setValidationError(null);
                    }}
                    placeholder="e.g., Machine Learning Engineer, DevOps Engineer, Product Manager"
                    className="w-full rounded-xl border border-white/25 bg-black/90 px-4 py-3 text-sm text-white placeholder:text-neutral-500 focus:border-[#be123c] focus:outline-none focus:ring-2 focus:ring-[#9f1239]/40"
                  />
                </div>
              )}
            </fieldset>

            {/* 2. Experience Level & 3. Difficulty */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <fieldset className="space-y-2.5">
                <legend className="text-sm font-semibold text-white">
                  2. Experience Level
                </legend>
                <div className="grid grid-cols-2 gap-2.5">
                  {EXPERIENCE_LEVELS.map((level) => {
                    const active = config.experienceLevel === level;
                    return (
                      <button
                        key={level}
                        type="button"
                        disabled={isGenerating}
                        onClick={() =>
                          setConfig((prev) => ({
                            ...prev,
                            experienceLevel: level,
                          }))
                        }
                        className={`rounded-xl border px-4 py-3 text-sm font-medium transition-all ${
                          active
                            ? 'border-[#be123c] bg-[#800020]/45 text-white'
                            : 'border-white/12 bg-black/65 text-neutral-300 hover:border-[#be123c]/60'
                        }`}
                      >
                        {level}
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              <fieldset className="space-y-2.5">
                <legend className="text-sm font-semibold text-white">
                  3. Interview Difficulty
                </legend>
                <div className="grid grid-cols-3 gap-2.5">
                  {DIFFICULTIES.map((diff) => {
                    const active = config.difficulty === diff;
                    return (
                      <button
                        key={diff}
                        type="button"
                        disabled={isGenerating}
                        onClick={() =>
                          setConfig((prev) => ({ ...prev, difficulty: diff }))
                        }
                        className={`rounded-xl border px-3 py-3 text-sm font-medium transition-all ${
                          active
                            ? 'border-[#be123c] bg-[#800020]/45 text-white'
                            : 'border-white/12 bg-black/65 text-neutral-300 hover:border-[#be123c]/60'
                        }`}
                      >
                        {diff}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            </div>

            {/* 4. Interview Type */}
            <fieldset className="space-y-2.5">
              <legend className="text-sm font-semibold text-white">
                4. Interview Type
              </legend>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {INTERVIEW_TYPES.map((item) => {
                  const active = config.interviewType === item.type;
                  return (
                    <button
                      key={item.type}
                      type="button"
                      disabled={isGenerating}
                      onClick={() =>
                        setConfig((prev) => ({
                          ...prev,
                          interviewType: item.type,
                        }))
                      }
                      className={`rounded-xl border p-4 text-left transition-all ${
                        active
                          ? 'border-[#be123c] bg-[#800020]/45 text-white'
                          : 'border-white/12 bg-black/65 text-neutral-300 hover:border-[#be123c]/60'
                      }`}
                    >
                      <div className="text-sm font-semibold">{item.type}</div>
                      <div className="mt-1 text-xs text-neutral-400">
                        {item.note}
                      </div>
                    </button>
                  );
                })}
              </div>
            </fieldset>

            {(validationError || serverError) && (
              <div
                role="alert"
                className="rounded-xl border border-rose-400/50 bg-[#4c0519]/75 px-4 py-3 text-sm text-rose-100"
              >
                {validationError || serverError}
              </div>
            )}

            <div className="pt-2">
              <button
                type="submit"
                disabled={isGenerating}
                className="holo-cta inline-flex w-full items-center justify-center gap-2.5 rounded-xl px-6 py-4 text-sm font-bold tracking-wider text-white transition-all disabled:opacity-70"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                    <span>GENERATING 5 INTERVIEW QUESTIONS...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-5 w-5" aria-hidden="true" />
                    <span>GENERATE INTERVIEW</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Right Live Orb Preview & Summary */}
          <aside className="lg:col-span-4 holo-panel rounded-2xl p-6 space-y-5">
            <div className="text-xs font-medium text-rose-300">
              AI Interviewer Calibration
            </div>
            <div className="h-[240px] w-full overflow-hidden">
              <HolographicOrbCanvas
                orbState={isGenerating ? 'generating' : 'idle'}
                compact={true}
              />
            </div>
            <div className="space-y-2.5 border-t border-white/10 pt-4 text-xs">
              <div className="flex justify-between">
                <span className="text-neutral-400">Role</span>
                <span className="font-medium text-white">
                  {config.jobRole === 'Custom Job Role'
                    ? config.customRole?.trim() || 'Custom Role'
                    : config.jobRole}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Experience</span>
                <span className="font-medium text-white">
                  {config.experienceLevel}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Difficulty</span>
                <span className="font-medium text-white">
                  {config.difficulty}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Format</span>
                <span className="font-medium text-rose-300">
                  {config.interviewType} (5 Qs)
                </span>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
