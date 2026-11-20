import type { AppView } from '../types/interview';

interface TopNavProps {
  currentView: AppView;
  onNavigate: (view: AppView, anchorId?: string) => void;
}

export function TopNav({ currentView, onNavigate }: TopNavProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-white/12 bg-[#070608]/95">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-8 px-4 py-3.5 sm:px-6 lg:px-8">
        {/* Zone 1: Single-line wordmark */}
        <button
          type="button"
          onClick={() => onNavigate('landing')}
          className="font-display text-lg font-bold tracking-tight text-white whitespace-nowrap shrink-0 hover:text-rose-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 rounded"
        >
          AetherPrep AI
        </button>

        {/* Zone 2: Concise single-line navigation links */}
        <nav
          aria-label="Primary navigation"
          className="hidden md:flex items-center gap-7 text-sm font-medium text-neutral-300"
        >
          <button
            type="button"
            onClick={() => onNavigate('landing')}
            className={`whitespace-nowrap shrink-0 transition-colors hover:text-white ${
              currentView === 'landing' ? 'text-rose-300 underline decoration-[#9f1239] underline-offset-4' : ''
            }`}
          >
            Overview
          </button>
          <button
            type="button"
            onClick={() => onNavigate('landing', 'features')}
            className="whitespace-nowrap shrink-0 transition-colors hover:text-white"
          >
            Features
          </button>
          <button
            type="button"
            onClick={() => onNavigate('dashboard')}
            className={`whitespace-nowrap shrink-0 transition-colors hover:text-white ${
              currentView === 'dashboard' ? 'text-rose-300 underline decoration-[#9f1239] underline-offset-4' : ''
            }`}
          >
            Dashboard
          </button>
          <button
            type="button"
            onClick={() => onNavigate('setup')}
            className={`whitespace-nowrap shrink-0 transition-colors hover:text-white ${
              currentView === 'setup' ? 'text-rose-300 underline decoration-[#9f1239] underline-offset-4' : ''
            }`}
          >
            Setup
          </button>
        </nav>

        {/* Zone 3: Single primary action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() =>
              onNavigate(currentView === 'setup' ? 'dashboard' : 'setup')
            }
            className="holo-cta rounded-lg px-4 py-2 text-sm font-semibold text-white transition-all whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
          >
            {currentView === 'setup' ? 'Dashboard' : 'Start Interview'}
          </button>
        </div>
      </div>
    </header>
  );
}
