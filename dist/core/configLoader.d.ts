/**
 * AuditTest Vision — Configuration Loader
 *
 * Reads and parses the audit-rules.spec.json file, providing typed access
 * to all audit configuration parameters. Returns sensible defaults when
 * the file is missing or malformed.
 *
 * @module configLoader
 */
export interface WcagRuleConfig {
    enabled: boolean;
    level?: string;
    threshold?: number;
}
export interface WcagConfig {
    level: string;
    rules: Record<string, WcagRuleConfig>;
}
export interface VisualChecks {
    'overlap-detection': boolean;
    'alignment-check': boolean;
    'overflow-detection': boolean;
    'broken-images': boolean;
    'viewport-bounds': boolean;
}
export interface ViewportConfig {
    width: number;
    height: number;
}
export interface VisualConfig {
    enabled: boolean;
    checks: VisualChecks;
    viewport: ViewportConfig;
}
export interface AutoFixConfig {
    enabled: boolean;
    maxConfidence: number;
    allowHtmlChanges: boolean;
    allowCssChanges: boolean;
    allowAttributeChanges: boolean;
}
export interface GateConfig {
    enabled: boolean;
    maxCritical: number;
    maxMajor: number;
    blockOnFailure?: boolean;
}
export interface GatesConfig {
    prePush: GateConfig;
    preMerge: GateConfig;
}
export interface ReportingConfig {
    format: string;
    outputDir: string;
    includeScreenshots: boolean;
    githubIssueTemplate: boolean;
}
export interface AuditConfig {
    version: string;
    description?: string;
    wcag: WcagConfig;
    visual: VisualConfig;
    autoFix: AutoFixConfig;
    gates: GatesConfig;
    reporting: ReportingConfig;
}
/**
 * Load audit configuration from a JSON file.
 *
 * @param path - Path to the config file. Defaults to `audit-rules.spec.json` in the current working directory.
 * @returns Parsed AuditConfig, or sensible defaults if the file is missing or malformed.
 */
export declare function loadConfig(path?: string): AuditConfig;
/**
 * Returns a list of rule IDs where `enabled` is set to `false` in the WCAG config.
 *
 * @param config - The loaded AuditConfig object.
 * @returns Array of disabled rule ID strings (e.g., ['color-contrast', 'missing-alt']).
 */
export declare function getDisabledRules(config: AuditConfig): string[];
//# sourceMappingURL=configLoader.d.ts.map