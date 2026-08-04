/**
 * investigationEngine.js
 * Resolves "the current investigation" for a user: their active session,
 * the scenario it's running, and the incident content that scenario maps
 * to. This is the single place that assembles that bundle — every
 * controller that used to hardcode an incidentId reads it from here (or,
 * for the Desktop, from the frontend context this engine backs) instead.
 */

const sessionModel = require('../../models/sessionModel');
const scenarioModel = require('../../models/scenarioModel');
const { resolveIncidentId } = require('../environment/incidentResolver');

/**
 * @param {number} userId
 * @returns {Promise<{sessionId: number, scenarioId: number, incidentId: string, category: string, difficulty: string}|null>}
 *          null when the user has no in_progress session.
 */
const getCurrentInvestigation = async (userId) => {
    const session = await sessionModel.getActiveSessionForUser(userId);
    if (!session) return null;

    const scenario = await scenarioModel.getScenarioById(session.scenario_id);
    if (!scenario) return null;

    const incidentId = resolveIncidentId(scenario.type);

    return {
        sessionId: session.session_id,
        scenarioId: scenario.scenario_id,
        incidentId,
        category: scenario.type,
        difficulty: scenario.difficulty,
    };
};

module.exports = {
    getCurrentInvestigation,
};
