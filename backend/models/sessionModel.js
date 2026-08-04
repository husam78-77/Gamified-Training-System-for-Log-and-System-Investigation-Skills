const pool = require('../config/db');

/**
 * Create a new session when player enters GamingEnvironment
 */
const createSession = async ({ userId, scenarioId, mode }) => {
    const result = await pool.query(
        `INSERT INTO sessions (user_id, scenario_id, mode, start_time, status)
         VALUES ($1, $2, $3, CURRENT_TIMESTAMP, 'in_progress')
         RETURNING *`,
        [userId, scenarioId, mode]
    );
    return result.rows[0];
};

/**
 * Get an active session by session ID (validates it belongs to the user)
 */
const getSessionById = async (sessionId, userId) => {
    const result = await pool.query(
        `SELECT * FROM sessions
         WHERE session_id = $1 AND user_id = $2`,
        [sessionId, userId]
    );
    return result.rows[0] || null;
};

/**
 * Get the most recent in_progress session for a user+scenario combo
 * Used to resume or detect duplicate sessions
 */
const getActiveSession = async (userId, scenarioId) => {
    const result = await pool.query(
        `SELECT * FROM sessions
         WHERE user_id = $1 AND scenario_id = $2 AND status = 'in_progress'
         ORDER BY start_time DESC
         LIMIT 1`,
        [userId, scenarioId]
    );
    return result.rows[0] || null;
};

/**
 * Get the most recent in_progress session for a user, regardless of scenario.
 * Used to resolve "the current investigation" for the Desktop.
 */
const getActiveSessionForUser = async (userId) => {
    const result = await pool.query(
        `SELECT * FROM sessions
         WHERE user_id = $1 AND status = 'in_progress'
         ORDER BY start_time DESC
         LIMIT 1`,
        [userId]
    );
    return result.rows[0] || null;
};

/**
 * Close a session — called on mission complete or forced exit
 * Sets end_time, final_score, and status
 */
const closeSession = async ({ sessionId, finalScore, status }) => {
    const result = await pool.query(
        `UPDATE sessions
         SET 
            end_time = CURRENT_TIMESTAMP,
            final_score = $2,
            status = $3
         WHERE session_id = $1
         RETURNING *`,
        [sessionId, finalScore, status]
    );
    return result.rows[0] || null;
};

/**
 * Discard a session on early exit in timed mode
 * Sets status to 'abandoned', no score saved
 */
const abandonSession = async (sessionId) => {
    const result = await pool.query(
        `UPDATE sessions
         SET 
            end_time = CURRENT_TIMESTAMP,
            status = 'abandoned'
         WHERE session_id = $1
         RETURNING *`,
        [sessionId]
    );
    return result.rows[0] || null;
};

module.exports = {
    createSession,
    getSessionById,
    getActiveSession,
    getActiveSessionForUser,
    closeSession,
    abandonSession,
};