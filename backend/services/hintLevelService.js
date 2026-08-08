/**
 * hintLevelService.js
 * Phase 7 — Per-Objective Hint Level Resolution
 *
 * Given a session + objective, determines what hint level the user should
 * receive next, enforces the level cap, and persists the result.
 *
 * Progress is now keyed by objective id (a string from objectives.json,
 * e.g. "identify_source") instead of an expected_steps.step_order integer.
 * The underlying column is still named step_order (see
 * database/hint_system_objective_keys.sql) — only its meaning changed, to
 * avoid a wide rename across the hint system's tables.
 *
 * HINT LEVEL DEFINITIONS:
 *   Level 1 → Vague directional guidance.
 *   Level 2 → Names the category of action, not the exact command.
 *   Level 3 → Most explicit hint allowed; still withholds exact syntax.
 *
 * LEVEL CAP: MAX_HINT_LEVEL = 3.
 */

const pool = require('../config/db');

const MAX_HINT_LEVEL = 3;

/**
 * Resolve the next hint level for a user on a specific objective.
 *
 * @param {Object} params
 * @param {number} params.sessionId
 * @param {number} params.scenarioId
 * @param {string} params.objectiveId - id of the objective the user is currently on
 *
 * @returns {Promise<{
 *   hintLevel: number,
 *   hintCount: number,
 *   stepLevelCapped: boolean,
 *   isFirstForStep: boolean,
 * }>}
 */
const resolveNextHintLevel = async ({ sessionId, scenarioId, objectiveId }) => {
    const existing = await getStepProgress(sessionId, objectiveId);

    const currentLevel = existing?.current_level ?? 0;
    const currentCount = existing?.hint_count ?? 0;

    const rawNextLevel = currentLevel + 1;
    const hintLevel = Math.min(rawNextLevel, MAX_HINT_LEVEL);
    const newCount = currentCount + 1;
    const stepLevelCapped = currentLevel >= MAX_HINT_LEVEL;

    await upsertStepProgress({
        sessionId,
        scenarioId,
        objectiveId,
        newLevel: hintLevel,
        newCount,
    });

    return {
        hintLevel,
        hintCount: newCount,
        stepLevelCapped,
        isFirstForStep: !existing,
    };
};

/**
 * Get the current hint progress for a session + objective.
 * @param {number} sessionId
 * @param {string} objectiveId
 * @returns {Promise<Object|null>}
 */
const getStepProgress = async (sessionId, objectiveId) => {
    const result = await pool.query(
        `SELECT progress_id, hint_count, current_level, first_hint_at, last_hint_at
         FROM user_hint_progress
         WHERE session_id = $1
           AND step_order  = $2`,
        [sessionId, objectiveId]
    );
    return result.rows[0] || null;
};

/**
 * Get all hint progress rows for a session.
 * @param {number} sessionId
 * @returns {Promise<Array>}
 */
const getAllStepProgress = async (sessionId) => {
    const result = await pool.query(
        `SELECT step_order AS objective_id, hint_count, current_level
         FROM user_hint_progress
         WHERE session_id = $1`,
        [sessionId]
    );
    return result.rows;
};

const upsertStepProgress = async ({ sessionId, scenarioId, objectiveId, newLevel, newCount }) => {
    await pool.query(
        `INSERT INTO user_hint_progress (
            session_id, scenario_id, step_order, hint_count, current_level, first_hint_at, last_hint_at
        ) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT (session_id, step_order) DO UPDATE SET
            hint_count    = EXCLUDED.hint_count,
            current_level = EXCLUDED.current_level,
            last_hint_at  = CURRENT_TIMESTAMP`,
        [sessionId, scenarioId, objectiveId, newCount, newLevel]
    );
};

module.exports = {
    resolveNextHintLevel,
    getStepProgress,
    getAllStepProgress,
    MAX_HINT_LEVEL,
};
