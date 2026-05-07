const pool = require('../config/db');

/**
 * Save a command entered by the user in the terminal.
 * match_type distinguishes how the step credit was earned:
 *   'direct'    = matched via exact/relative/bare step logic
 *   'discovery' = a discovery trigger fired and credited maps_to_step_order
 *   null        = unmatched command
 */
const saveCommand = async ({ sessionId, commandEntered, matchExpected, matchStepOrder, matchType = null }) => {
    const result = await pool.query(
        `INSERT INTO command_history
            (session_id, command_entered, match_expected, match_step_order, match_type, timestamp)
         VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
         RETURNING *`,
        [sessionId, commandEntered, matchExpected ?? false, matchStepOrder ?? null, matchType]
    );
    return result.rows[0];
};

/**
 * Get all commands for a session in chronological order
 * Used by the AI hint system and evaluation engine
 */
const getCommandHistory = async (sessionId) => {
    const result = await pool.query(
        `SELECT 
            command_id,
            command_entered,
            match_expected,
            match_step_order,
            timestamp
         FROM command_history
         WHERE session_id = $1
         ORDER BY timestamp ASC`,
        [sessionId]
    );
    return result.rows;
};

/**
 * Get only matched commands for a session
 * Used to determine current investigation progress
 */
const getMatchedCommands = async (sessionId) => {
    const result = await pool.query(
        `SELECT 
            command_id,
            command_entered,
            match_step_order,
            timestamp
         FROM command_history
         WHERE session_id = $1 AND match_expected = TRUE
         ORDER BY match_step_order ASC`,
        [sessionId]
    );
    return result.rows;
};

/**
 * Count total commands in a session (for scoring: command efficiency)
 */
const countTotalCommands = async (sessionId) => {
    const result = await pool.query(
        `SELECT COUNT(*) AS total
         FROM command_history
         WHERE session_id = $1`,
        [sessionId]
    );
    return parseInt(result.rows[0].total, 10);
};

/**
 * Save or update the evaluation result for a session
 * Called on mission completion
 */
const saveEvaluationResult = async ({
    sessionId,
    commandUsageScore,
    pathScore,
    conclusionScore,
    totalWeightedScore,
    partialCredit,
}) => {
    const result = await pool.query(
        `INSERT INTO evaluation_results 
            (session_id, command_usage_score, path_score, conclusion_score, total_weighted_score, partial_credit)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (session_id) DO UPDATE SET
            command_usage_score = EXCLUDED.command_usage_score,
            path_score = EXCLUDED.path_score,
            conclusion_score = EXCLUDED.conclusion_score,
            total_weighted_score = EXCLUDED.total_weighted_score,
            partial_credit = EXCLUDED.partial_credit
         RETURNING *`,
        [sessionId, commandUsageScore, pathScore, conclusionScore, totalWeightedScore, partialCredit]
    );
    return result.rows[0];
};

/**
 * Get the evaluation result for a completed session
 */
const getEvaluationResult = async (sessionId) => {
    const result = await pool.query(
        `SELECT * FROM evaluation_results WHERE session_id = $1`,
        [sessionId]
    );
    return result.rows[0] || null;
};

module.exports = {
    saveCommand,
    getCommandHistory,
    getMatchedCommands,
    countTotalCommands,
    saveEvaluationResult,
    getEvaluationResult,
};