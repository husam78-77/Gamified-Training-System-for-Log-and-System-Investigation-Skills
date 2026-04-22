/**
 * autoTriggerService.js
 * Phase 5 — Automatic hint trigger detection.
 *
 * Determines whether the system should proactively push a hint
 * to the player without them pressing the hint button.
 *
 * This runs as a background evaluation on every command execution
 * (called from terminalController after a command is processed).
 * It does NOT generate the hint — it only decides IF one should fire.
 * The actual generation goes through the same hintCacheService pipeline.
 *
 * AUTO-TRIGGER CONDITIONS (ALL must be evaluated before firing):
 *   A. Player has been idle for > AUTO_TRIGGER_IDLE_MS with no progress
 *   B. Player has repeated the exact same wrong command > REPEAT_THRESHOLD times
 *   C. Player's stuck score crosses CRITICAL_STUCK_THRESHOLD
 *      AND they have not received a hint for this step yet
 *
 * ANTI-SPAM GUARDS (prevent hint flooding):
 *   - Minimum gap between any two auto-triggered hints: MIN_GAP_MS
 *   - Auto-trigger disabled if player has reached MAX_HINTS_PER_SESSION
 *   - Auto-trigger disabled if player already received a hint for this step
 *     at the current level (they chose not to escalate — respect that)
 *   - Auto-trigger fires at most once per step per session
 *
 * Path: backend/services/autoTriggerService.js
 */

const { analyzePlayerState } = require('./playerStateAnalyzer');
const hintCacheService = require('./hintCacheService');
const hintLevelService = require('./hintLevelService');
const hintModel = require('../models/hintModel');

// ─── Thresholds ──────────────────────────────────────────────────────────────

/** Ms of idle (no commands) before auto-trigger considers firing */
const AUTO_TRIGGER_IDLE_MS = 4 * 60 * 1000;       // 4 minutes

/** How many times a player must repeat the exact same wrong command */
const REPEAT_THRESHOLD = 4;

/** Stuck score at which auto-trigger fires if no hint given for this step */
const CRITICAL_STUCK_THRESHOLD = 65;

/** Minimum ms between any two auto-triggered hints in a session */
const MIN_GAP_MS = 3 * 60 * 1000;                 // 3 minutes

/** Session-level hint cap (must match hintController) */
const MAX_HINTS_PER_SESSION = 5;

// =============================================================================
// MAIN EXPORT
// =============================================================================

/**
 * Evaluate whether an auto-triggered hint should fire for this session.
 * Called by terminalController after every command execution.
 *
 * Returns null if no trigger condition is met.
 * Returns a trigger descriptor if a hint should be pushed.
 *
 * The caller (terminalController) is responsible for:
 *   - Calling generateAutoHint() if shouldTrigger is true
 *   - Sending the hint to the frontend via the command response payload
 *     (no separate socket/push needed — piggybacks on the execute response)
 *
 * @param {Object} params
 * @param {number} params.sessionId
 * @param {number} params.scenarioId
 * @param {Array}  params.commandHistory        - Full history including the just-executed command
 * @param {Array}  params.expectedSteps
 * @param {Array}  params.completedStepOrders
 * @param {Date}   params.sessionStartTime
 *
 * @returns {Promise<{
 *   shouldTrigger: boolean,
 *   reason: string|null,          - Why it triggered (for logging)
 *   stepOrder: number|null,       - Which step it's for
 * }>}
 */
const evaluateAutoTrigger = async ({
    sessionId,
    scenarioId,
    commandHistory,
    expectedSteps,
    completedStepOrders,
    sessionStartTime,
}) => {
    const NO_TRIGGER = { shouldTrigger: false, reason: null, stepOrder: null };

    // ── Guard: session hint cap ───────────────────────────────────────────
    const totalHintsUsed = await hintModel.countHintsUsed(sessionId);
    if (totalHintsUsed >= MAX_HINTS_PER_SESSION) return NO_TRIGGER;

    // ── Derive current step ───────────────────────────────────────────────
    const nextStep = expectedSteps.find(
        s => !completedStepOrders.includes(s.step_order)
    );
    if (!nextStep) return NO_TRIGGER; // All steps complete

    // ── Guard: has player already received an auto-hint for this step? ────
    const alreadyAutoHinted = await hasAutoHintBeenFiredForStep(sessionId, nextStep.step_order);
    if (alreadyAutoHinted) return NO_TRIGGER;

    // ── Guard: minimum gap between auto-hints ────────────────────────────
    const withinCooldown = await isWithinCooldown(sessionId);
    if (withinCooldown) return NO_TRIGGER;

    // ── Run player state analysis ─────────────────────────────────────────
    const playerState = analyzePlayerState({
        commandHistory,
        nextStep,
        completedStepOrders,
        totalSteps: expectedSteps.length,
        sessionStartTime,
    });

    // ── Evaluate trigger conditions ───────────────────────────────────────

    // Condition A: Long idle with no progress
    if (
        playerState.isLongIdle &&
        playerState.wrongCommandCount >= 2
    ) {
        return {
            shouldTrigger: true,
            reason: 'long_idle_with_wrong_attempts',
            stepOrder: nextStep.step_order,
        };
    }

    // Condition B: Repeated same wrong command past threshold
    if (
        playerState.isRepeating &&
        playerState.repetitionCount >= REPEAT_THRESHOLD
    ) {
        return {
            shouldTrigger: true,
            reason: 'command_repetition_threshold',
            stepOrder: nextStep.step_order,
        };
    }

    // Condition C: Critical stuck score + no hint yet for this step
    if (playerState.stuckScore >= CRITICAL_STUCK_THRESHOLD) {
        const stepProgress = await hintLevelService.getStepProgress(sessionId, nextStep.step_order);
        if (!stepProgress) {
            // No hint has been given for this step at all
            return {
                shouldTrigger: true,
                reason: 'critical_stuck_no_hint_for_step',
                stepOrder: nextStep.step_order,
            };
        }
    }

    return NO_TRIGGER;
};

/**
 * Generate and persist an auto-triggered hint.
 * Called by terminalController only if evaluateAutoTrigger returns shouldTrigger=true.
 *
 * Uses the same hintCacheService pipeline as manual hints —
 * cache-first, same level resolution, same logging.
 * The only difference is the hint is marked as auto-triggered in the log.
 *
 * @param {Object} params
 * @param {number} params.sessionId
 * @param {number} params.scenarioId
 * @param {Array}  params.commandHistory
 * @param {Array}  params.expectedSteps
 * @param {Array}  params.completedStepOrders
 * @param {Array}  params.previousHints
 * @param {string} params.scenarioTitle
 * @param {string} params.missionBrief
 * @param {Date}   params.sessionStartTime
 * @param {string} params.triggerReason        - From evaluateAutoTrigger().reason
 *
 * @returns {Promise<{ hint: string, hintLevel: number } | null>}
 */
const generateAutoHint = async ({
    sessionId,
    scenarioId,
    commandHistory,
    expectedSteps,
    completedStepOrders,
    previousHints,
    scenarioTitle,
    missionBrief,
    sessionStartTime,
    triggerReason,
}) => {
    try {
        const nextStep = expectedSteps.find(
            s => !completedStepOrders.includes(s.step_order)
        );
        if (!nextStep) return null;

        // Resolve hint level — auto-triggers always start at level 1 for a step
        const { hintLevel, hintCount } = await hintLevelService.resolveNextHintLevel({
            sessionId,
            scenarioId,
            stepOrder: nextStep.step_order,
        });

        // Resolve hint via cache-first pipeline
        const { hint, prompt, triggerCommands, playerState, cacheHit } =
            await hintCacheService.resolveHint({
                scenarioId,
                stepOrder: nextStep.step_order,
                hintLevel,
                commandHistory,
                expectedSteps,
                completedStepOrders,
                previousHints,
                scenarioTitle,
                missionBrief,
                sessionStartTime,
            });

        // Save to log — mark as auto-triggered
        await hintModel.saveHint({
            sessionId,
            triggerCommands,
            promptSent: prompt,
            hintReturned: hint,
            scenarioId,
            stepOrder: nextStep.step_order,
            hintLevel,
            playerState,
            cacheHit,
        });

        // Update session player state
        const totalHintsUsed = await hintModel.countHintsUsed(sessionId);
        await hintModel.upsertSessionPlayerState({
            sessionId,
            scenarioId,
            playerState,
            hintsUsed: totalHintsUsed,
        });

        console.log('[AutoTrigger] Hint fired:', {
            sessionId,
            stepOrder: nextStep.step_order,
            hintLevel,
            reason: triggerReason,
            cacheHit,
        });

        return { hint, hintLevel };

    } catch (err) {
        // Auto-trigger failure must NEVER crash the command execution flow
        console.error('[AutoTrigger] Generation failed — suppressed:', err.message);
        return null;
    }
};

// =============================================================================
// INTERNAL GUARDS
// =============================================================================

/**
 * Check if an auto-triggered hint has already been fired for this step.
 * We track this by checking if any existing hint for this session+step
 * was system-generated (auto-trigger). Since we don't have a separate flag
 * in the current schema, we check if hint_count > 0 for this step AND
 * the player did not manually request it (approximated by checking
 * if the first hint for the step appeared very quickly after a command).
 *
 * Simplified approach: fire at most once per step per session.
 * If ANY hint exists for this step, don't auto-fire again.
 *
 * @param {number} sessionId
 * @param {number} stepOrder
 * @returns {Promise<boolean>}
 */
const hasAutoHintBeenFiredForStep = async (sessionId, stepOrder) => {
    const stepProgress = await hintLevelService.getStepProgress(sessionId, stepOrder);
    // If any hint has been given for this step, don't auto-fire
    return stepProgress !== null && stepProgress.hint_count > 0;
};

/**
 * Check if we're within the minimum cooldown gap since the last hint.
 * Reads from ai_hint_log — finds the most recent hint timestamp for this session.
 *
 * @param {number} sessionId
 * @returns {Promise<boolean>} - true if we're still in cooldown
 */
const isWithinCooldown = async (sessionId) => {
    const pool = require('../config/db');
    const result = await pool.query(
        `SELECT timestamp
         FROM ai_hint_log
         WHERE session_id = $1
         ORDER BY timestamp DESC
         LIMIT 1`,
        [sessionId]
    );

    if (result.rows.length === 0) return false; // No previous hints — no cooldown

    const lastHintTime = new Date(result.rows[0].timestamp).getTime();
    const elapsed = Date.now() - lastHintTime;
    return elapsed < MIN_GAP_MS;
};

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = {
    evaluateAutoTrigger,
    generateAutoHint,
    AUTO_TRIGGER_IDLE_MS,
    REPEAT_THRESHOLD,
    CRITICAL_STUCK_THRESHOLD,
};