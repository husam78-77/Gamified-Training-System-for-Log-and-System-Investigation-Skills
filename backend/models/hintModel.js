/**
 * hintModel.js
 * Phase 3 — saveHint() now accepts and stores cache_hit flag
 *
 * CHANGES FROM PHASE 2:
 *   1. saveHint() accepts cacheHit parameter
 *   2. Stores cacheHit into ai_hint_log.cache_hit column
 *      (column added by phase3_hint_cache.sql migration)
 *   3. All other functions are identical to Phase 2
 *
 * Path: backend/models/hintModel.js
 */

const pool = require('../config/db');

// =============================================================================
// HINT LOG
// =============================================================================

/**
 * Save a generated AI hint to the log.
 *
 * @param {Object}  params
 * @param {number}  params.sessionId
 * @param {string}  params.triggerCommands
 * @param {string}  params.promptSent
 * @param {string}  params.hintReturned
 * @param {number}  [params.scenarioId]
 * @param {number}  [params.stepOrder]
 * @param {number}  [params.hintLevel=1]
 * @param {Object}  [params.playerState]
 * @param {boolean} [params.cacheHit=false]
 */
const saveHint = async ({
    sessionId,
    triggerCommands,
    promptSent,
    hintReturned,
    scenarioId = null,
    stepOrder = null,
    hintLevel = 1,
    playerState = null,
    cacheHit = false,   // Phase 3
}) => {
    const result = await pool.query(
        `INSERT INTO ai_hint_log (
            session_id,
            trigger_commands,
            prompt_sent,
            hint_returned,
            timestamp,
            scenario_id,
            step_order,
            hint_level,
            stuck_score,
            behavior_type,
            wrong_cmd_count,
            is_repeating,
            is_close,
            cache_hit
        ) VALUES (
            $1, $2, $3, $4,
            CURRENT_TIMESTAMP,
            $5, $6, $7, $8, $9, $10, $11, $12, $13
        )
        RETURNING *`,
        [
            sessionId,
            triggerCommands,
            promptSent,
            hintReturned,
            scenarioId,
            stepOrder,
            hintLevel,
            playerState?.stuckScore ?? null,
            playerState?.behaviorType ?? null,
            playerState?.wrongCommandCount ?? null,
            playerState?.isRepeating ?? null,
            playerState?.isClose ?? null,
            cacheHit,
        ]
    );
    return result.rows[0];
};

/**
 * Get all hints for a session. Unchanged.
 */
const getHintsBySession = async (sessionId) => {
    const result = await pool.query(
        `SELECT
            hint_id,
            trigger_commands,
            hint_returned,
            timestamp,
            step_order,
            hint_level,
            stuck_score,
            behavior_type,
            cache_hit
         FROM ai_hint_log
         WHERE session_id = $1
         ORDER BY timestamp ASC`,
        [sessionId]
    );
    return result.rows;
};

/**
 * Get hints for a specific session + step. Unchanged from Phase 2.
 */
const getHintsBySessionAndStep = async (sessionId, stepOrder) => {
    const result = await pool.query(
        `SELECT
            hint_id,
            hint_returned,
            hint_level,
            timestamp,
            cache_hit
         FROM ai_hint_log
         WHERE session_id = $1
           AND step_order  = $2
         ORDER BY timestamp ASC`,
        [sessionId, stepOrder]
    );
    return result.rows;
};

/**
 * Count total hints used in a session. Unchanged.
 */
const countHintsUsed = async (sessionId) => {
    const result = await pool.query(
        `SELECT COUNT(*) AS total
         FROM ai_hint_log
         WHERE session_id = $1`,
        [sessionId]
    );
    return parseInt(result.rows[0].total, 10);
};

// =============================================================================
// SESSION PLAYER STATE — Unchanged from Phase 1
// =============================================================================

const upsertSessionPlayerState = async ({ sessionId, scenarioId, playerState, hintsUsed }) => {
    const result = await pool.query(
        `INSERT INTO session_player_state (
            session_id,
            scenario_id,
            total_hints_used,
            total_wrong_cmds,
            max_stuck_score,
            dominant_behavior,
            first_hint_at,
            last_hint_at,
            updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT (session_id) DO UPDATE SET
            total_hints_used  = EXCLUDED.total_hints_used,
            total_wrong_cmds  = EXCLUDED.total_wrong_cmds,
            max_stuck_score   = GREATEST(session_player_state.max_stuck_score, EXCLUDED.max_stuck_score),
            dominant_behavior = EXCLUDED.dominant_behavior,
            last_hint_at      = CURRENT_TIMESTAMP,
            updated_at        = CURRENT_TIMESTAMP
        RETURNING *`,
        [
            sessionId,
            scenarioId,
            hintsUsed,
            playerState.wrongCommandCount,
            playerState.stuckScore,
            playerState.behaviorType,
        ]
    );
    return result.rows[0];
};

// =============================================================================
// SCORING / REWARDS — Unchanged from original
// =============================================================================

const upsertUserProgress = async ({ userId, scenarioId, score, completed }) => {
    const result = await pool.query(
        `INSERT INTO user_progress (user_id, scenario_id, highest_score, completed)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id, scenario_id) DO UPDATE SET
            highest_score = GREATEST(user_progress.highest_score, EXCLUDED.highest_score),
            completed     = user_progress.completed OR EXCLUDED.completed
         RETURNING *`,
        [userId, scenarioId, score, completed]
    );
    return result.rows[0];
};

const addXpToUser = async (userId, xpAmount) => {
    const result = await pool.query(
        `UPDATE users
         SET
            xp    = xp + $2,
            level = FLOOR((xp + $2) / 1000) + 1
         WHERE user_id = $1
         RETURNING user_id, username, xp, level`,
        [userId, xpAmount]
    );
    return result.rows[0] || null;
};

const awardBadge = async ({ userId, scenarioId, badgeName, badgeType }) => {
    const result = await pool.query(
        `INSERT INTO badges (user_id, scenario_id, badge_name, badge_type, awarded_at)
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
         ON CONFLICT (user_id, scenario_id, badge_name) DO NOTHING
         RETURNING *`,
        [userId, scenarioId, badgeName, badgeType]
    );
    return result.rows[0] || null;
};

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = {
    saveHint,
    getHintsBySession,
    getHintsBySessionAndStep,
    countHintsUsed,
    upsertSessionPlayerState,
    upsertUserProgress,
    addXpToUser,
    awardBadge,
};