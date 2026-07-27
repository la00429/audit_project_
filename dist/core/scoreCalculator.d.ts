/**
 * AuditTest Vision — Score Calculator
 *
 * Calculates an accessibility score (0-100) based on issue severity weights.
 * Formula: max(0, 100 - sum_of_weighted_deductions)
 *
 * Severity weights:
 *   critical = 25pts
 *   major    = 10pts
 *   minor    =  3pts
 *   info     =  0pts
 *
 * Grade classification:
 *   90-100: Excellent (green)
 *   70-89:  Good (yellow)
 *   50-69:  Needs Work (orange)
 *   0-49:   Poor (red)
 */
import { AuditIssue, Severity } from './auditEngine';
/** Result of the score calculation */
export interface ScoreResult {
    /** Numeric score between 0 and 100 */
    score: number;
    /** Human-readable grade label */
    grade: string;
    /** Color associated with the grade */
    color: string;
}
export declare const SEVERITY_WEIGHTS: Record<Severity, number>;
/**
 * Calculate an accessibility score from a list of audit issues.
 *
 * The score starts at 100 and deducts points based on each issue's severity.
 * The result is clamped to a minimum of 0.
 */
export declare function calculateScore(issues: AuditIssue[]): ScoreResult;
//# sourceMappingURL=scoreCalculator.d.ts.map