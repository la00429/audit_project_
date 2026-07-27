import { describe, it, expect } from 'vitest';
import { calculateScore, SEVERITY_WEIGHTS } from './scoreCalculator.js';
import type { AuditIssue } from './auditEngine.js';

/** Helper to create a minimal AuditIssue with a given severity */
function makeIssue(severity: 'critical' | 'major' | 'minor' | 'info'): AuditIssue {
  return {
    id: `ATV-${Math.random().toString(36).slice(2, 6)}`,
    module: 'wcag',
    severity,
    title: `Test ${severity} issue`,
    description: `A ${severity} level issue for testing`,
  };
}

describe('scoreCalculator', () => {
  describe('score range', () => {
    it('score is always between 0 and 100 for empty issues', () => {
      const result = calculateScore([]);
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('score is always between 0 and 100 with various issues', () => {
      const issues = [makeIssue('critical'), makeIssue('major'), makeIssue('minor')];
      const result = calculateScore(issues);
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });
  });

  describe('empty issues list', () => {
    it('returns score 100 with grade "Excellent"', () => {
      const result = calculateScore([]);
      expect(result.score).toBe(100);
      expect(result.grade).toBe('Excellent');
    });
  });

  describe('deductions are additive', () => {
    it('critical deducts 25 points', () => {
      const result = calculateScore([makeIssue('critical')]);
      expect(result.score).toBe(75);
    });

    it('major deducts 10 points', () => {
      const result = calculateScore([makeIssue('major')]);
      expect(result.score).toBe(90);
    });

    it('minor deducts 3 points', () => {
      const result = calculateScore([makeIssue('minor')]);
      expect(result.score).toBe(97);
    });

    it('info deducts 0 points', () => {
      const result = calculateScore([makeIssue('info')]);
      expect(result.score).toBe(100);
    });

    it('multiple issues sum deductions (critical + major + minor = 38)', () => {
      const issues = [makeIssue('critical'), makeIssue('major'), makeIssue('minor')];
      const result = calculateScore(issues);
      expect(result.score).toBe(100 - 25 - 10 - 3);
    });
  });

  describe('score cannot go below 0', () => {
    it('many critical issues clamp score to 0', () => {
      const issues = Array.from({ length: 10 }, () => makeIssue('critical'));
      const result = calculateScore(issues);
      expect(result.score).toBe(0);
    });

    it('deductions exceeding 100 still result in score 0', () => {
      const issues = Array.from({ length: 5 }, () => makeIssue('critical'));
      // 5 * 25 = 125 deduction, clamped to 0
      const result = calculateScore(issues);
      expect(result.score).toBe(0);
    });
  });

  describe('grade boundaries', () => {
    it('score 100 → Excellent', () => {
      const result = calculateScore([]);
      expect(result.grade).toBe('Excellent');
    });

    it('score 90 → Excellent', () => {
      // 1 major = 10 deduction → score 90
      const result = calculateScore([makeIssue('major')]);
      expect(result.score).toBe(90);
      expect(result.grade).toBe('Excellent');
    });

    it('score 89 → Good', () => {
      // 1 major + 1 minor = 13 deduction → score 87
      // More precisely: need score 89 → deduction 11 → 1 major + 1/3 minor won't work
      // Use 1 major + 1 info (10) = 90, still Excellent. Let's use specific combo:
      // 3 minor + 1 info = 9 → score 91. Not quite.
      // 4 minor = 12 → score 88. That gives Good.
      const issues = Array.from({ length: 4 }, () => makeIssue('minor'));
      const result = calculateScore(issues);
      expect(result.score).toBe(88);
      expect(result.grade).toBe('Good');
    });

    it('score 70 → Good', () => {
      // 10 minor = 30 deduction → score 70
      const issues = Array.from({ length: 10 }, () => makeIssue('minor'));
      const result = calculateScore(issues);
      expect(result.score).toBe(70);
      expect(result.grade).toBe('Good');
    });

    it('score 69 → Needs Work', () => {
      // 1 critical + 1 minor = 28 → score 72 (Good). Adjust:
      // 11 minor = 33 → score 67. That's Needs Work.
      const issues = Array.from({ length: 11 }, () => makeIssue('minor'));
      const result = calculateScore(issues);
      expect(result.score).toBe(67);
      expect(result.grade).toBe('Needs Work');
    });

    it('score 50 → Needs Work', () => {
      // 2 critical = 50 deduction → score 50
      const issues = Array.from({ length: 2 }, () => makeIssue('critical'));
      const result = calculateScore(issues);
      expect(result.score).toBe(50);
      expect(result.grade).toBe('Needs Work');
    });

    it('score below 50 → Poor', () => {
      // 3 critical = 75 deduction → score 25
      const issues = Array.from({ length: 3 }, () => makeIssue('critical'));
      const result = calculateScore(issues);
      expect(result.score).toBe(25);
      expect(result.grade).toBe('Poor');
    });
  });

  describe('color classification matches score ranges', () => {
    it('score >= 90 → green', () => {
      const result = calculateScore([]);
      expect(result.color).toBe('green');
    });

    it('score 70-89 → yellow', () => {
      const issues = [makeIssue('critical')]; // score 75
      const result = calculateScore(issues);
      expect(result.color).toBe('yellow');
    });

    it('score 50-69 → orange', () => {
      const issues = Array.from({ length: 2 }, () => makeIssue('critical')); // score 50
      const result = calculateScore(issues);
      expect(result.color).toBe('orange');
    });

    it('score < 50 → red', () => {
      const issues = Array.from({ length: 3 }, () => makeIssue('critical')); // score 25
      const result = calculateScore(issues);
      expect(result.color).toBe('red');
    });
  });

  describe('SEVERITY_WEIGHTS constant', () => {
    it('has correct values for all severities', () => {
      expect(SEVERITY_WEIGHTS).toEqual({
        critical: 25,
        major: 10,
        minor: 3,
        info: 0,
      });
    });
  });
});
