/**
 * autoTriggerService.js
 * Phase 7 — Automatic hint trigger detection, keyed by objective id.
 *
 * Determines whether ARIA should proactively push a hint to the player
 * without them requesting one. Runs as a background evaluation after every
 * command (called from terminalController). It does not generate the hint
 * — only decides IF one should fire — generation goes through the same
 * hintCacheService pipeline manual requests use.
 *
 * AUTO-TRIGGER CONDITIONS (any one fires it):
 *   A. Player has been idle for > AUTO_TRIGGER_IDLE_MS with no progress
 *   B. Player has repeated the exact same wrong command > REPEAT_THRESHOLD times
 *   C. Player's stuck score crosses CRITICAL_STUCK_THRESHOLD and they have
 *      not received a hint for the current objective yet
 *
 * ANTI-SPAM GUARDS:
 *   - Minimum gap between any two auto-triggered hints: MIN_GAP_MS
 *   - Disabled once MAX_HINTS_PER_SESSION is reached
 *   - Fires at most once per objective per session
 */

const { analyzePlayerState } = require('./playerStateAnalyzer');
const hintCacheService = require('./hintCacheService');
const hintLevelService = require('./hintLevelService');
const hintModel = require('../models/hintModel');

const AUTO_TRIGGER_IDLE_MS = 4 * 60 * 1000;       // 4 minutes
const REPEAT_THRESHOLD = 4;
const CRITICAL_STUCK_THRESHOLD = 65;
const MIN_GAP_MS = 3 * 60 * 1000;                 // 3 minutes
const MAX_HINTS_PER_SESSION = 5;

// =============================================================================
// MAIN EXPORT
// =============================================================================

/**
 * @param {Object}   params
 * @param {number}   params.sessionId
 * @param {number}   params.scenarioId
 * @param {Array}    params.commandHistory   - Full history including the just-executed command
 * @param {Array}    params.discoveries
 * @param {Array}    params.objectives
 * @param {string[]} params.unlockedKeys
 * @param {Date}     params.sessionStartTime
 *
 * @returns {Promise<{ shouldTrigger: boolean, reason: string|null, objectiveId: string|null }>}
 */
const evaluateAutoTrigger = async ({
    sessionId,
    scenarioId,
    commandHistory,
    discoveries,
    objectives,
    unlockedKeys,
    sessionStartTime,
}) => {
    const NO_TRIGGER = { shouldTrigger: false, reason: null, objectiveId: null };

    const totalHintsUsed = await hintModel.countHintsUsed(sessionId);
    if (totalHintsUsed >= MAX_HINTS_PER_SESSION) return NO_TRIGGER;

    const objectiveEngine = require('./investigation/objectiveEngine');
    const discoveryEngine = require('./investigation/discoveryEngine');

    const completedObjectiveIds = objectiveEngine.resolveCompletedObjectives(objectives, unlockedKeys);
    const nextObjective = objectives.find(o => !completedObjectiveIds.includes(o.id));
    if (!nextObjective) return NO_TRIGGER; // All objectives complete

    const alreadyAutoHinted = await hasAutoHintBeenFiredForObjective(sessionId, nextObjective.id);
    if (alreadyAutoHinted) return NO_TRIGGER;

    const withinCooldown = await isWithinCooldown(sessionId);
    if (withinCooldown) return NO_TRIGGER;

    const candidateCommands = discoveryEngine.getCandidateCommands(discoveries, nextObjective, unlockedKeys);
    const playerState = analyzePlayerState({
        commandHistory,
        candidateCommands,
        completedCount: completedObjectiveIds.length,
        totalCount: objectives.length,
        sessionStartTime,
    });

    // Condition A: Long idle with no progress
    if (playerState.isLongIdle && playerState.wrongCommandCount >= 2) {
        return { shouldTrigger: true, reason: 'long_idle_with_wrong_attempts', objectiveId: nextObjective.id };
    }

    // Condition B: Repeated same wrong command past threshold
    if (playerState.isRepeating && playerState.repetitionCount >= REPEAT_THRESHOLD) {
        return { shouldTrigger: true, reason: 'command_repetition_threshold', objectiveId: nextObjective.id };
    }

    // Condition C: Critical stuck score + no hint yet for this objective
    if (playerState.stuckScore >= CRITICAL_STUCK_THRESHOLD) {
        const stepProgress = await hintLevelService.getStepProgress(sessionId, nextObjective.id);
        if (!stepProgress) {
            return { shouldTrigger: true, reason: 'critical_stuck_no_hint_for_objective', objectiveId: nextObjective.id };
        }
    }

    return NO_TRIGGER;
};

/**
 * Generate and persist an auto-triggered hint. Called only when
 * evaluateAutoTrigger returns shouldTrigger=true.
 *
 * @param {Object} params
 * @param {number} params.sessionId
 * @param {number} params.scenarioId
 * @param {Array}  params.commandHistory
 * @param {Array}  params.discoveries
 * @param {Array}  params.objectives
 * @param {string[]} params.unlockedKeys
 * @param {Array}  params.previousHints
 * @param {string} params.scenarioTitle
 * @param {string} params.missionBrief
 * @param {Date}   params.sessionStartTime
 * @param {string} params.triggerReason
 *
 * @returns {Promise<{ hint: string, hintLevel: number } | null>}
 */
const generateAutoHint = async ({
    sessionId,
    scenarioId,
    commandHistory,
    discoveries,
    objectives,
    unlockedKeys,
    previousHints,
    scenarioTitle,
    missionBrief,
    sessionStartTime,
    triggerReason,
}) => {
    try {
        const objectiveEngine = require('./investigation/objectiveEngine');
        const discoveryEngine = require('./investigation/discoveryEngine');

        const completedObjectiveIds = objectiveEngine.resolveCompletedObjectives(objectives, unlockedKeys);
        const nextObjective = objectives.find(o => !completedObjectiveIds.includes(o.id));
        if (!nextObjective) return null;

        const candidateCommands = discoveryEngine.getCandidateCommands(discoveries, nextObjective, unlockedKeys);

        const { hintLevel } = await hintLevelService.resolveNextHintLevel({
            sessionId,
            scenarioId,
            objectiveId: nextObjective.id,
        });

        const { hint, prompt, triggerCommands, playerState, cacheHit } =
            await hintCacheService.resolveHint({
                scenarioId,
                objectiveId: nextObjective.id,
                hintLevel,
                commandHistory,
                candidateCommands,
                nextObjective,
                completedCount: completedObjectiveIds.length,
                totalCount: objectives.length,
                previousHints,
                scenarioTitle,
                missionBrief,
                sessionStartTime,
                isAutoTriggered: true,
            });

        await hintModel.saveHint({
            sessionId,
            triggerCommands,
            promptSent: prompt,
            hintReturned: hint,
            scenarioId,
            stepOrder: nextObjective.id,
            hintLevel,
            playerState,
            cacheHit,
        });

        const totalHintsUsed = await hintModel.countHintsUsed(sessionId);
        await hintModel.upsertSessionPlayerState({
            sessionId,
            scenarioId,
            playerState,
            hintsUsed: totalHintsUsed,
        });

        console.log('[AutoTrigger] Hint fired:', {
            sessionId, objectiveId: nextObjective.id, hintLevel, reason: triggerReason, cacheHit,
        });

        return { hint, hintLevel };

    } catch (err) {
        console.error('[AutoTrigger] Generation failed — suppressed:', err.message);
        return null;
    }
};

// =============================================================================
// INTERNAL GUARDS
// =============================================================================

/**
 * Fires at most once per objective per session — if any hint already
 * exists for this objective, don't auto-fire again.
 */
const hasAutoHintBeenFiredForObjective = async (sessionId, objectiveId) => {
    const stepProgress = await hintLevelService.getStepProgress(sessionId, objectiveId);
    return stepProgress !== null && stepProgress.hint_count > 0;
};

const isWithinCooldown = async (sessionId) => {
    const pool = require('../config/db');
    const result = await pool.query(
        `SELECT timestamp FROM ai_hint_log WHERE session_id = $1 ORDER BY timestamp DESC LIMIT 1`,
        [sessionId]
    );

    if (result.rows.length === 0) return false;

    const lastHintTime = new Date(result.rows[0].timestamp).getTime();
    return (Date.now() - lastHintTime) < MIN_GAP_MS;
};

module.exports = {
    evaluateAutoTrigger,
    generateAutoHint,
    AUTO_TRIGGER_IDLE_MS,
    REPEAT_THRESHOLD,
    CRITICAL_STUCK_THRESHOLD,
};
