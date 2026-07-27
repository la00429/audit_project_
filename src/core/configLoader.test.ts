/**
 * Unit tests for configLoader (REQ-11).
 *
 * Validates that loadConfig() correctly parses config files, returns
 * defaults on missing/malformed files, and that getDisabledRules()
 * correctly identifies disabled WCAG rules.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadConfig, getDisabledRules, AuditConfig } from './configLoader.js';

vi.mock('fs', () => ({
  readFileSync: vi.fn(),
}));

import { readFileSync } from 'fs';

const mockedReadFileSync = vi.mocked(readFileSync);

const VALID_CONFIG_JSON = JSON.stringify({
  version: '2.0.0',
  description: 'Test config',
  wcag: {
    level: 'AAA',
    rules: {
      'color-contrast': { enabled: true, level: 'AAA', threshold: 7.0 },
      'missing-alt': { enabled: false, level: 'A' },
      'missing-label': { enabled: true, level: 'A' },
      'heading-order': { enabled: false, level: 'A' },
      'missing-landmark': { enabled: true, level: 'A' },
    },
  },
  visual: {
    enabled: false,
    checks: {
      'overlap-detection': false,
      'alignment-check': true,
      'overflow-detection': true,
      'broken-images': false,
      'viewport-bounds': true,
    },
    viewport: { width: 1920, height: 1080 },
  },
  autoFix: {
    enabled: false,
    maxConfidence: 0.9,
    allowHtmlChanges: true,
    allowCssChanges: false,
    allowAttributeChanges: true,
  },
  gates: {
    prePush: {
      enabled: false,
      maxCritical: 2,
      maxMajor: 10,
      blockOnFailure: false,
    },
    preMerge: {
      enabled: true,
      maxCritical: 0,
      maxMajor: 3,
    },
  },
  reporting: {
    format: 'html',
    outputDir: './reports',
    includeScreenshots: false,
    githubIssueTemplate: false,
  },
});

describe('configLoader (REQ-11)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('loadConfig()', () => {
    it('with valid config file returns parsed config', () => {
      mockedReadFileSync.mockReturnValue(VALID_CONFIG_JSON);

      const config = loadConfig('/path/to/config.json');

      expect(config.version).toBe('2.0.0');
      expect(config.wcag.level).toBe('AAA');
      expect(config.wcag.rules['color-contrast'].threshold).toBe(7.0);
      expect(config.visual.enabled).toBe(false);
      expect(config.visual.viewport.width).toBe(1920);
      expect(config.autoFix.maxConfidence).toBe(0.9);
      expect(config.gates.prePush.enabled).toBe(false);
      expect(config.gates.preMerge.enabled).toBe(true);
      expect(config.reporting.format).toBe('html');
    });

    it('with missing file returns defaults', () => {
      const enoentError = new Error('File not found') as NodeJS.ErrnoException;
      enoentError.code = 'ENOENT';
      mockedReadFileSync.mockImplementation(() => {
        throw enoentError;
      });

      const config = loadConfig('/nonexistent/path.json');

      expect(config.version).toBe('1.0.0');
      expect(config.wcag.level).toBe('AA');
      expect(config.wcag.rules['color-contrast'].enabled).toBe(true);
      expect(config.wcag.rules['color-contrast'].threshold).toBe(4.5);
      expect(config.visual.enabled).toBe(true);
      expect(config.visual.viewport.width).toBe(1280);
      expect(config.autoFix.enabled).toBe(true);
      expect(config.gates.prePush.enabled).toBe(true);
      expect(config.reporting.format).toBe('json');
    });

    it('with malformed JSON returns defaults and logs warning', () => {
      mockedReadFileSync.mockReturnValue('{bad json');
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const config = loadConfig('/path/to/broken.json');

      expect(config.version).toBe('1.0.0');
      expect(config.wcag.level).toBe('AA');
      expect(config.visual.enabled).toBe(true);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Could not parse config')
      );

      warnSpy.mockRestore();
    });
  });

  describe('getDisabledRules()', () => {
    it('returns empty array when all rules enabled', () => {
      mockedReadFileSync.mockReturnValue(
        JSON.stringify({
          version: '1.0.0',
          wcag: {
            level: 'AA',
            rules: {
              'color-contrast': { enabled: true, level: 'AA', threshold: 4.5 },
              'missing-alt': { enabled: true, level: 'A' },
              'missing-label': { enabled: true, level: 'A' },
            },
          },
        })
      );

      const config = loadConfig('/path/to/config.json');
      const disabled = getDisabledRules(config);

      expect(disabled).toEqual([]);
    });

    it('returns correct IDs when some rules disabled', () => {
      mockedReadFileSync.mockReturnValue(VALID_CONFIG_JSON);

      const config = loadConfig('/path/to/config.json');
      const disabled = getDisabledRules(config);

      expect(disabled).toContain('missing-alt');
      expect(disabled).toContain('heading-order');
      expect(disabled).toHaveLength(2);
    });
  });

  describe('deep-merge with defaults', () => {
    it('partial config is deep-merged with defaults (missing fields filled in)', () => {
      const partialConfig = JSON.stringify({
        version: '1.5.0',
        wcag: {
          level: 'A',
        },
      });
      mockedReadFileSync.mockReturnValue(partialConfig);

      const config = loadConfig('/path/to/partial.json');

      // Provided fields are preserved
      expect(config.version).toBe('1.5.0');
      expect(config.wcag.level).toBe('A');

      // Missing wcag.rules filled with defaults
      expect(config.wcag.rules['color-contrast'].enabled).toBe(true);
      expect(config.wcag.rules['color-contrast'].threshold).toBe(4.5);
      expect(config.wcag.rules['missing-alt'].enabled).toBe(true);

      // Missing top-level sections filled with defaults
      expect(config.visual.enabled).toBe(true);
      expect(config.visual.viewport.width).toBe(1280);
      expect(config.visual.viewport.height).toBe(720);
      expect(config.autoFix.enabled).toBe(true);
      expect(config.autoFix.maxConfidence).toBe(0.8);
      expect(config.gates.prePush.maxCritical).toBe(0);
      expect(config.gates.prePush.maxMajor).toBe(5);
      expect(config.reporting.format).toBe('json');
      expect(config.reporting.outputDir).toBe('./audit-reports');
    });
  });
});
