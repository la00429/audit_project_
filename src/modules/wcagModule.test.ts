import { describe, it, expect } from 'vitest';
import { WcagModule } from './wcagModule.ts';
import type { DOMElementMeta } from '../core/auditEngine.ts';

/** Helper to create a minimal DOMElementMeta fixture */
function makeElement(overrides: Partial<DOMElementMeta> & { tagName: string }): DOMElementMeta {
  return {
    selector: overrides.selector ?? `${overrides.tagName}#test`,
    tagName: overrides.tagName,
    boundingBox: overrides.boundingBox ?? { x: 0, y: 0, width: 100, height: 50 },
    computedStyles: overrides.computedStyles,
    attributes: overrides.attributes,
    textContent: overrides.textContent,
  };
}

describe('WcagModule', () => {
  describe('missing-alt rule', () => {
    it('detects img without alt attribute', async () => {
      const module = new WcagModule();
      const elements: DOMElementMeta[] = [
        makeElement({ tagName: 'img', selector: 'img.hero' }),
      ];

      const issues = await module.evaluate(elements);

      const altIssues = issues.filter(i => i.wcagCriterion === '1.1.1' && i.title.includes('alt'));
      expect(altIssues).toHaveLength(1);
      expect(altIssues[0].selector).toBe('img.hero');
      expect(altIssues[0].severity).toBe('major');
      expect(altIssues[0].level).toBe('A');
    });

    it('passes img with alt attribute', async () => {
      const module = new WcagModule();
      const elements: DOMElementMeta[] = [
        makeElement({ tagName: 'img', selector: 'img.hero', attributes: { alt: 'A hero image' } }),
      ];

      const issues = await module.evaluate(elements);

      const altIssues = issues.filter(i => i.title.includes('alt'));
      expect(altIssues).toHaveLength(0);
    });
  });

  describe('color-contrast rule', () => {
    it('detects low contrast (white text on light gray background)', async () => {
      const module = new WcagModule();
      const elements: DOMElementMeta[] = [
        makeElement({
          tagName: 'p',
          selector: 'p.light',
          textContent: 'Hello',
          computedStyles: {
            color: 'rgb(255, 255, 255)',
            backgroundColor: 'rgb(200, 200, 200)',
          },
        }),
      ];

      const issues = await module.evaluate(elements);

      const contrastIssues = issues.filter(i => i.wcagCriterion === '1.4.3');
      expect(contrastIssues).toHaveLength(1);
      expect(contrastIssues[0].title).toBe('Insufficient color contrast');
      expect(contrastIssues[0].selector).toBe('p.light');
    });

    it('passes high contrast (black text on white background)', async () => {
      const module = new WcagModule();
      const elements: DOMElementMeta[] = [
        makeElement({
          tagName: 'p',
          selector: 'p.dark',
          textContent: 'Hello',
          computedStyles: {
            color: 'rgb(0, 0, 0)',
            backgroundColor: 'rgb(255, 255, 255)',
          },
        }),
      ];

      const issues = await module.evaluate(elements);

      const contrastIssues = issues.filter(i => i.wcagCriterion === '1.4.3');
      expect(contrastIssues).toHaveLength(0);
    });
  });

  describe('missing-label rule', () => {
    it('detects input without label, aria-label, or id', async () => {
      const module = new WcagModule();
      const elements: DOMElementMeta[] = [
        makeElement({ tagName: 'input', selector: 'input.email' }),
      ];

      const issues = await module.evaluate(elements);

      const labelIssues = issues.filter(i => i.title.includes('label'));
      expect(labelIssues).toHaveLength(1);
      expect(labelIssues[0].selector).toBe('input.email');
      expect(labelIssues[0].wcagCriterion).toBe('1.3.1');
      expect(labelIssues[0].severity).toBe('major');
    });

    it('passes input with aria-label', async () => {
      const module = new WcagModule();
      const elements: DOMElementMeta[] = [
        makeElement({ tagName: 'input', selector: 'input.email', attributes: { 'aria-label': 'Email address' } }),
      ];

      const issues = await module.evaluate(elements);

      const labelIssues = issues.filter(i => i.title.includes('label'));
      expect(labelIssues).toHaveLength(0);
    });
  });

  describe('heading-order rule', () => {
    it('detects h1 to h3 skip (missing h2)', async () => {
      const module = new WcagModule();
      const elements: DOMElementMeta[] = [
        makeElement({ tagName: 'h1', selector: 'h1.title', boundingBox: { x: 0, y: 0, width: 200, height: 40 } }),
        makeElement({ tagName: 'h3', selector: 'h3.sub', boundingBox: { x: 0, y: 100, width: 200, height: 30 } }),
      ];

      const issues = await module.evaluate(elements);

      const headingIssues = issues.filter(i => i.title.includes('heading'));
      expect(headingIssues).toHaveLength(1);
      expect(headingIssues[0].selector).toBe('h3.sub');
      expect(headingIssues[0].severity).toBe('minor');
    });

    it('passes h1 to h2 to h3 sequence', async () => {
      const module = new WcagModule();
      const elements: DOMElementMeta[] = [
        makeElement({ tagName: 'h1', selector: 'h1.title', boundingBox: { x: 0, y: 0, width: 200, height: 40 } }),
        makeElement({ tagName: 'h2', selector: 'h2.sub', boundingBox: { x: 0, y: 100, width: 200, height: 35 } }),
        makeElement({ tagName: 'h3', selector: 'h3.detail', boundingBox: { x: 0, y: 200, width: 200, height: 30 } }),
      ];

      const issues = await module.evaluate(elements);

      const headingIssues = issues.filter(i => i.title.includes('heading'));
      expect(headingIssues).toHaveLength(0);
    });
  });

  describe('missing-landmark rule', () => {
    it('detects pages with no main/nav/header landmarks', async () => {
      const module = new WcagModule();
      const elements: DOMElementMeta[] = [
        makeElement({ tagName: 'div', selector: 'div.container' }),
        makeElement({ tagName: 'p', selector: 'p.text', textContent: 'Hello world' }),
      ];

      const issues = await module.evaluate(elements);

      const landmarkIssues = issues.filter(i => i.title.includes('landmark'));
      expect(landmarkIssues).toHaveLength(1);
      expect(landmarkIssues[0].severity).toBe('minor');
    });

    it('passes when main element is present', async () => {
      const module = new WcagModule();
      const elements: DOMElementMeta[] = [
        makeElement({ tagName: 'main', selector: 'main' }),
        makeElement({ tagName: 'p', selector: 'p.text', textContent: 'Content' }),
      ];

      const issues = await module.evaluate(elements);

      const landmarkIssues = issues.filter(i => i.title.includes('landmark'));
      expect(landmarkIssues).toHaveLength(0);
    });
  });

  describe('accessible-name rule', () => {
    it('detects button without text or aria-label', async () => {
      const module = new WcagModule();
      const elements: DOMElementMeta[] = [
        makeElement({ tagName: 'button', selector: 'button.icon-btn', textContent: '', attributes: {} }),
      ];

      const issues = await module.evaluate(elements);

      const nameIssues = issues.filter(i => i.title.includes('accessible name'));
      expect(nameIssues).toHaveLength(1);
      expect(nameIssues[0].selector).toBe('button.icon-btn');
      expect(nameIssues[0].severity).toBe('major');
    });

    it('passes button with text content', async () => {
      const module = new WcagModule();
      const elements: DOMElementMeta[] = [
        makeElement({ tagName: 'button', selector: 'button.submit', textContent: 'Submit' }),
      ];

      const issues = await module.evaluate(elements);

      const nameIssues = issues.filter(i => i.title.includes('accessible name'));
      expect(nameIssues).toHaveLength(0);
    });

    it('passes link with aria-label', async () => {
      const module = new WcagModule();
      const elements: DOMElementMeta[] = [
        makeElement({ tagName: 'a', selector: 'a.nav-link', attributes: { 'aria-label': 'Go to homepage' } }),
      ];

      const issues = await module.evaluate(elements);

      const nameIssues = issues.filter(i => i.title.includes('accessible name'));
      expect(nameIssues).toHaveLength(0);
    });

    it('passes link with text content', async () => {
      const module = new WcagModule();
      const elements: DOMElementMeta[] = [
        makeElement({ tagName: 'a', selector: 'a.home-link', textContent: 'Home' }),
      ];

      const issues = await module.evaluate(elements);

      const nameIssues = issues.filter(i => i.title.includes('accessible name'));
      expect(nameIssues).toHaveLength(0);
    });

    it('reports issue for link without text and no aria-label', async () => {
      const module = new WcagModule();
      const elements: DOMElementMeta[] = [
        makeElement({ tagName: 'a', selector: 'a.social-icon', textContent: '', attributes: {} }),
      ];

      const issues = await module.evaluate(elements);

      const nameIssues = issues.filter(i => i.title.includes('accessible name'));
      expect(nameIssues).toHaveLength(1);
      expect(nameIssues[0].selector).toBe('a.social-icon');
      expect(nameIssues[0].severity).toBe('major');
      expect(nameIssues[0].wcagCriterion).toBe('1.1.1');
    });

    it('passes button with aria-label but no text', async () => {
      const module = new WcagModule();
      const elements: DOMElementMeta[] = [
        makeElement({ tagName: 'button', selector: 'button.close', textContent: '', attributes: { 'aria-label': 'Close dialog' } }),
      ];

      const issues = await module.evaluate(elements);

      const nameIssues = issues.filter(i => i.title.includes('accessible name'));
      expect(nameIssues).toHaveLength(0);
    });
  });

  describe('disabled rules', () => {
    it('skips missing-alt rule when disabled via constructor', async () => {
      const module = new WcagModule(['missing-alt']);
      const elements: DOMElementMeta[] = [
        makeElement({ tagName: 'img', selector: 'img.no-alt' }),
      ];

      const issues = await module.evaluate(elements);

      const altIssues = issues.filter(i => i.title.includes('alt'));
      expect(altIssues).toHaveLength(0);
    });
  });
});
