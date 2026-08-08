/**
 * investigationEventModel.js
 * Persistence for the generic Investigation Event log (Phase 5).
 *
 * Events are raw behavioural data — no AI logic, no scenario-specific
 * meaning. Any application (Terminal, Files, Browser, Email, ARIA, Desktop)
 * can log one; analytics and ARIA read them back, nothing writes AI
 * decisions into this table.
 */

const pool = require('../config/db');

/**
 * @param {Object} params
 * @param {number} params.sessionId
 * @param {string} params.eventType - e.g. 'FILE_OPENED', 'DISCOVERY_UNLOCKED'
 * @param {Object} [params.eventData]
 */
const logEvent = async ({ sessionId, eventType, eventData = {} }) => {
    const result = await pool.query(
        `INSERT INTO investigation_events (session_id, event_type, event_data)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [sessionId, eventType, JSON.stringify(eventData)]
    );
    return result.rows[0];
};

/**
 * @param {number} sessionId
 * @returns {Promise<Array>} events ordered oldest-first
 */
const getSessionEvents = async (sessionId) => {
    const result = await pool.query(
        `SELECT event_type, event_data, created_at
         FROM investigation_events
         WHERE session_id = $1
         ORDER BY created_at ASC`,
        [sessionId]
    );
    return result.rows;
};

module.exports = {
    logEvent,
    getSessionEvents,
};
