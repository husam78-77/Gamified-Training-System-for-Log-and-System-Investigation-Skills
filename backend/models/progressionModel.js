/**
 * progressionModel.js
 * Single source of truth for user progression.
 *
 * This model owns:
 * - Reading user progress per scenario
 * - Determining the next scenario a user should play
 * - Upserting progress after completion
 * - XP and level updates
 * - Badge awards
 *
 * Previously these were split between hintModel and nowhere.
 * Everything progression-related lives here now.
 */

const pool = require('../config/db');

// ─────────────────────────────────────────────────────────────────────────────
// PROGRESSION QUERIES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get all user_progress rows for a user.
 * Returns a map of { scenario_id → progress_row } for O(1) lookup.
 */
const getUserProgressMap = async (userId) => {
    const result = await pool.query(
        `SELECT scenario_id, highest_score, completed
         FROM user_progress
         WHERE user_id = $1`,
        [userId]
    );

    const map = {};
    result.rows.forEach(row => {
        map[row.scenario_id] = row;
    });
    return map;
};

/**
 * Get progress for a single scenario.
 */
const getUserProgressForScenario = async (userId, scenarioId) => {
    const result = await pool.query(
        `SELECT * FROM user_progress
         WHERE user_id = $1 AND scenario_id = $2`,
        [userId, scenarioId]
    );
    return result.rows[0] || null;
};

/**
 * getNextScenarioForUser — THE single source of truth for progression.
 *
 * Algorithm:
 * 1. Load all active scenarios ordered by scenario_order ASC (deterministic)
 * 2. Load all completed scenario_ids for this user
 * 3. Walk the ordered list — return the first scenario the user has NOT completed
 * 4. If all completed → return null (user has finished all scenarios)
 *
 * This runs entirely in the DB — no frontend input influences the result.
 *
 * @param {number} userId
 * @returns {Object|null} scenario row or null if all done
 */
const getNextScenarioForUser = async (userId) => {
    const result = await pool.query(
        `SELECT s.*
         FROM scenarios s
         LEFT JOIN user_progress up
           ON up.scenario_id = s.scenario_id
           AND up.user_id = $1
           AND up.completed = TRUE
         WHERE s.is_active = TRUE
           AND up.scenario_id IS NULL
         ORDER BY s.scenario_order ASC
         LIMIT 1`,
        [userId]
    );

    return result.rows[0] || null;
};

/**
 * Check whether a user has completed a specific scenario.
 */
const hasUserCompletedScenario = async (userId, scenarioId) => {
    const result = await pool.query(
        `SELECT completed FROM user_progress
         WHERE user_id = $1 AND scenario_id = $2`,
        [userId, scenarioId]
    );
    return result.rows[0]?.completed === true;
};

/**
 * Get the scenario the user is ALLOWED to play right now.
 *
 * Rules:
 * 1. If user has an in_progress session → return that session's scenario
 *    (resume, don't create new)
 * 2. Otherwise → return getNextScenarioForUser result
 *
 * This is the gatekeeper called by startSession.
 *
 * @param {number} userId
 * @returns {{ scenario: Object, resumeSession: Object|null }}
 */
const getAuthorizedScenarioForUser = async (userId) => {
    // Check for any in_progress session first
    const activeSession = await pool.query(
        `SELECT s.*, sc.*
         FROM sessions s
         JOIN scenarios sc ON sc.scenario_id = s.scenario_id
         WHERE s.user_id = $1 AND s.status = 'in_progress'
         ORDER BY s.start_time DESC
         LIMIT 1`,
        [userId]
    );

    if (activeSession.rows.length > 0) {
        const row = activeSession.rows[0];
        return {
            resumeSession: {
                session_id: row.session_id,
                scenario_id: row.scenario_id,
                mode: row.mode,
                start_time: row.start_time,
                status: row.status,
                user_id: row.user_id,
            },
            scenario: null, // Not needed when resuming
        };
    }

    // No active session — get next scenario by progression
    const scenario = await getNextScenarioForUser(userId);
    return { resumeSession: null, scenario };
};

// ─────────────────────────────────────────────────────────────────────────────
// PROGRESS WRITES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Upsert user progress after mission completion.
 * - Never downgrades completed from true → false
 * - Always keeps the highest score
 *
 * @param {number} userId
 * @param {number} scenarioId
 * @param {number} score
 * @param {boolean} completed
 */
const upsertUserProgress = async ({ userId, scenarioId, score, completed }) => {
    const result = await pool.query(
        `INSERT INTO user_progress (user_id, scenario_id, highest_score, completed)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id, scenario_id) DO UPDATE SET
             highest_score = GREATEST(user_progress.highest_score, EXCLUDED.highest_score),
             -- Never downgrade completed: once true, always true
             completed = user_progress.completed OR EXCLUDED.completed
         RETURNING *`,
        [userId, scenarioId, score, completed]
    );
    return result.rows[0];
};

/**
 * Award XP to a user and recalculate level.
 * Uses a DB-level update to prevent race conditions with concurrent requests.
 * Level formula: every 1000 XP = 1 level.
 */
const addXpToUser = async (userId, xpAmount) => {
    if (!xpAmount || xpAmount <= 0) return null;

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

/**
 * Award a badge. ON CONFLICT DO NOTHING prevents duplicates.
 */
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

/**
 * Get a user's full progression overview.
 * Used by the dashboard to show completion state.
 */
const getUserProgressOverview = async (userId) => {
    const result = await pool.query(
        `SELECT
             s.scenario_id,
             s.title,
             s.type,
             s.difficulty,
             s.scenario_order,
             COALESCE(up.completed, FALSE)     AS completed,
             COALESCE(up.highest_score, 0)     AS highest_score
         FROM scenarios s
         LEFT JOIN user_progress up
           ON up.scenario_id = s.scenario_id
           AND up.user_id = $1
         WHERE s.is_active = TRUE
         ORDER BY s.scenario_order ASC`,
        [userId]
    );
    return result.rows;
};

module.exports = {
    getUserProgressMap,
    getUserProgressForScenario,
    getNextScenarioForUser,
    hasUserCompletedScenario,
    getAuthorizedScenarioForUser,
    upsertUserProgress,
    addXpToUser,
    awardBadge,
    getUserProgressOverview,
};