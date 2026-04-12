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
 *
 * Matching strategy (tries each in order, first match wins):
 *
 *   1. EXACT MATCH
 *      "ls /logs" matches step { command: 'ls', target: '/logs' }
 *
 *   2. RELATIVE MATCH
 *      Player is in /logs and types "ls" or "cat auth.log"
 *      We resolve the target against current_path and check again.
 *      e.g. current_path=/logs + target=null → resolved=/logs → matches "ls:/logs"
 *      e.g. current_path=/logs + target=auth.log → resolved=/logs/auth.log → matches "cat:/logs/auth.log"
 *
 *   3. COMMAND-ONLY MATCH (no target in expected step)
 *      Some steps only require the command itself (e.g. "whoami")
 *
 * @param {Object} parsed             - Output from terminalParser.parseCommand()
 * @param {Array}  expectedSteps      - All expected_steps rows for the scenario
 * @param {Array}  completedStepOrders - step_order values already matched this session
 * @param {string} currentPath        - Player's current directory in the virtual FS
 * @returns {{ matched: boolean, step: Object|null }}
 */
const matchCommand = (parsed, expectedSteps, completedStepOrders = [], currentPath = '/') => {
    if (!parsed.valid) return { matched: false, step: null };

    const normalizedInput = normalizeForEvaluation(parsed);
    const normalizedCurrent = normalizePath(currentPath);

    for (const step of expectedSteps) {
        // Skip already-completed steps
        if (completedStepOrders.includes(step.step_order)) continue;

        const normalizedExpected = buildExpectedKey(step);

        // ── Strategy 1: Exact match ───────────────────────────────────────
        if (normalizedInput === normalizedExpected) {
            return { matched: true, step };
        }

        // ── Strategy 2: Relative path match ──────────────────────────────
        // Resolve what the player typed against their current directory
        // and check if that matches the expected target
        if (step.target_path) {
            const resolvedInput = buildResolvedKey(parsed, normalizedCurrent);
            if (resolvedInput && resolvedInput === normalizedExpected) {
                return { matched: true, step };
            }
        }

        // ── Strategy 3: Bare command match (no target required) ──────────
        // e.g. "pwd", "whoami" — target doesn't matter
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
    const target = step.target_path ? normalizePath(step.target_path) : null;
    return target ? `${command}:${target}` : command;
};

/**
 * Build a resolved key by combining the player's current path with
 * their typed target, then forming "command:resolvedPath".
 *
 * Examples:
 *   currentPath=/logs, cmd=ls, target=null  → "ls:/logs"
 *   currentPath=/logs, cmd=cat, target=auth.log → "cat:/logs/auth.log"
 *   currentPath=/etc,  cmd=cat, target=passwd   → "cat:/etc/passwd"
 *   currentPath=/,     cmd=ls,  target=logs     → "ls:/logs"
 */
const buildResolvedKey = (parsed, currentPath) => {
    const command = parsed.command;
    const target = parsed.target;

    let resolvedPath;

    if (!target) {
        // No target typed — the implicit target is the current directory
        resolvedPath = currentPath;
    } else if (target.startsWith('/')) {
        // Absolute path — already resolved
        resolvedPath = normalizePath(target);
    } else {
        // Relative path — join with current directory
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
 *    Based on weight_percent of each completed expected step.
 *    Each step has a weight_percent that sums to 100 across the scenario.
 *    Path score = sum of weight_percent for all matched steps / 2
 *
 * 2. COMMAND USAGE SCORE (30 pts)
 *    Efficiency metric: penalizes excess commands.
 *    Penalty: for every 3 extra commands beyond expected count, -5 pts.
 *
 * 3. CONCLUSION SCORE (20 pts)
 *    Did the user complete all non-secret objectives?
 *
 * 4. HINT PENALTY
 *    -5 pts per AI hint used (minimum total score: 0)
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
 * Determine which objectives are now completed given matched step orders.
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