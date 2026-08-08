/**
 * investigationReportModel.js
 * Persistence for the player's editable Investigation Report (Phase 4).
 *
 * One row per session. The report's file PATH lives in the virtual
 * filesystem (template + incident evidence pack); this table only stores
 * the session-specific content that overlays it, since the environment
 * engine rebuilds virtualFiles fresh on every request and has nowhere
 * else to persist an edit.
 */

const pool = require('../config/db');

/**
 * @param {number} sessionId
 * @returns {Promise<{content: string, updated_at: Date}|null>}
 */
const getReport = async (sessionId) => {
    const result = await pool.query(
        `SELECT content, updated_at FROM investigation_reports WHERE session_id = $1`,
        [sessionId]
    );
    return result.rows[0] || null;
};

/**
 * Upsert the report content for a session.
 * @param {number} sessionId
 * @param {string} content
 */
const saveReport = async (sessionId, content) => {
    const result = await pool.query(
        `INSERT INTO investigation_reports (session_id, content, updated_at)
         VALUES ($1, $2, CURRENT_TIMESTAMP)
         ON CONFLICT (session_id)
         DO UPDATE SET content = EXCLUDED.content, updated_at = CURRENT_TIMESTAMP
         RETURNING *`,
        [sessionId, content]
    );
    return result.rows[0];
};

module.exports = {
    getReport,
    saveReport,
};
