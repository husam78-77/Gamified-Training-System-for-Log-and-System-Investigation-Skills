/**
 * discoveryModel.js
 * All database queries for the discovery-based progression system.
 *
 * Discoveries are evidence milestones a player unlocks during investigation.
 * Each discovery can be triggered by multiple different commands, allowing
 * flexible forensic investigation paths rather than a single fixed route.
 */

const pool = require('../config/db');

/**
 * Get all discoveries for a scenario, each with its embedded triggers.
 * Returns them ordered by discovery_order ASC.
 *
 * Triggers are aggregated into a JSON array per discovery so the
 * discovery service can check them without additional queries.
 *
 * @param {number} scenarioId
 * @returns {Array} discovery rows, each with a `triggers` array
 */
const getDiscoveriesWithTriggers = async (scenarioId) => {
    const result = await pool.query(
        `SELECT
             sd.discovery_id,
             sd.scenario_id,
             sd.discovery_key,
             sd.title,
             sd.description,
             sd.evidence_tags,
             sd.weight_percent,
             sd.discovery_order,
             sd.is_critical,
             sd.maps_to_step_order,
             sd.reveal_hint,
             COALESCE(
                 json_agg(
                     json_build_object(
                         'trigger_id',          dt.trigger_id,
                         'trigger_command',     dt.trigger_command,
                         'target_pattern',      dt.target_pattern,
                         'match_type',          dt.match_type,
                         'name_filter_pattern', dt.name_filter_pattern
                     )
                     ORDER BY dt.trigger_id ASC
                 ) FILTER (WHERE dt.trigger_id IS NOT NULL),
                 '[]'
             ) AS triggers
         FROM scenario_discoveries sd
         LEFT JOIN discovery_triggers dt ON dt.discovery_id = sd.discovery_id
         WHERE sd.scenario_id = $1
         GROUP BY sd.discovery_id
         ORDER BY sd.discovery_order ASC`,
        [scenarioId]
    );
    return result.rows;
};

/**
 * Get the discovery_id values already unlocked in a session.
 * Used to skip re-evaluating discoveries the player already found.
 *
 * @param {number} sessionId
 * @returns {number[]} array of discovery_id integers
 */
const getSessionDiscoveryIds = async (sessionId) => {
    const result = await pool.query(
        `SELECT discovery_id
         FROM session_discoveries
         WHERE session_id = $1`,
        [sessionId]
    );
    return result.rows.map(r => r.discovery_id);
};

/**
 * Get full session_discoveries rows for a session.
 * Used in completion evaluation and scoring.
 *
 * @param {number} sessionId
 * @returns {Array} session_discoveries rows
 */
const getSessionDiscoveries = async (sessionId) => {
    const result = await pool.query(
        `SELECT
             sd.session_discovery_id,
             sd.session_id,
             sd.discovery_id,
             sd.discovery_key,
             sd.triggered_by_command,
             sd.discovered_at,
             disc.title,
             disc.is_critical,
             disc.weight_percent,
             disc.maps_to_step_order,
             disc.evidence_tags
         FROM session_discoveries sd
         JOIN scenario_discoveries disc ON disc.discovery_id = sd.discovery_id
         WHERE sd.session_id = $1
         ORDER BY sd.discovered_at ASC`,
        [sessionId]
    );
    return result.rows;
};

/**
 * Record that a discovery was unlocked in a session.
 * ON CONFLICT DO NOTHING guarantees idempotency — safe to call multiple times.
 *
 * @param {Object} params
 * @param {number} params.sessionId
 * @param {number} params.discoveryId
 * @param {string} params.discoveryKey
 * @param {string} params.triggeredByCommand   raw command string
 * @returns {Object|null} saved row or null if already existed
 */
const saveDiscovery = async ({ sessionId, discoveryId, discoveryKey, triggeredByCommand }) => {
    const result = await pool.query(
        `INSERT INTO session_discoveries
             (session_id, discovery_id, discovery_key, triggered_by_command)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (session_id, discovery_id) DO NOTHING
         RETURNING *`,
        [sessionId, discoveryId, discoveryKey, triggeredByCommand]
    );
    return result.rows[0] || null;
};

module.exports = {
    getDiscoveriesWithTriggers,
    getSessionDiscoveryIds,
    getSessionDiscoveries,
    saveDiscovery,
};
