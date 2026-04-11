/**
 * evaluationService.js
 * Core evaluation engine.
 *
 * Responsibilities:
 * 1. Match a single parsed command against all expected steps
 * 2. Calculate per-session scores on completion
 * 3. Determine objective completion based on step progress
 */

const { normalizeForEvaluation, normalizePath } = require('../utils/terminalParser');

/**
 * Match a single parsed command against the scenario's expected steps.
 * Returns which step was matched (if any), or null.
 *
 * Matching logic:
 *   - command must match exactly (e.g. "cat")
 *   - target path must match (normalized)
 *   - Steps already completed in this session are skipped
 *
 * @param {Object} parsed        - Output from terminalParser.parseCommand()
 * @param {Array}  expectedSteps - All expected_steps rows for the scenario
 * @param {Array}  completedStepOrders - step_order values already matched this session
 * @returns {{ matched: boolean, step: Object|null }}
 */
const matchCommand = (parsed, expectedSteps, completedStepOrders = []) => {
    if (!parsed.valid) return { matched: false, step: null };

    const normalizedInput = normalizeForEvaluation(parsed);

    for (const step of expectedSteps) {
        // Skip already-completed steps
        if (completedStepOrders.includes(step.step_order)) continue;

        const normalizedExpected = buildExpectedKey(step);

        if (normalizedInput === normalizedExpected) {
            return { matched: true, step };
        }
    }

    return { matched: false, step: null };
};

/**
 * Build a normalized key from an expected_step row to match against parsed input.
 * Format mirrors normalizeForEvaluation: "command:target"
 */
const buildExpectedKey = (step) => {
    const command = step.command_expected?.toLowerCase().trim();
    const target = step.target_path ? normalizePath(step.target_path) : null;
    return target ? `${command}:${target}` : command;
};

/**
 * Calculate the final score for a completed session.
 *
 * Scoring breakdown (total = 100 points):
 *
 * 1. PATH SCORE (50 pts)
 *    Based on weight_percent of each completed expected step.
 *    Each step has a weight_percent that sums to 100 across the scenario.
 *    Path score = sum of weight_percent for all matched steps / 2
 *    (divided by 2 because path is 50% of total)
 *
 * 2. COMMAND USAGE SCORE (30 pts)
 *    Efficiency metric: penalizes excess commands.
 *    Formula: max(0, 30 - penalty)
 *    Penalty: for every 3 extra commands beyond expected count, -5 pts.
 *
 * 3. CONCLUSION SCORE (20 pts)
 *    Did the user complete all non-secret objectives?
 *    Full 20 pts if all required objectives done, partial otherwise.
 *
 * 4. HINT PENALTY
 *    -5 pts per AI hint used (minimum total score: 0)
 *
 * @param {Object} params
 * @param {Array}  params.expectedSteps       - All expected steps for the scenario
 * @param {Array}  params.matchedCommands     - command_history rows where match_expected = TRUE
 * @param {number} params.totalCommandsCount  - Total commands entered in the session
 * @param {Array}  params.objectives          - All objectives for the scenario
 * @param {Array}  params.completedObjectiveIds - objective_ids the user completed
 * @param {number} params.hintsUsed           - Number of AI hints consumed
 *
 * @returns {{ commandUsageScore, pathScore, conclusionScore, totalWeightedScore, partialCredit }}
 */
const calculateScore = ({
    expectedSteps,
    matchedCommands,
    totalCommandsCount,
    objectives,
    completedObjectiveIds,
    hintsUsed,
}) => {
    // --- PATH SCORE (50 pts max) ---
    const totalWeight = expectedSteps.reduce((sum, s) => sum + (s.weight_percent || 0), 0);
    const matchedStepOrders = matchedCommands.map(c => c.match_step_order);

    const earnedWeight = expectedSteps
        .filter(s => matchedStepOrders.includes(s.step_order))
        .reduce((sum, s) => sum + (s.weight_percent || 0), 0);

    const pathScore = totalWeight > 0
        ? Math.round((earnedWeight / totalWeight) * 50)
        : 0;

    // --- COMMAND USAGE SCORE (30 pts max) ---
    const expectedCount = expectedSteps.length;
    const extraCommands = Math.max(0, totalCommandsCount - expectedCount);
    const penalty = Math.floor(extraCommands / 3) * 5;
    const commandUsageScore = Math.max(0, 30 - penalty);

    // --- CONCLUSION SCORE (20 pts max) ---
    const requiredObjectives = objectives.filter(o => !o.is_secret);
    const completedRequired = requiredObjectives.filter(o =>
        completedObjectiveIds.includes(o.objective_id)
    );

    const conclusionScore = requiredObjectives.length > 0
        ? Math.round((completedRequired.length / requiredObjectives.length) * 20)
        : 0;

    // --- HINT PENALTY ---
    const hintPenalty = hintsUsed * 5;

    // --- TOTAL ---
    const raw = pathScore + commandUsageScore + conclusionScore;
    const totalWeightedScore = Math.max(0, raw - hintPenalty);

    // Partial credit: did they complete SOME steps but not all?
    const partialCredit = matchedStepOrders.length > 0 && matchedStepOrders.length < expectedSteps.length;

    return {
        commandUsageScore,
        pathScore,
        conclusionScore,
        totalWeightedScore,
        partialCredit,
    };
};

/**
 * Calculate XP reward based on score and scenario difficulty.
 *
 * XP tiers:
 *   easy:   base 500  XP
 *   medium: base 1250 XP
 *   hard:   base 5000 XP
 *
 * Modifier: score / 100 (so 80/100 score = 80% of base XP)
 * Bonus: +200 XP if no hints used
 *
 * @param {number} score       - Total weighted score (0–100)
 * @param {string} difficulty  - 'easy' | 'medium' | 'hard'
 * @param {number} hintsUsed   - Number of hints consumed
 * @returns {number} xpAwarded
 */
const calculateXp = (score, difficulty, hintsUsed) => {
    const baseXp = {
        easy: 500,
        medium: 1250,
        hard: 5000,
    };

    const base = baseXp[difficulty?.toLowerCase()] || 500;
    const modifier = score / 100;
    const noHintBonus = hintsUsed === 0 ? 200 : 0;

    return Math.round(base * modifier) + noHintBonus;
};

/**
 * Determine which objectives are now completed given the set of matched step orders.
 * An objective is complete when its trigger_step has been matched.
 * Objectives with trigger_step = NULL are never auto-completed (require manual trigger).
 *
 * @param {Array}  objectives           - All objective rows for the scenario
 * @param {Array}  matchedStepOrders    - step_order values matched so far
 * @returns {Array} completedObjectiveIds
 */
const resolveCompletedObjectives = (objectives, matchedStepOrders) => {
    return objectives
        .filter(obj => obj.trigger_step !== null && matchedStepOrders.includes(obj.trigger_step))
        .map(obj => obj.objective_id);
};

module.exports = {
    matchCommand,
    calculateScore,
    calculateXp,
    resolveCompletedObjectives,
};