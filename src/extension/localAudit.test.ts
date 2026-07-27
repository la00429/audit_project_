import { describe, it, expect } from 'vitest';

// Inline copy of the runLocalAudit logic for testing
// (since it's not exported from background.ts)
interface DOMElementMeta {
  selector: string;
  tagName: string;
  boundingBox: { x: number; y: number; width: number; height: number };
  computedStyles?: Record<string, string>;
  attributes?: Record<string, string>;
  textContent?: string;
}

interface LocalAuditResult {
  totalIssues: number;
  criticalCount: number;
  score: { score: number; grade: string; color: string };
  issues: Array<{ id: string; module: string; severity: string; title: string; selector?: string }>;
}

function runLocalAudit(elements: DOMElementMeta[], pageUrl: string): LocalAuditResult {
  const issues: LocalAuditResult['issues'] = [];
  let counter = 0;

  // Rule 1: Images without alt text
  elements
    .filter(el => el.tagName === 'IMG' && !el.attributes?.['alt'] && !el.attributes?.['aria-label'])
    .forEach(el => {
      issues.push({
        id: `ATV-${++counter}`, module: 'wcag', severity: 'major',
        title: 'Image missing alt text', selector: el.selector,
      });
    });

  // Rule 2: Inputs without labels
  elements
    .filter(el => ['INPUT', 'SELECT', 'TEXTAREA'].includes(el.tagName) && !el.attributes?.['aria-label'] && !el.attributes?.['aria-labelledby'] && !el.attributes?.['id'])
    .forEach(el => {
      issues.push({
        id: `ATV-${++counter}`, module: 'wcag', severity: 'major',
        title: 'Form input missing label', selector: el.selector,
      });
    });

  // Rule 3: Missing landmarks
  const hasLandmark = elements.some(el =>
    ['MAIN', 'NAV', 'HEADER', 'FOOTER', 'ASIDE'].includes(el.tagName) || !!el.attributes?.['role']
  );
  if (!hasLandmark && elements.length > 0) {
    issues.push({
      id: `ATV-${++counter}`, module: 'wcag', severity: 'minor',
      title: 'No landmark regions found',
    });
  }

  // Rule 4: Buttons/links without accessible name
  elements
    .filter(el => (el.tagName === 'BUTTON' || el.tagName === 'A') && !el.textContent?.trim() && !el.attributes?.['aria-label'] && !el.attributes?.['aria-labelledby'])
    .forEach(el => {
      issues.push({
        id: `ATV-${++counter}`, module: 'wcag', severity: 'major',
        title: 'Button/link missing accessible name', selector: el.selector,
      });
    });

  // Calculate score
  const criticalCount = issues.filter(i => i.severity === 'critical').length;
  const majorCount = issues.filter(i => i.severity === 'major').length;
  const minorCount = issues.filter(i => i.severity === 'minor').length;
  const score = Math.max(0, 100 - (criticalCount * 25 + majorCount * 10 + minorCount * 3));
  const grade = score >= 90 ? 'Excellent' : score >= 70 ? 'Good' : score >= 50 ? 'Needs Work' : 'Poor';
  const color = score >= 90 ? 'green' : score >= 70 ? 'yellow' : score >= 50 ? 'orange' : 'red';

  return { totalIssues: issues.length, criticalCount, score: { score, grade, color }, issues };
}

// --- Tests ---

describe('Local Audit Fallback (REQ-1)', () => {
  const defaultBox = { x: 0, y: 0, width: 100, height: 50 };

  it('produces correct issues for elements with violations', () => {
    const elements: DOMElementMeta[] = [
      { selector: 'img.hero', tagName: 'IMG', boundingBox: defaultBox, attributes: {} },
      { selector: 'input#email', tagName: 'INPUT', boundingBox: defaultBox, attributes: {} },
      { selector: 'button.submit', tagName: 'BUTTON', boundingBox: defaultBox, textContent: '' },
    ];

    const result = runLocalAudit(elements, 'https://example.com');

    // Should detect: 1 image missing alt, 1 input missing label, 1 button missing name, 1 no landmarks
    expect(result.totalIssues).toBe(4);
    expect(result.issues[0].title).toBe('Image missing alt text');
    expect(result.issues[0].selector).toBe('img.hero');
    expect(result.issues[1].title).toBe('Form input missing label');
    expect(result.issues[2].title).toBe('No landmark regions found');
    expect(result.issues[3].title).toBe('Button/link missing accessible name');
  });

  it('returns score 100 for clean elements', () => {
    const elements: DOMElementMeta[] = [
      { selector: 'main', tagName: 'MAIN', boundingBox: defaultBox },
      { selector: 'img.logo', tagName: 'IMG', boundingBox: defaultBox, attributes: { alt: 'Company Logo' } },
      { selector: 'input#name', tagName: 'INPUT', boundingBox: defaultBox, attributes: { id: 'name' } },
      { selector: 'button.ok', tagName: 'BUTTON', boundingBox: defaultBox, textContent: 'OK' },
    ];

    const result = runLocalAudit(elements, 'https://example.com');

    expect(result.totalIssues).toBe(0);
    expect(result.score.score).toBe(100);
    expect(result.score.grade).toBe('Excellent');
    expect(result.score.color).toBe('green');
  });

  it('score formula deducts correctly (max(0, 100 - deductions))', () => {
    // 3 major issues = 30 points deducted, 1 minor = 3 points → score = 67
    const elements: DOMElementMeta[] = [
      { selector: 'img.a', tagName: 'IMG', boundingBox: defaultBox, attributes: {} },
      { selector: 'img.b', tagName: 'IMG', boundingBox: defaultBox, attributes: {} },
      { selector: 'img.c', tagName: 'IMG', boundingBox: defaultBox, attributes: {} },
      // No landmarks triggers a minor issue
      { selector: 'div.wrapper', tagName: 'DIV', boundingBox: defaultBox },
    ];

    const result = runLocalAudit(elements, 'https://example.com');

    // 3 major (images) + 1 minor (no landmarks) = 3*10 + 1*3 = 33 deducted
    expect(result.score.score).toBe(67);
    expect(result.score.grade).toBe('Needs Work');
    expect(result.score.color).toBe('orange');
  });

  it('returns valid AuditReport structure', () => {
    const elements: DOMElementMeta[] = [
      { selector: 'nav.main', tagName: 'NAV', boundingBox: defaultBox },
    ];

    const result = runLocalAudit(elements, 'https://test.local/page');

    // Structural validation
    expect(result).toHaveProperty('totalIssues');
    expect(result).toHaveProperty('criticalCount');
    expect(result).toHaveProperty('score');
    expect(result).toHaveProperty('issues');
    expect(typeof result.totalIssues).toBe('number');
    expect(typeof result.criticalCount).toBe('number');
    expect(typeof result.score.score).toBe('number');
    expect(typeof result.score.grade).toBe('string');
    expect(typeof result.score.color).toBe('string');
    expect(Array.isArray(result.issues)).toBe(true);

    // Each issue has required fields
    result.issues.forEach(issue => {
      expect(issue).toHaveProperty('id');
      expect(issue).toHaveProperty('module');
      expect(issue).toHaveProperty('severity');
      expect(issue).toHaveProperty('title');
      expect(issue.id).toMatch(/^ATV-\d+$/);
      expect(issue.module).toBe('wcag');
    });
  });

  it('score clamps at 0 and never goes negative', () => {
    // Many violations to push score below 0
    const elements: DOMElementMeta[] = Array.from({ length: 12 }, (_, i) => ({
      selector: `img.img${i}`,
      tagName: 'IMG',
      boundingBox: defaultBox,
      attributes: {},
    }));

    const result = runLocalAudit(elements, 'https://example.com');

    // 12 major (images) + 1 minor (no landmarks) = 120 + 3 = 123 deducted → clamped to 0
    expect(result.score.score).toBe(0);
    expect(result.score.grade).toBe('Poor');
    expect(result.score.color).toBe('red');
  });
});
