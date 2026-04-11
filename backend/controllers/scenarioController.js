/**
 * scenarioController.js
 * Handles all scenario-related API requests.
 *
 * Routes served:
 *   GET /api/scenarios                     → getAllScenarios (MissionDashboard)
 *   GET /api/scenarios/type/:type          → getScenariosByType (MissionSequence)
 *   GET /api/scenarios/:scenarioId         → getScenarioById (MissionBriefing)
 *   GET /api/scenarios/:scenarioId/full    → getFullScenarioData (GamingEnvironment load)
 */

const scenarioModel = require('../models/scenarioModel');
const response = require('../utils/responseHelper');
const MESSAGES = require('../constants/messages');

/**
 * GET /api/scenarios
 * Returns all active scenarios grouped for the MissionDashboard.
 * Used to display type cards (brute force, script, etc.)
 */
const getAllScenarios = async (req, res) => {
    try {
        const scenarios = await scenarioModel.getAllScenarios();

        // Group by type for the dashboard
        const grouped = scenarios.reduce((acc, scenario) => {
            const type = scenario.type?.toLowerCase();
            if (!acc[type]) acc[type] = [];
            acc[type].push(scenario);
            return acc;
        }, {});

        return response.success(res, 200, MESSAGES.SCENARIOS_FETCHED, { grouped, total: scenarios.length });
    } catch (err) {
        console.error('getAllScenarios error:', err);
        return response.error(res, 500, MESSAGES.SERVER_ERROR);
    }
};

/**
 * GET /api/scenarios/type/:type
 * Returns all scenarios of a specific type for MissionSequence.
 * e.g. /api/scenarios/type/bruteforce
 */
const getScenariosByType = async (req, res) => {
    try {
        const { type } = req.params;

        if (!type) {
            return response.error(res, 400, MESSAGES.INVALID_INPUT);
        }

        const scenarios = await scenarioModel.getAllScenarios();
        const filtered = scenarios.filter(
            s => s.type?.toLowerCase() === type.toLowerCase()
        );

        if (filtered.length === 0) {
            return response.error(res, 404, MESSAGES.SCENARIO_NOT_FOUND);
        }

        // Sort by difficulty order: easy → medium → hard
        const difficultyOrder = { easy: 1, medium: 2, hard: 3 };
        filtered.sort((a, b) =>
            (difficultyOrder[a.difficulty?.toLowerCase()] || 99) -
            (difficultyOrder[b.difficulty?.toLowerCase()] || 99)
        );

        return response.success(res, 200, MESSAGES.SCENARIOS_FETCHED, { scenarios: filtered });
    } catch (err) {
        console.error('getScenariosByType error:', err);
        return response.error(res, 500, MESSAGES.SERVER_ERROR);
    }
};

/**
 * GET /api/scenarios/:scenarioId
 * Returns a single scenario's meta + objectives for MissionBriefing.
 */
const getScenarioById = async (req, res) => {
    try {
        const scenarioId = parseInt(req.params.scenarioId, 10);

        if (isNaN(scenarioId)) {
            return response.error(res, 400, MESSAGES.INVALID_INPUT);
        }

        const scenario = await scenarioModel.getScenarioById(scenarioId);

        if (!scenario) {
            return response.error(res, 404, MESSAGES.SCENARIO_NOT_FOUND);
        }

        // Get objectives (non-secret only for briefing display)
        const allObjectives = await scenarioModel.getObjectivesByScenario(scenarioId);
        const visibleObjectives = allObjectives.filter(o => !o.is_secret);

        return response.success(res, 200, MESSAGES.SCENARIO_FETCHED, {
            scenario,
            objectives: visibleObjectives,
        });
    } catch (err) {
        console.error('getScenarioById error:', err);
        return response.error(res, 500, MESSAGES.SERVER_ERROR);
    }
};

/**
 * GET /api/scenarios/:scenarioId/full
 * Returns everything needed to initialize GamingEnvironment:
 *   - scenario meta
 *   - virtual files (non-hidden ones only to start)
 *   - expected steps
 *   - all objectives (including secrets — frontend won't display them, engine needs them)
 *
 * Protected: requires valid JWT
 */
const getFullScenarioData = async (req, res) => {
    try {
        const scenarioId = parseInt(req.params.scenarioId, 10);

        if (isNaN(scenarioId)) {
            return response.error(res, 400, MESSAGES.INVALID_INPUT);
        }

        const scenario = await scenarioModel.getScenarioById(scenarioId);

        if (!scenario) {
            return response.error(res, 404, MESSAGES.SCENARIO_NOT_FOUND);
        }

        const [virtualFiles, expectedSteps, objectives] = await Promise.all([
            scenarioModel.getVirtualFilesByScenario(scenarioId),
            scenarioModel.getExpectedStepsByScenario(scenarioId),
            scenarioModel.getObjectivesByScenario(scenarioId),
        ]);

        // Only send initially visible files to the client
        // Hidden files are revealed by the terminal engine as steps complete
        const visibleFiles = virtualFiles.filter(f => !f.is_hidden);
        const hiddenFiles = virtualFiles.filter(f => f.is_hidden).map(f => ({
            virtual_file_id: f.virtual_file_id,
            reveal_at_step: f.reveal_at_step,
            // No content or path — hidden until revealed
        }));

        return response.success(res, 200, MESSAGES.SCENARIO_FETCHED, {
            scenario,
            virtualFiles: visibleFiles,
            hiddenFilesMeta: hiddenFiles,
            expectedSteps,
            objectives,
        });
    } catch (err) {
        console.error('getFullScenarioData error:', err);
        return response.error(res, 500, MESSAGES.SERVER_ERROR);
    }
};

module.exports = {
    getAllScenarios,
    getScenariosByType,
    getScenarioById,
    getFullScenarioData,
};