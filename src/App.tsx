import { useEffect, useState } from 'react';
import { TopNav } from './components/TopNav';
import { Background3DCanvas } from './components/Background3DCanvas';
import { LandingPage } from './components/LandingPage';
import { DashboardView } from './components/DashboardView';
import { InterviewSetupView } from './components/InterviewSetupView';
import { InterviewSessionView } from './components/InterviewSessionView';
import { FinalReportView } from './components/FinalReportView';
import {
  computeSessionNumericMetrics,
  SEED_SESSIONS,
} from './utils/interviewLogic';
import type {
  AnswerEvaluation,
  AppView,
  InterviewConfig,
  InterviewQuestion,
  InterviewReport,
  InterviewSessionRecord,
  QuestionAttempt,
} from './types/interview';

const STORAGE_KEY = 'aetherprep_sessions_v1';

const DEFAULT_CONFIG: InterviewConfig = {
  jobRole: 'Python Developer',
  customRole: '',
  experienceLevel: 'Fresher',
  difficulty: 'Medium',
  interviewType: 'Mixed',
};

function loadInitialSessions(): InterviewSessionRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return SEED_SESSIONS;
    const parsed = JSON.parse(raw) as InterviewSessionRecord[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : SEED_SESSIONS;
  } catch {
    return SEED_SESSIONS;
  }
}

export default function App() {
  const [currentView, setCurrentView] = useState<AppView>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('autostart') === '1') {
        return 'dashboard';
      }
    }
    return 'landing';
  });

  const [sessions, setSessions] = useState<InterviewSessionRecord[]>(
    loadInitialSessions,
  );
  const [setupConfig, setSetupConfig] =
    useState<InterviewConfig>(DEFAULT_CONFIG);

  // Active interview state
  const [activeSessionId, setActiveSessionId] = useState<string>('');
  const [activeConfig, setActiveConfig] =
    useState<InterviewConfig>(DEFAULT_CONFIG);
  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [attempts, setAttempts] = useState<QuestionAttempt[]>([]);

  // Active report state
  const [activeReportSession, setActiveReportSession] =
    useState<InterviewSessionRecord | null>(null);

  // Async loading & error states
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isFinalizingReport, setIsFinalizingReport] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    } catch {
      // Ignore storage quota errors
    }
  }, [sessions]);

  const handleNavigate = (view: AppView, anchorId?: string) => {
    setApiError(null);
    setCurrentView(view);
    if (anchorId) {
      window.setTimeout(() => {
        document
          .getElementById(anchorId)
          ?.scrollIntoView({ behavior: 'smooth' });
      }, 60);
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleStartSetup = (focusAreas?: string[]) => {
    setSetupConfig((prev) => ({
      ...prev,
      focusAreas: focusAreas && focusAreas.length > 0 ? focusAreas : undefined,
    }));
    handleNavigate('setup');
  };

  const handleRoleShortcut = (role: string) => {
    setSetupConfig((prev) => ({
      ...prev,
      jobRole: role,
      focusAreas: undefined,
    }));
    handleNavigate('setup');
  };

  const handleGenerateInterview = async (config: InterviewConfig) => {
    setIsGenerating(true);
    setApiError(null);
    try {
      const res = await fetch('/api/interview/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config }),
      });
      const data = (await res.json()) as {
        sessionId?: string;
        questions?: InterviewQuestion[];
        error?: string;
      };
      if (!res.ok || !data.questions) {
        throw new Error(data.error || 'Failed to generate interview questions.');
      }
      setActiveSessionId(data.sessionId ?? `sess_${Date.now()}`);
      setActiveConfig(config);
      setSetupConfig(config);
      setQuestions(data.questions);
      setAttempts([]);
      setCurrentIndex(0);
      setCurrentView('session');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setApiError(
        err instanceof Error
          ? err.message
          : 'Unable to generate interview questions.',
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmitAnswer = async (userAnswer: string) => {
    const question = questions[currentIndex];
    if (!question) return;
    setIsEvaluating(true);
    setApiError(null);
    try {
      const res = await fetch('/api/interview/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: activeSessionId,
          config: activeConfig,
          question,
          userAnswer,
          priorAttempts: attempts,
        }),
      });
      const data = (await res.json()) as {
        evaluation?: AnswerEvaluation;
        error?: string;
      };
      if (!res.ok || !data.evaluation) {
        throw new Error(data.error || 'Failed to evaluate your answer.');
      }

      const newAttempt: QuestionAttempt = {
        question,
        userAnswer,
        evaluation: data.evaluation,
        submittedAt: new Date().toISOString(),
      };

      setAttempts((prev) => {
        const filtered = prev.filter(
          (a) => a.question.questionNumber !== question.questionNumber,
        );
        return [...filtered, newAttempt].sort(
          (a, b) => a.question.questionNumber - b.question.questionNumber,
        );
      });
    } catch (err) {
      setApiError(
        err instanceof Error ? err.message : 'Error evaluating answer.',
      );
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleNextQuestion = () => {
    setApiError(null);
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleFinishReport = async () => {
    setIsFinalizingReport(true);
    setApiError(null);
    try {
      const res = await fetch('/api/interview/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: activeSessionId,
          config: activeConfig,
          attempts,
        }),
      });
      const data = (await res.json()) as {
        report?: InterviewReport;
        error?: string;
      };
      if (!res.ok || !data.report) {
        // Construct deterministic numeric fallback only if report synthesis failed, or propagate error?
        // Actually let's propagate error cleanly unless numeric fallback is strictly needed—Wait: Gemini skill says propagate errors cleanly. Let's throw!
        throw new Error(data.error || 'Failed to generate final report.');
      }

      const completedRecord: InterviewSessionRecord = {
        id: activeSessionId || `sess_${Date.now()}`,
        createdAt: new Date().toISOString(),
        config: activeConfig,
        attempts,
        report: data.report,
        isSeeded: false,
      };

      setSessions((prev) => [completedRecord, ...prev]);
      setActiveReportSession(completedRecord);
      setCurrentView('report');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      // Keep numeric accuracy note if user retries
      const message =
        err instanceof Error ? err.message : 'Unable to finalize report.';
      // Ensure numeric metrics remain valid if needed on retry
      void computeSessionNumericMetrics;
      setApiError(message);
    } finally {
      setIsFinalizingReport(false);
    }
  };

  const handleDeleteSession = (sessionId: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== sessionId));
  };

  return (
    <div
      className="relative min-h-screen bg-[#070608] text-white"
      data-app-view={currentView}
    >
      <Background3DCanvas currentView={currentView} />
      <TopNav currentView={currentView} onNavigate={handleNavigate} />

      <main className="relative z-10">
        {currentView === 'landing' && (
          <LandingPage
            onStartInterview={() => handleStartSetup()}
            onOpenDashboard={() => handleNavigate('dashboard')}
            onSelectRoleShortcut={handleRoleShortcut}
          />
        )}

        {currentView === 'dashboard' && (
          <DashboardView
            sessions={sessions}
            onStartNewInterview={handleStartSetup}
            onViewReport={(session) => {
              setActiveReportSession(session);
              handleNavigate('report');
            }}
            onDeleteSession={handleDeleteSession}
          />
        )}

        {currentView === 'setup' && (
          <InterviewSetupView
            initialConfig={setupConfig}
            isGenerating={isGenerating}
            serverError={apiError}
            onGenerate={handleGenerateInterview}
            onBack={() => handleNavigate('dashboard')}
          />
        )}

        {currentView === 'session' && (
          <InterviewSessionView
            config={activeConfig}
            questions={questions}
            currentIndex={currentIndex}
            attempts={attempts}
            isEvaluating={isEvaluating}
            isFinalizingReport={isFinalizingReport}
            errorMessage={apiError}
            onSubmitAnswer={handleSubmitAnswer}
            onNextQuestion={handleNextQuestion}
            onFinishReport={handleFinishReport}
          />
        )}

        {currentView === 'report' && activeReportSession && (
          <FinalReportView
            session={activeReportSession}
            onRetryInterview={() =>
              handleGenerateInterview(activeReportSession.config)
            }
            onPracticeWeakAreas={(weakAreas) => {
              setSetupConfig({
                ...activeReportSession.config,
                focusAreas: weakAreas,
              });
              handleNavigate('setup');
            }}
            onBackToDashboard={() => handleNavigate('dashboard')}
          />
        )}
      </main>
    </div>
  );
}
