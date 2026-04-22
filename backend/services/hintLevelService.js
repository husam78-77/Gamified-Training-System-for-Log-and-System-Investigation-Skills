/**
 * hintLevelService.js
 * Phase 2 — Per-Objective Hint Level Resolution
 *
 * This service owns ONE responsibility:
 * Given a session + step, determine what hint level the user
 * should receive next, enforce the level cap, and persist the result.
 *
 * It is called by hintController BEFORE hintService.generateHint()
 * so the resolved level can be passed into prompt building.
 *
 * HINT LEVEL DEFINITIONS:
 *   Level 1 → Vague directional guidance. Points toward the general
 *              area of the solution without naming tools or paths.
 *              Example: "The evidence you need is in the system's
 *              record of authentication events."
 *
 *   Level 2 → Stronger directional hint. Names the category of action
 *              (reading files, searching content) without the exact command.
 *              Example: "You'll want to read a file in the logs directory.
 *              Think about which command lets you view file contents."
 *
 *   Level 3 → Most explicit hint allowed. Describes the exact action
 *              type and target clearly, but still withholds the exact
 *              command syntax and full path.
 *              Example: "The authentication log at /logs/ contains the
 *              evidence. Use a file-reading command to examine it directly."
 *              NOTE: Even level 3 never outputs the exact command string.
 *
 * LEVEL CAP: MAX_HINT_LEVEL = 3. Requesting beyond level 3 returns
 * the level-3 hint again (or a "no more hints" signal).
 *
 * Path: backend/services/hintLevelService.js
 */

const pool = require('../config/db');

// Maximum hint level allowed per step
const MAX_HINT_LEVEL = 3;

// =============================================================================
// MAIN EXPORT
// =============================================================================

/**
 * Resolve the next hint level for a user on a specific step.
 *
 * Flow:
 *   1. Read user_hint_progress for (session_id, step_order)
 *   2. If no row exists → this is the first hint for this step → level 1
 *   3. If row exists → next level = current_level + 1
 *   4. If next level > MAX_HINT_LEVEL → cap at MAX_HINT_LEVEL
 *   5. Upsert the progress row with the new level
 *   6. Return the resolved level + step hint cap status
 *
 * @param {Object} params
 * @param {number} params.sessionId
 * @param {number} params.scenarioId
 * @param {number} params.stepOrder   - The step the user is currently on
 *
 * @returns {Promise<{
 *   hintLevel: number,          - 1, 2, or 3
 *   hintCount: number,          - Total hints used for this step (after this one)
 *   stepLevelCapped: boolean,   - true if user has exhausted all levels for this step
 *   isFirstForStep: boolean,    - true if this is the first hint request for this step
 * }>}
 */
const resolveNextHintLevel = async ({ sessionId, scenarioId, stepOrder }) => {
    // ── Read current progress for this step ──────────────────────────────
    const existing = await getStepProgress(sessionId, stepOrder);

    const currentLevel = existing?.current_level ?? 0;
    const currentCount = existing?.hint_count ?? 0;

    // ── Resolve next level ────────────────────────────────────────────────
    const rawNextLevel = currentLevel + 1;
    const hintLevel = Math.min(rawNextLevel, MAX_HINT_LEVEL);
    const newCount = currentCount + 1;
    const stepLevelCapped = currentLevel >= MAX_HINT_LEVEL; // already at max before this request

    // ── Persist progress ─────────────────────────────────────────────────
    await upsertStepProgress({
        sessionId,
        scenarioId,
        stepOrder,
        newLevel: hintLevel,
        newCount,
        isFirst: !existing,
    });

    return {
        hintLevel,
        hintCount: newCount,
        stepLevelCapped,
        isFirstForStep: !existing,
    };
};

/**
 * Get the current hint progress for a session + step.
 * Returns null if no hints have been requested for this step yet.
 *
 * @param {number} sessionId
 * @param {number} stepOrder
 * @returns {Promise<Object|null>}
 */
const getStepProgress = async (sessionId, stepOrder) => {
    const result = await pool.query(
        `SELECT progress_id, hint_count, current_level, first_hint_at, last_hint_at
         FROM user_hint_progress
         WHERE session_id = $1
           AND step_order  = $2`,
        [sessionId, stepOrder]
    );
    return result.rows[0] || null;
};

/**
 * Get all step progress rows for a session.
 * Used by hintController to build the hintsRemainingPerStep response.
 *
 * @param {number} sessionId
 * @returns {Promise<Array>}
 */
const getAllStepProgress = async (sessionId) => {
    const result = await pool.query(
        `SELECT step_order, hint_count, current_level
         FROM user_hint_progress
         WHERE session_id = $1
         ORDER BY step_order ASC`,
        [sessionId]
    );
    return result.rows;
};

/**
 * Upsert the user_hint_progress row for a session + step.
 * On first insert: sets first_hint_at.
 * On update: increments count, updates level and last_hint_at.
 *
 * @param {Object} params
 */
const upsertStepProgress = async ({
    sessionId,
    scenarioId,
    stepOrder,
    newLevel,
    newCount,
    isFirst,
}) => {
    await pool.query(
        `INSERT INTO user_hint_progress (
            session_id,
            scenario_id,
            step_order,
            hint_count,
            current_level,
            first_hint_at,
            last_hint_at
        ) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT (session_id, step_order) DO UPDATE SET
            hint_count    = EXCLUDED.hint_count,
            current_level = EXCLUDED.current_level,
            last_hint_at  = CURRENT_TIMESTAMP`,
        [sessionId, scenarioId, stepOrder, newCount, newLevel]
    );
};

// =============================================================================
// HINT LEVEL METADATA
// =============================================================================

/**
 * Get the human-readable description and prompt modifier for a hint level.
 * Used by hintService to adjust prompt tone per level.
 *
 * @param {number} level - 1, 2, or 3
 * @returns {{
 *   label: string,
 *   promptInstruction: string,
 *   strengthDescription: string
 * }}
 */
const getHintLevelMeta = (level) => {
    const levels = {
        1: {
            label: 'Level 1 — Vague',
            promptInstruction:
                'Be intentionally vague. Point the investigator toward the general ' +
                'category of action needed (e.g. "examining records", "looking at ' +
                'system files") without naming any specific command, tool, flag, or path. ' +
                'This is the gentlest possible nudge.',
            strengthDescription: 'vague directional guidance',
        },
        2: {
            label: 'Level 2 — Directional',
            promptInstruction:
                'Be more specific than before. You may reference the type of command ' +
                'needed (e.g. "a command that reads file contents", "a search tool") ' +
                'and the general area to look (e.g. "the logs directory") without ' +
                'giving the exact command string or full file path.',
            strengthDescription: 'directional hint naming action type and general area',
        },
        3: {
            label: 'Level 3 — Explicit',
            promptInstruction:
                'This is the most explicit hint allowed. You may name the specific ' +
                'directory or file category involved, and describe the exact type of ' +
                'action clearly. You MUST NOT write the exact command string, exact ' +
                'flags, or the full absolute file path. The investigator should need ' +
                'only one more logical step to reach the answer themselves.',
            strengthDescription: 'explicit hint — names location and action, withholds exact syntax',
        },
    };

    return levels[level] || levels[1];
};

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = {
    resolveNextHintLevel,
    getStepProgress,
    getAllStepProgress,
    getHintLevelMeta,
    MAX_HINT_LEVEL,
};