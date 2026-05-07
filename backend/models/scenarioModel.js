/**
 * scenarioModel.js
 * All scenario data queries.
 * Uses scenario_order (not created_at) for consistent ordering.
 */

const pool = require('../config/db');

/**
 * Get all active scenarios ordered by scenario_order.
 * scenario_order is the authoritative progression sequence.
 */
const getAllScenarios = async () => {
    const result = await pool.query(
        `SELECT
             scenario_id,
             title,
             type,
             difficulty,
             mission_brief,
             is_active,
             scenario_order,
             created_at
         FROM scenarios
         WHERE is_active = TRUE
         ORDER BY scenario_order ASC`
    );
    return result.rows;
};

/**
 * Get a single scenario by ID.
 */
const getScenarioById = async (scenarioId) => {
    const result = await pool.query(
        `SELECT
             scenario_id,
             title,
             type,
             difficulty,
             mission_brief,
             is_active,
             scenario_order,
             created_at
         FROM scenarios
         WHERE scenario_id = $1 AND is_active = TRUE`,
        [scenarioId]
    );
    return result.rows[0] || null;
};

/**
 * Get all scenarios of a specific type, ordered by scenario_order.
 * Used by MissionSequence page.
 */
const getScenariosByType = async (type) => {
    const result = await pool.query(
        `SELECT
             scenario_id,
             title,
             type,
             difficulty,
             mission_brief,
             is_active,
             scenario_order,
             created_at
         FROM scenarios
         WHERE is_active = TRUE
           AND LOWER(type) = LOWER($1)
         ORDER BY scenario_order ASC`,
        [type]
    );
    return result.rows;
};

/**
 * Get all virtual files for a scenario, including discovery-system columns.
 * evidence_tags and reveal_at_discovery_key power the new discovery-based
 * file revelation system; metadata provides realistic file attributes.
 */
const getVirtualFilesByScenario = async (scenarioId) => {
    const result = await pool.query(
        `SELECT
             virtual_file_id,
             scenario_id,
             file_name,
             file_path,
             content,
             file_type,
             is_hidden,
             reveal_at_step,
             evidence_tags,
             reveal_at_discovery_key,
             metadata
         FROM virtual_files
         WHERE scenario_id = $1
         ORDER BY file_path ASC`,
        [scenarioId]
    );
    return result.rows;
};

/**
 * Get all expected steps for a scenario, ordered by step_order.
 */
const getExpectedStepsByScenario = async (scenarioId) => {
    const result = await pool.query(
        `SELECT
             expected_step_id,
             scenario_id,
             step_order,
             command_expected,
             target_path,
             weight_percent,
             description
         FROM expected_steps
         WHERE scenario_id = $1
         ORDER BY step_order ASC`,
        [scenarioId]
    );
    return result.rows;
};

/**
 * Get objectives for a scenario.
 */
const getObjectivesByScenario = async (scenarioId) => {
    const result = await pool.query(
        `SELECT
             objective_id,
             scenario_id,
             title,
             description,
             is_secret,
             trigger_step,
             xp_reward,
             objective_order
         FROM objectives
         WHERE scenario_id = $1
         ORDER BY objective_order ASC`,
        [scenarioId]
    );
    return result.rows;
};

module.exports = {
    getAllScenarios,
    getScenarioById,
    getScenariosByType,
    getVirtualFilesByScenario,
    getExpectedStepsByScenario,
    getObjectivesByScenario,
};