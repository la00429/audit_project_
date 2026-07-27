/**
 * AuditTest Vision — Configuration Loader
 *
 * Reads and parses the audit-rules.spec.json file, providing typed access
 * to all audit configuration parameters. Returns sensible defaults when
 * the file is missing or malformed.
 *
 * @module configLoader
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
// --- Default Configuration ---
const DEFAULT_CONFIG = {
    version: '1.0.0',
    wcag: {
        level: 'AA',
        rules: {
            'color-contrast': { enabled: true, level: 'AA', threshold: 4.5 },
            'missing-alt': { enabled: true, level: 'A' },
            'missing-label': { enabled: true, level: 'A' },
            'heading-order': { enabled: true, level: 'A' },
            'missing-landmark': { enabled: true, level: 'A' },
        },
    },
    visual: {
        enabled: true,
        checks: {
            'overlap-detection': true,
            'alignment-check': true,
            'overflow-detection': true,
            'broken-images': true,
            'viewport-bounds': true,
        },
        viewport: { width: 1280, height: 720 },
    },
    autoFix: {
        enabled: true,
        maxConfidence: 0.8,
        allowHtmlChanges: false,
        allowCssChanges: true,
        allowAttributeChanges: true,
    },
    gates: {
        prePush: {
            enabled: true,
            maxCritical: 0,
            maxMajor: 5,
            blockOnFailure: true,
        },
        preMerge: {
            enabled: false,
            maxCritical: 0,
            maxMajor: 0,
        },
    },
    reporting: {
        format: 'json',
        outputDir: './audit-reports',
        includeScreenshots: true,
        githubIssueTemplate: true,
    },
};
// --- Public API ---
/**
 * Load audit configuration from a JSON file.
 *
 * @param path - Path to the config file. Defaults to `audit-rules.spec.json` in the current working directory.
 * @returns Parsed AuditConfig, or sensible defaults if the file is missing or malformed.
 */
export function loadConfig(path) {
    const configPath = path ?? resolve(process.cwd(), 'audit-rules.spec.json');
    try {
        const raw = readFileSync(configPath, 'utf-8');
        const parsed = JSON.parse(raw);
        return mergeWithDefaults(parsed);
    }
    catch (error) {
        if (isFileNotFoundError(error)) {
            // File doesn't exist — return defaults silently
            return { ...DEFAULT_CONFIG };
        }
        // Malformed JSON or other read error — warn and return defaults
        console.warn(`[audittest-vision] Warning: Could not parse config at "${configPath}". Using defaults.`);
        return { ...DEFAULT_CONFIG };
    }
}
/**
 * Returns a list of rule IDs where `enabled` is set to `false` in the WCAG config.
 *
 * @param config - The loaded AuditConfig object.
 * @returns Array of disabled rule ID strings (e.g., ['color-contrast', 'missing-alt']).
 */
export function getDisabledRules(config) {
    const disabled = [];
    for (const [ruleId, ruleConfig] of Object.entries(config.wcag.rules)) {
        if (!ruleConfig.enabled) {
            disabled.push(ruleId);
        }
    }
    return disabled;
}
// --- Internal Helpers ---
/**
 * Deep-merge parsed config with defaults to fill in any missing fields.
 */
function mergeWithDefaults(parsed) {
    return {
        version: typeof parsed.version === 'string' ? parsed.version : DEFAULT_CONFIG.version,
        description: typeof parsed.description === 'string' ? parsed.description : undefined,
        wcag: mergeWcag(parsed.wcag),
        visual: mergeVisual(parsed.visual),
        autoFix: mergeAutoFix(parsed.autoFix),
        gates: mergeGates(parsed.gates),
        reporting: mergeReporting(parsed.reporting),
    };
}
function mergeWcag(wcag) {
    if (!wcag || typeof wcag !== 'object')
        return { ...DEFAULT_CONFIG.wcag };
    const w = wcag;
    return {
        level: typeof w.level === 'string' ? w.level : DEFAULT_CONFIG.wcag.level,
        rules: mergeRules(w.rules),
    };
}
function mergeRules(rules) {
    if (!rules || typeof rules !== 'object')
        return { ...DEFAULT_CONFIG.wcag.rules };
    const r = rules;
    const merged = { ...DEFAULT_CONFIG.wcag.rules };
    for (const [key, value] of Object.entries(r)) {
        if (value && typeof value === 'object') {
            const v = value;
            merged[key] = {
                enabled: typeof v.enabled === 'boolean' ? v.enabled : true,
                level: typeof v.level === 'string' ? v.level : undefined,
                threshold: typeof v.threshold === 'number' ? v.threshold : undefined,
            };
        }
    }
    return merged;
}
function mergeVisual(visual) {
    if (!visual || typeof visual !== 'object')
        return { ...DEFAULT_CONFIG.visual };
    const v = visual;
    return {
        enabled: typeof v.enabled === 'boolean' ? v.enabled : DEFAULT_CONFIG.visual.enabled,
        checks: mergeVisualChecks(v.checks),
        viewport: mergeViewport(v.viewport),
    };
}
function mergeVisualChecks(checks) {
    if (!checks || typeof checks !== 'object')
        return { ...DEFAULT_CONFIG.visual.checks };
    const c = checks;
    return {
        'overlap-detection': typeof c['overlap-detection'] === 'boolean' ? c['overlap-detection'] : true,
        'alignment-check': typeof c['alignment-check'] === 'boolean' ? c['alignment-check'] : true,
        'overflow-detection': typeof c['overflow-detection'] === 'boolean' ? c['overflow-detection'] : true,
        'broken-images': typeof c['broken-images'] === 'boolean' ? c['broken-images'] : true,
        'viewport-bounds': typeof c['viewport-bounds'] === 'boolean' ? c['viewport-bounds'] : true,
    };
}
function mergeViewport(viewport) {
    if (!viewport || typeof viewport !== 'object')
        return { ...DEFAULT_CONFIG.visual.viewport };
    const vp = viewport;
    return {
        width: typeof vp.width === 'number' ? vp.width : DEFAULT_CONFIG.visual.viewport.width,
        height: typeof vp.height === 'number' ? vp.height : DEFAULT_CONFIG.visual.viewport.height,
    };
}
function mergeAutoFix(autoFix) {
    if (!autoFix || typeof autoFix !== 'object')
        return { ...DEFAULT_CONFIG.autoFix };
    const a = autoFix;
    return {
        enabled: typeof a.enabled === 'boolean' ? a.enabled : DEFAULT_CONFIG.autoFix.enabled,
        maxConfidence: typeof a.maxConfidence === 'number' ? a.maxConfidence : DEFAULT_CONFIG.autoFix.maxConfidence,
        allowHtmlChanges: typeof a.allowHtmlChanges === 'boolean' ? a.allowHtmlChanges : DEFAULT_CONFIG.autoFix.allowHtmlChanges,
        allowCssChanges: typeof a.allowCssChanges === 'boolean' ? a.allowCssChanges : DEFAULT_CONFIG.autoFix.allowCssChanges,
        allowAttributeChanges: typeof a.allowAttributeChanges === 'boolean' ? a.allowAttributeChanges : DEFAULT_CONFIG.autoFix.allowAttributeChanges,
    };
}
function mergeGates(gates) {
    if (!gates || typeof gates !== 'object')
        return { ...DEFAULT_CONFIG.gates };
    const g = gates;
    return {
        prePush: mergeGate(g.prePush, DEFAULT_CONFIG.gates.prePush),
        preMerge: mergeGate(g.preMerge, DEFAULT_CONFIG.gates.preMerge),
    };
}
function mergeGate(gate, defaults) {
    if (!gate || typeof gate !== 'object')
        return { ...defaults };
    const g = gate;
    return {
        enabled: typeof g.enabled === 'boolean' ? g.enabled : defaults.enabled,
        maxCritical: typeof g.maxCritical === 'number' ? g.maxCritical : defaults.maxCritical,
        maxMajor: typeof g.maxMajor === 'number' ? g.maxMajor : defaults.maxMajor,
        blockOnFailure: typeof g.blockOnFailure === 'boolean' ? g.blockOnFailure : defaults.blockOnFailure,
    };
}
function mergeReporting(reporting) {
    if (!reporting || typeof reporting !== 'object')
        return { ...DEFAULT_CONFIG.reporting };
    const r = reporting;
    return {
        format: typeof r.format === 'string' ? r.format : DEFAULT_CONFIG.reporting.format,
        outputDir: typeof r.outputDir === 'string' ? r.outputDir : DEFAULT_CONFIG.reporting.outputDir,
        includeScreenshots: typeof r.includeScreenshots === 'boolean' ? r.includeScreenshots : DEFAULT_CONFIG.reporting.includeScreenshots,
        githubIssueTemplate: typeof r.githubIssueTemplate === 'boolean' ? r.githubIssueTemplate : DEFAULT_CONFIG.reporting.githubIssueTemplate,
    };
}
function isFileNotFoundError(error) {
    return (error instanceof Error &&
        'code' in error &&
        error.code === 'ENOENT');
}
//# sourceMappingURL=configLoader.js.map