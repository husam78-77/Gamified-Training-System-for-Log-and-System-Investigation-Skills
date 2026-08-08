/**
 * evaluationService.js
 * Core evaluation engine.
 *
 * Responsibilities:
 * 1. Match a single parsed command against all expected steps (legacy system)
 * 2. Calculate per-session scores with discovery-aware path scoring
 * 3. Determine objective completion based on step/discovery progress
 *
 * Discovery-aware scoring:
 *   When a session has discoveries defined (scenario_discoveries rows), the
 *   PATH SCORE is calculated from critical discovery weights rather than
 *   step weights. This gives a more meaningful score — "how much of the
 *   evidence did you find?" — regardless of which commands were used.
 *   All other score components (command usage, conclusion, hint penalty) are
 *   unchanged.
 */

const { normalizeForEvaluation, normalizePath } = require('../utils/terminalParser');
const { calculateDiscoveryPathScore } = require('./discoveryService');
const discoveryEngine = require('./investigation/discoveryEngine');

/**
 * Match a single parsed command against the scenario's expected steps.
 *
 * Matching strategy (tries each in order, first match wins):
 *
 *   1. EXACT MATCH
 *      "ls /logs" matches step { command: 'ls', target: '/logs' }
 *
 *   2. RELATIVE MATCH
 *      Player is in /logs and types "ls" or "cat auth.log"
 *      We resolve the target against current_path and check again.
 *
 *   3. COMMAND-ONLY MATCH (no target in expected step)
 *      e.g. "pwd", "whoami" — target doesn't matter
 *
 * @param {Object} parsed             - Output from terminalParser.parseCommand()
 * @param {Array}  expectedSteps      - All expected_steps rows for the scenario
 * @param {Array}  completedStepOrders - step_order values already matched this session
 * @param {string} currentPath        - Player's current directory in the virtual FS
 * @returns {{ matched: boolean, step: Object|null }}
 */
const matchCommand = (parsed, expectedSteps, completedStepOrders = [], currentPath = '/') => {
    if (!parsed.valid) return { matched: false, step: null };

    const normalizedInput   = normalizeForEvaluation(parsed);
    const normalizedCurrent = normalizePath(currentPath);

    for (const step of expectedSteps) {
        if (completedStepOrders.includes(step.step_order)) continue;

        const normalizedExpected = buildExpectedKey(step);

        // Strategy 1: Exact match
        if (normalizedInput === normalizedExpected) {
            return { matched: true, step };
        }

        // Strategy 2: Relative path match
        if (step.target_path) {
            const resolvedInput = buildResolvedKey(parsed, normalizedCurrent);
            if (resolvedInput && resolvedInput === normalizedExpected) {
                return { matched: true, step };
            }
        }

        // Strategy 3: Bare command match (no target required)
        if (!step.target_path && parsed.command === step.command_expected?.toLowerCase()) {
            return { matched: true, step };
        }
    }

    return { matched: false, step: null };
};

/**
 * Build a normalized key from an expected_step row.
 * Format: "command:target" or just "command" if no target.
 */
const buildExpectedKey = (step) => {
    const command = step.command_expected?.toLowerCase().trim();
    const target  = step.target_path ? normalizePath(step.target_path) : null;
    return target ? `${command}:${target}` : command;
};

/**
 * Build a resolved key by combining the player's current path with
 * their typed target, then forming "command:resolvedPath".
 */
const buildResolvedKey = (parsed, currentPath) => {
    const command = parsed.command;
    const target  = parsed.target;

    let resolvedPath;

    if (!target) {
        resolvedPath = currentPath;
    } else if (target.startsWith('/')) {
        resolvedPath = normalizePath(target);
    } else {
        const base = currentPath === '/' ? '' : currentPath;
        resolvedPath = normalizePath(`${base}/${target}`);
    }

    return resolvedPath ? `${command}:${resolvedPath}` : command;
};

/**
 * Calculate the final score for a completed session.
 *
 * Scoring breakdown (total = 100 points):
 *
 * 1. PATH SCORE (50 pts)
 *    — If the scenario has discoveries: uses critical discovery weights.
 *      Each critical discovery's weight_percent contributes proportionally.
 *    — Otherwise: falls back to step weight_percent sums (legacy behavior).
 *
 * 2. COMMAND USAGE SCORE (30 pts)
 *    Efficiency metric: penalizes excess commands.
 *    Reference count = discoveries count (if available) else expected steps count.
 *    Penalty: for every 3 extra commands beyond reference count, -5 pts.
 *
 * 3. CONCLUSION SCORE (20 pts)
 *    Did the user complete all non-secret objectives?
 *
 * 4. HINT PENALTY
 *    -5 pts per AI hint used (minimum total score: 0)
 *
 * @param {Object} params
 * @param {Array}  params.expectedSteps
 * @param {Array}  params.matchedCommands
 * @param {number} params.totalCommandsCount
 * @param {Array}  params.objectives
 * @param {number[]} params.completedObjectiveIds
 * @param {number} params.hintsUsed
 * @param {Array}  [params.discoveries]           - scenario_discoveries (optional)
 * @param {number[]} [params.completedDiscoveryIds] - session discovery IDs (optional)
 */
const calculateScore = ({
    expectedSteps,
    matchedCommands,
    totalCommandsCount,
    objectives,
    completedObjectiveIds,
    hintsUsed,
    discoveries = [],
    completedDiscoveryIds = [],
}) => {
    const hasDiscoveries = discoveries && discoveries.length > 0;

    // --- PATH SCORE (50 pts max) ---
    let pathScore;
    if (hasDiscoveries) {
        // Discovery-based: how much evidence did the player find?
        pathScore = calculateDiscoveryPathScore(discoveries, completedDiscoveryIds);
    } else {
        // Legacy step-based: what fraction of step weights did the player earn?
        const totalWeight = expectedSteps.reduce((sum, s) => sum + (s.weight_percent || 0), 0);
        const matchedStepOrders = matchedCommands.map(c => c.match_step_order);
        const earnedWeight = expectedSteps
            .filter(s => matchedStepOrders.includes(s.step_order))
            .reduce((sum, s) => sum + (s.weight_percent || 0), 0);
        pathScore = totalWeight > 0 ? Math.round((earnedWeight / totalWeight) * 50) : 0;
    }

    // --- COMMAND USAGE SCORE (30 pts max) ---
    // Reference count: discoveries (new) or expected steps (legacy)
    const referenceCount = hasDiscoveries
        ? discoveries.filter(d => d.is_critical).length
        : expectedSteps.length;

    const extraCommands     = Math.max(0, totalCommandsCount - referenceCount);
    const commandPenalty    = Math.floor(extraCommands / 3) * 5;
    const commandUsageScore = Math.max(0, 30 - commandPenalty);

    // --- CONCLUSION SCORE (20 pts max) ---
    const requiredObjectives = objectives.filter(o => !o.is_secret);
    const completedRequired  = requiredObjectives.filter(o =>
        completedObjectiveIds.includes(o.objective_id)
    );

    const conclusionScore = requiredObjectives.length > 0
        ? Math.round((completedRequired.length / requiredObjectives.length) * 20)
        : 0;

    // --- HINT PENALTY ---
    const hintPenalty = hintsUsed * 5;

    // --- TOTAL ---
    const raw                = pathScore + commandUsageScore + conclusionScore;
    const totalWeightedScore = Math.max(0, raw - hintPenalty);

    const matchedStepOrders = matchedCommands.map(c => c.match_step_order);
    const partialCredit = hasDiscoveries
        ? (completedDiscoveryIds.length > 0 && completedDiscoveryIds.length < discoveries.filter(d => d.is_critical).length)
        : (matchedStepOrders.length > 0 && matchedStepOrders.length < expectedSteps.length);

    return {
        commandUsageScore,
        pathScore,
        conclusionScore,
        totalWeightedScore,
        partialCredit,
    };
};

/**
 * Calculate the mechanical completion score for a content-driven session
 * (Phase 8/9) — the same 100-point breakdown as calculateScore, sourced
 * from discoveries.json/objectives.json instead of expected_steps.
 *
 * This score measures investigation *mechanics* (evidence found, command
 * efficiency, objectives reached, hints used) and drives XP/badges. It is
 * independent of — and computed before — the qualitative AI Review score,
 * which grades the written report itself against review.json.
 *
 * @param {Object}   params
 * @param {Array}    params.discoveries          - all discoveries for the incident
 * @param {string[]} params.unlockedKeys         - discovery keys unlocked this session
 * @param {Array}    params.objectives           - all objectives for the incident
 * @param {string[]} params.completedObjectiveIds
 * @param {number}   params.totalCommandsCount
 * @param {number}   params.hintsUsed
 */
const calculateContentScore = ({
    discoveries,
    unlockedKeys,
    objectives,
    completedObjectiveIds,
    totalCommandsCount,
    hintsUsed,
}) => {
    // --- PATH SCORE (50 pts max) ---
    const pathScore = discoveryEngine.calculatePathScore(discoveries, unlockedKeys);

    // --- COMMAND USAGE SCORE (30 pts max) ---
    const requiredDiscoveries = discoveries.filter(d => d.required);
    const extraCommands = Math.max(0, totalCommandsCount - requiredDiscoveries.length);
    const commandPenalty = Math.floor(extraCommands / 3) * 5;
    const commandUsageScore = Math.max(0, 30 - commandPenalty);

    // --- CONCLUSION SCORE (20 pts max) ---
    const conclusionScore = objectives.length > 0
        ? Math.round((completedObjectiveIds.length / objectives.length) * 20)
        : 0;

    // --- HINT PENALTY ---
    const hintPenalty = hintsUsed * 5;

    // --- TOTAL ---
    const raw = pathScore + commandUsageScore + conclusionScore;
    const totalWeightedScore = Math.max(0, raw - hintPenalty);

    const partialCredit = unlockedKeys.length > 0 && unlockedKeys.length < requiredDiscoveries.length;

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
 */
const calculateXp = (score, difficulty, hintsUsed) => {
    const baseXp = {
        easy:   500,
        medium: 1250,
        hard:   5000,
    };

    const base       = baseXp[difficulty?.toLowerCase()] || 500;
    const modifier   = score / 100;
    const noHintBonus = hintsUsed === 0 ? 200 : 0;

    return Math.round(base * modifier) + noHintBonus;
};

/**
 * Determine which objectives are now completed given matched step orders.
 * Works for both direct matches and discovery-credited steps since both
 * produce command_history records with match_step_order set.
 */
const resolveCompletedObjectives = (objectives, matchedStepOrders) => {
    return objectives
        .filter(obj => obj.trigger_step !== null && matchedStepOrders.includes(obj.trigger_step))
        .map(obj => obj.objective_id);
};

module.exports = {
    matchCommand,
    calculateScore,
    calculateContentScore,
    calculateXp,
    resolveCompletedObjectives,
};
