const pool = require('../config/db');

/**
 * Save a generated AI hint to the log
 */
const saveHint = async ({ sessionId, triggerCommands, promptSent, hintReturned }) => {
    const result = await pool.query(
        `INSERT INTO ai_hint_log 
            (session_id, trigger_commands, prompt_sent, hint_returned, timestamp)
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
         RETURNING *`,
        [sessionId, triggerCommands, promptSent, hintReturned]
    );
    return result.rows[0];
};

/**
 * Get all hints generated during a session
 * Used to avoid repeating the same hint
 */
const getHintsBySession = async (sessionId) => {
    const result = await pool.query(
        `SELECT 
            hint_id,
            trigger_commands,
            hint_returned,
            timestamp
         FROM ai_hint_log
         WHERE session_id = $1
         ORDER BY timestamp ASC`,
        [sessionId]
    );
    return result.rows;
};

/**
 * Count hints used in a session
 * Used by scoring engine (more hints = lower score)
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

/**
 * Upsert user progress after mission completion
 * Updates highest_score if new score is better
 */
const upsertUserProgress = async ({ userId, scenarioId, score, completed }) => {
    const result = await pool.query(
        `INSERT INTO user_progress (user_id, scenario_id, highest_score, completed)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id, scenario_id) DO UPDATE SET
            highest_score = GREATEST(user_progress.highest_score, EXCLUDED.highest_score),
            completed = user_progress.completed OR EXCLUDED.completed
         RETURNING *`,
        [userId, scenarioId, score, completed]
    );
    return result.rows[0];
};

/**
 * Award XP and update user level after mission completion
 * Level threshold: every 1000 XP = +1 level
 */
const addXpToUser = async (userId, xpAmount) => {
    const result = await pool.query(
        `UPDATE users
         SET 
            xp = xp + $2,
            level = FLOOR((xp + $2) / 1000) + 1
         WHERE user_id = $1
         RETURNING user_id, username, xp, level`,
        [userId, xpAmount]
    );
    return result.rows[0] || null;
};

/**
 * Award a badge to a user for completing a scenario
 * Uses ON CONFLICT to prevent duplicate badges
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

module.exports = {
    saveHint,
    getHintsBySession,
    countHintsUsed,
    upsertUserProgress,
    addXpToUser,
    awardBadge,
};