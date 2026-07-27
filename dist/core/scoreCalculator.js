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
// --- Severity Weights ---
export const SEVERITY_WEIGHTS = {
    critical: 25,
    major: 10,
    minor: 3,
    info: 0,
};
// --- Score Calculation ---
/**
 * Calculate an accessibility score from a list of audit issues.
 *
 * The score starts at 100 and deducts points based on each issue's severity.
 * The result is clamped to a minimum of 0.
 */
export function calculateScore(issues) {
    const totalDeductions = issues.reduce((sum, issue) => sum + SEVERITY_WEIGHTS[issue.severity], 0);
    const score = Math.max(0, 100 - totalDeductions);
    return {
        score,
        grade: classifyGrade(score),
        color: classifyColor(score),
    };
}
// --- Grade Classification ---
function classifyGrade(score) {
    if (score >= 90)
        return 'Excellent';
    if (score >= 70)
        return 'Good';
    if (score >= 50)
        return 'Needs Work';
    return 'Poor';
}
function classifyColor(score) {
    if (score >= 90)
        return 'green';
    if (score >= 70)
        return 'yellow';
    if (score >= 50)
        return 'orange';
    return 'red';
}
//# sourceMappingURL=scoreCalculator.js.map