/**
 * Unit tests for the accessibility scoring algorithm.
 * Score formula: max(0, 100 - (critical*25 + major*10 + minor*3))
 */

import { describe, it, expect } from 'vitest';

// --- Inline scoring logic (same as CLI) ---

interface AuditIssue {
  id: string;
  severity: 'critical' | 'major' | 'minor' | 'info';
  title: string;
  description: string;
}

function calculateScore(issues: AuditIssue[]): number {
  const weights = { critical: 25, major: 10, minor: 3, info: 0 };
  const totalDeductions = issues.reduce((sum, issue) => sum + weights[issue.severity], 0);
  return Math.max(0, 100 - totalDeductions);
}

function getScoreLabel(score: number): string {
  if (score >= 90) return 'Excelente';
  if (score >= 70) return 'Bueno';
  if (score >= 50) return 'Necesita trabajo';
  return 'Pobre';
}

// --- Tests ---

describe('Accessibility Score', () => {
  it('returns 100 when no issues found', () => {
    expect(calculateScore([])).toBe(100);
  });

  it('deducts 25 points per critical issue', () => {
    const issues: AuditIssue[] = [
      { id: 'ATV-1', severity: 'critical', title: 'Contraste', description: 'Low contrast' },
    ];
    expect(calculateScore(issues)).toBe(75);
  });

  it('deducts 10 points per major issue', () => {
    const issues: AuditIssue[] = [
      { id: 'ATV-1', severity: 'major', title: 'Alt text', description: 'Missing alt' },
      { id: 'ATV-2', severity: 'major', title: 'Label', description: 'Missing label' },
    ];
    expect(calculateScore(issues)).toBe(80);
  });

  it('deducts 3 points per minor issue', () => {
    const issues: AuditIssue[] = [
      { id: 'ATV-1', severity: 'minor', title: 'Heading', description: 'Skipped heading' },
    ];
    expect(calculateScore(issues)).toBe(97);
  });

  it('never goes below 0', () => {
    const issues: AuditIssue[] = Array.from({ length: 10 }, (_, i) => ({
      id: `ATV-${i}`, severity: 'critical' as const, title: 'Issue', description: 'Bad',
    }));
    expect(calculateScore(issues)).toBe(0);
  });

  it('handles mixed severities correctly', () => {
    const issues: AuditIssue[] = [
      { id: 'ATV-1', severity: 'critical', title: 'A', description: 'A' },
      { id: 'ATV-2', severity: 'major', title: 'B', description: 'B' },
      { id: 'ATV-3', severity: 'minor', title: 'C', description: 'C' },
    ];
    // 100 - 25 - 10 - 3 = 62
    expect(calculateScore(issues)).toBe(62);
  });

  it('info issues have no impact on score', () => {
    const issues: AuditIssue[] = [
      { id: 'ATV-1', severity: 'info', title: 'Info', description: 'Just info' },
    ];
    expect(calculateScore(issues)).toBe(100);
  });
});

describe('Score Labels', () => {
  it('returns Excelente for 90-100', () => {
    expect(getScoreLabel(100)).toBe('Excelente');
    expect(getScoreLabel(90)).toBe('Excelente');
  });

  it('returns Bueno for 70-89', () => {
    expect(getScoreLabel(89)).toBe('Bueno');
    expect(getScoreLabel(70)).toBe('Bueno');
  });

  it('returns Necesita trabajo for 50-69', () => {
    expect(getScoreLabel(69)).toBe('Necesita trabajo');
    expect(getScoreLabel(50)).toBe('Necesita trabajo');
  });

  it('returns Pobre for 0-49', () => {
    expect(getScoreLabel(49)).toBe('Pobre');
    expect(getScoreLabel(0)).toBe('Pobre');
  });
});
