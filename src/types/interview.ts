export const PRESET_JOB_ROLES = [
  'Python Developer',
  'Web Developer',
  'Data Analyst',
  'Java Developer',
  'UI/UX Designer',
  'Frontend Developer',
  'Backend Developer',
] as const;

export type PresetJobRole = (typeof PRESET_JOB_ROLES)[number];

export type ExperienceLevel = 'Fresher' | 'Experienced';
export type DifficultyLevel = 'Easy' | 'Medium' | 'Hard';
export type InterviewType = 'Technical' | 'HR' | 'Mixed';
export type QuestionCategory = 'Technical' | 'HR';

export type OrbState =
  | 'idle'
  | 'generating'
  | 'listening'
  | 'evaluating'
  | 'feedback';

export type AppView =
  | 'landing'
  | 'dashboard'
  | 'setup'
  | 'session'
  | 'report';

export interface InterviewConfig {
  jobRole: string;
  customRole?: string;
  experienceLevel: ExperienceLevel;
  difficulty: DifficultyLevel;
  interviewType: InterviewType;
  focusAreas?: string[];
}

export interface InterviewQuestion {
  id: number;
  questionNumber: number;
  category: QuestionCategory;
  difficulty: DifficultyLevel;
  topic: string;
  text: string;
}

export interface AnswerEvaluation {
  score: number; // 0 to 10
  communicationScore: number; // 0 to 10
  confidenceScore: number; // 0 to 10
  whatWasGood: string[];
  whatWasMissing: string[];
  areasToImprove: string[];
  sampleBetterAnswer: string;
  interviewerFeedback: string;
}

export interface QuestionAttempt {
  question: InterviewQuestion;
  userAnswer: string;
  evaluation: AnswerEvaluation;
  submittedAt: string;
}

export interface ReportHighlight {
  questionNumber: number;
  category: QuestionCategory;
  score: number;
  summary: string;
}

export interface InterviewReport {
  totalScore: number; // out of 50
  averageScore: number; // out of 10
  technicalScore: number; // 0-10 or null if no technical questions
  hrScore: number; // 0-10 or null if no HR questions
  communicationScore: number; // 0-10
  confidenceScore: number; // 0-10
  overallSummary: string;
  strongestAnswers: ReportHighlight[];
  weakestAnswers: ReportHighlight[];
  skillsNeedingImprovement: string[];
  preparationRecommendations: string[];
}

export interface InterviewSessionRecord {
  id: string;
  createdAt: string;
  config: InterviewConfig;
  attempts: QuestionAttempt[];
  report: InterviewReport;
  isSeeded?: boolean;
}

export interface DashboardAggregates {
  totalSessions: number;
  overallScore: number; // out of 100 percentage or out of 10
  overallPercentage: number;
  technicalScore: number; // out of 100
  communicationScore: number; // out of 100
  confidenceScore: number; // out of 100
  progressSeries: {
    label: string;
    role: string;
    scoreOutOf10: number;
    dateLabel: string;
  }[];
  recommendations: string[];
}
