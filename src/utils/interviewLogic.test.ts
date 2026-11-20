import test from 'node:test';
import assert from 'node:assert/strict';
import {
  aggregateDashboardStats,
  clampScore,
  computeSessionNumericMetrics,
  formatReportMarkdown,
  getQuestionDistribution,
  normalizeGeneratedQuestions,
  resolveEffectiveRole,
  SEED_SESSIONS,
  validateAnswerText,
  validateSetupConfig,
} from './interviewLogic';
import type { QuestionAttempt } from '../types/interview';

test('getQuestionDistribution enforces 3 Technical + 2 HR for Mixed interviews', () => {
  const mixed = getQuestionDistribution('Mixed');
  assert.equal(mixed.length, 5);
  assert.equal(mixed.filter((c) => c === 'Technical').length, 3);
  assert.equal(mixed.filter((c) => c === 'HR').length, 2);

  const tech = getQuestionDistribution('Technical');
  assert.equal(tech.length, 5);
  assert.ok(tech.every((c) => c === 'Technical'));

  const hr = getQuestionDistribution('HR');
  assert.equal(hr.length, 5);
  assert.ok(hr.every((c) => c === 'HR'));
});

test('validateSetupConfig validates custom job role properly', () => {
  assert.equal(
    validateSetupConfig({
      jobRole: 'Python Developer',
      experienceLevel: 'Fresher',
      difficulty: 'Medium',
      interviewType: 'Mixed',
    }).valid,
    true,
  );

  const missingCustom = validateSetupConfig({
    jobRole: 'Custom Job Role',
    customRole: '   ',
    experienceLevel: 'Experienced',
    difficulty: 'Hard',
    interviewType: 'Technical',
  });
  assert.equal(missingCustom.valid, false);
  assert.ok(missingCustom.error?.includes('custom job role'));

  assert.equal(
    resolveEffectiveRole({
      jobRole: 'Custom Job Role',
      customRole: '  MLOps Engineer  ',
      experienceLevel: 'Experienced',
      difficulty: 'Hard',
      interviewType: 'Mixed',
    }),
    'MLOps Engineer',
  );
});

test('validateAnswerText rejects empty or overly short answers', () => {
  assert.equal(validateAnswerText('').valid, false);
  assert.equal(validateAnswerText('short').valid, false);
  assert.equal(
    validateAnswerText('I would use an index on the foreign key column.').valid,
    true,
  );
});

test('normalizeGeneratedQuestions guarantees exactly 5 well-formed questions', () => {
  const normalized = normalizeGeneratedQuestions(
    [
      { text: 'Explain event loop', topic: 'Async' },
      { text: 'Explain REST vs GraphQL', topic: 'APIs' },
    ],
    'Mixed',
    'Hard',
  );
  assert.equal(normalized.length, 5);
  assert.equal(normalized[0].category, 'Technical');
  assert.equal(normalized[3].category, 'HR');
  assert.equal(normalized[4].questionNumber, 5);
  assert.equal(normalized[4].difficulty, 'Hard');
});

test('computeSessionNumericMetrics calculates totals, averages, and highlights accurately', () => {
  const attempts: QuestionAttempt[] = [
    {
      question: {
        id: 1,
        questionNumber: 1,
        category: 'Technical',
        difficulty: 'Medium',
        topic: 'Algorithms',
        text: 'Q1',
      },
      userAnswer: 'A1',
      submittedAt: '2026-11-20T00:00:00Z',
      evaluation: {
        score: 9,
        communicationScore: 8,
        confidenceScore: 9,
        whatWasGood: ['Great complexity analysis'],
        whatWasMissing: [],
        areasToImprove: [],
        sampleBetterAnswer: 'Better A1',
        interviewerFeedback: 'Strong',
      },
    },
    {
      question: {
        id: 2,
        questionNumber: 2,
        category: 'HR',
        difficulty: 'Medium',
        topic: 'Teamwork',
        text: 'Q2',
      },
      userAnswer: 'A2',
      submittedAt: '2026-11-20T00:01:00Z',
      evaluation: {
        score: 5,
        communicationScore: 6,
        confidenceScore: 5,
        whatWasGood: ['Honest'],
        whatWasMissing: ['Missing STAR result'],
        areasToImprove: ['Add measurable impact'],
        sampleBetterAnswer: 'Better A2',
        interviewerFeedback: 'Needs structure',
      },
    },
  ];

  const metrics = computeSessionNumericMetrics(attempts);
  assert.equal(metrics.totalScore, 14);
  assert.equal(metrics.averageScore, 7);
  assert.equal(metrics.technicalScore, 9);
  assert.equal(metrics.hrScore, 5);
  assert.equal(metrics.communicationScore, 7);
  assert.equal(metrics.confidenceScore, 7);
  assert.equal(metrics.strongestAnswers[0].questionNumber, 1);
  assert.equal(metrics.weakestAnswers[0].questionNumber, 2);
});

test('clampScore bounds values between 0 and 10', () => {
  assert.equal(clampScore(14), 10);
  assert.equal(clampScore(-3), 0);
  assert.equal(clampScore(7.46), 7.5);
});

test('aggregateDashboardStats & formatReportMarkdown produce consistent output', () => {
  const agg = aggregateDashboardStats(SEED_SESSIONS);
  assert.equal(agg.totalSessions, 2);
  assert.equal(agg.overallScore, 8);
  assert.equal(agg.progressSeries.length, 2);
  assert.ok(agg.recommendations.length > 0);

  const md = formatReportMarkdown(SEED_SESSIONS[0]);
  assert.ok(md.includes('Python Developer'));
  assert.ok(md.includes('38.5 / 50'));
});
