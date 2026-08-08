/**
 * investigationDiscoveryModel.js
 * Persistence for session-scoped discovery unlocks (Phase 2).
 *
 * Generic and incident-agnostic: rows are keyed by discovery_key (a string
 * defined in the incident's discoveries.json), never by a DB-owned content
 * row. Works identically for every future incident with zero schema changes.
 */

const pool = require('../config/db');

/**
 * @param {number} sessionId
 * @returns {Promise<string[]>} discovery_key values unlocked in this session
 */
const getUnlockedKeys = async (sessionId) => {
    const result = await pool.query(
        `SELECT discovery_key FROM investigation_discoveries WHERE session_id = $1`,
        [sessionId]
    );
    return result.rows.map(r => r.discovery_key);
};

/**
 * @param {number} sessionId
 * @returns {Promise<Array>} full rows, ordered by discovery time
 */
const getSessionDiscoveries = async (sessionId) => {
    const result = await pool.query(
        `SELECT discovery_key, triggered_by_command, discovered_at
         FROM investigation_discoveries
         WHERE session_id = $1
         ORDER BY discovered_at ASC`,
        [sessionId]
    );
    return result.rows;
};

/**
 * Record that a discovery was unlocked. Idempotent — safe to call more
 * than once for the same session+key.
 *
 * @param {Object} params
 * @param {number} params.sessionId
 * @param {string} params.discoveryKey
 * @param {string} [params.triggeredByCommand] - the raw command, or a source label (e.g. 'report_saved')
 * @returns {Object|null} saved row, or null if it already existed
 */
const saveDiscovery = async ({ sessionId, discoveryKey, triggeredByCommand = null }) => {
    const result = await pool.query(
        `INSERT INTO investigation_discoveries (session_id, discovery_key, triggered_by_command)
         VALUES ($1, $2, $3)
         ON CONFLICT (session_id, discovery_key) DO NOTHING
         RETURNING *`,
        [sessionId, discoveryKey, triggeredByCommand]
    );
    return result.rows[0] || null;
};

module.exports = {
    getUnlockedKeys,
    getSessionDiscoveries,
    saveDiscovery,
};
