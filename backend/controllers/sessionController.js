/**
 * sessionController.js
 * Manages the lifecycle of a gameplay session.
 *
 * Routes served:
 *   POST   /api/sessions/start           → startSession
 *   GET    /api/sessions/:sessionId      → getSession
 *   POST   /api/sessions/:sessionId/abandon  → abandonSession
 *   POST   /api/sessions/:sessionId/complete → completeSession
 */

const sessionModel = require('../models/sessionModel');
const scenarioModel = require('../models/scenarioModel');
const terminalModel = require('../models/terminalModel');
const hintModel = require('../models/hintModel');
const evaluationService = require('../services/evaluationService');
const response = require('../utils/responseHelper');
const MESSAGES = require('../constants/messages');

/**
 * POST /api/sessions/start
 * Creates a new session when user enters GamingEnvironment.
 * Body: { scenario_id, mode }
 *
 * If an in-progress session already exists for this user+scenario,
 * returns that session instead of creating a duplicate.
 */
const startSession = async (req, res) => {
    try {
        const userId = req.user.user_id;
        const { scenario_id, mode } = req.body;

        if (!scenario_id || !mode) {
            return response.error(res, 400, MESSAGES.INVALID_INPUT);
        }

        if (!['timed', 'free'].includes(mode)) {
            return response.error(res, 400, MESSAGES.INVALID_MODE);
        }

        // Check scenario exists
        const scenario = await scenarioModel.getScenarioById(scenario_id);
        if (!scenario) {
            return response.error(res, 404, MESSAGES.SCENARIO_NOT_FOUND);
        }

        // Check for existing active session — resume it
        const existing = await sessionModel.getActiveSession(userId, scenario_id);
        if (existing) {
            return response.success(res, 200, MESSAGES.SESSION_RESUMED, { session: existing });
        }

        // Create new session
        const session = await sessionModel.createSession({ userId, scenarioId: scenario_id, mode });

        return response.success(res, 201, MESSAGES.SESSION_STARTED, { session });
    } catch (err) {
        console.error('startSession error:', err);
        return response.error(res, 500, MESSAGES.SERVER_ERROR);
    }
};

/**
 * GET /api/sessions/:sessionId
 * Returns session data for a given sessionId.
 * Validates the session belongs to the requesting user.
 */
const getSession = async (req, res) => {
    try {
        const userId = req.user.user_id;
        const sessionId = parseInt(req.params.sessionId, 10);

        if (isNaN(sessionId)) {
            return response.error(res, 400, MESSAGES.INVALID_INPUT);
        }

        const session = await sessionModel.getSessionById(sessionId, userId);

        if (!session) {
            return response.error(res, 404, MESSAGES.SESSION_NOT_FOUND);
        }

        return response.success(res, 200, MESSAGES.SESSION_FETCHED, { session });
    } catch (err) {
        console.error('getSession error:', err);
        return response.error(res, 500, MESSAGES.SERVER_ERROR);
    }
};

/**
 * POST /api/sessions/:sessionId/abandon
 * Called when user exits during Timed Mode.
 * Marks session as 'abandoned' — no score saved, no XP awarded.
 */
const abandonSession = async (req, res) => {
    try {
        const userId = req.user.user_id;
        const sessionId = parseInt(req.params.sessionId, 10);

        const session = await sessionModel.getSessionById(sessionId, userId);

        if (!session) {
            return response.error(res, 404, MESSAGES.SESSION_NOT_FOUND);
        }

        if (session.status !== 'in_progress') {
            return response.error(res, 400, MESSAGES.SESSION_ALREADY_CLOSED);
        }

        const abandoned = await sessionModel.abandonSession(sessionId);

        return response.success(res, 200, MESSAGES.SESSION_ABANDONED, { session: abandoned });
    } catch (err) {
        console.error('abandonSession error:', err);
        return response.error(res, 500, MESSAGES.SERVER_ERROR);
    }
};

/**
 * POST /api/sessions/:sessionId/complete
 * Called when user manually ends the mission or all objectives are done.
 *
 * Flow:
 *  1. Load session, scenario, commands, hints, objectives
 *  2. Run evaluation engine → calculate score
 *  3. Calculate XP
 *  4. Save evaluation result
 *  5. Close session with final score
 *  6. Upsert user_progress
 *  7. Award XP to user
 *  8. Return full evaluation summary
 */
const completeSession = async (req, res) => {
    try {
        const userId = req.user.user_id;
        const sessionId = parseInt(req.params.sessionId, 10);

        if (isNaN(sessionId)) {
            return response.error(res, 400, MESSAGES.INVALID_INPUT);
        }

        const session = await sessionModel.getSessionById(sessionId, userId);

        if (!session) {
            return response.error(res, 404, MESSAGES.SESSION_NOT_FOUND);
        }

        if (session.status !== 'in_progress') {
            return response.error(res, 400, MESSAGES.SESSION_ALREADY_CLOSED);
        }

        // Load all data needed for evaluation
        const [expectedSteps, objectives, matchedCommands, totalCount, hintsUsed] = await Promise.all([
            scenarioModel.getExpectedStepsByScenario(session.scenario_id),
            scenarioModel.getObjectivesByScenario(session.scenario_id),
            terminalModel.getMatchedCommands(sessionId),
            terminalModel.countTotalCommands(sessionId),
            hintModel.countHintsUsed(sessionId),
        ]);

        const scenario = await scenarioModel.getScenarioById(session.scenario_id);

        // Resolve which objectives are completed based on matched steps
        const matchedStepOrders = matchedCommands.map(c => c.match_step_order);
        const completedObjectiveIds = evaluationService.resolveCompletedObjectives(objectives, matchedStepOrders);

        // Calculate score
        const scoreResult = evaluationService.calculateScore({
            expectedSteps,
            matchedCommands,
            totalCommandsCount: totalCount,
            objectives,
            completedObjectiveIds,
            hintsUsed,
        });

        // Calculate XP
        const xpAwarded = evaluationService.calculateXp(
            scoreResult.totalWeightedScore,
            scenario.difficulty,
            hintsUsed
        );

        // Save evaluation result
        await terminalModel.saveEvaluationResult({ sessionId, ...scoreResult });

        // Close session
        const closedSession = await sessionModel.closeSession({
            sessionId,
            finalScore: scoreResult.totalWeightedScore,
            status: 'completed',
        });

        // Upsert progress
        await hintModel.upsertUserProgress({
            userId,
            scenarioId: session.scenario_id,
            score: scoreResult.totalWeightedScore,
            completed: completedObjectiveIds.length === objectives.filter(o => !o.is_secret).length,
        });

        // Award XP
        const updatedUser = await hintModel.addXpToUser(userId, xpAwarded);

        // Award completion badge if score >= 60
        if (scoreResult.totalWeightedScore >= 60) {
            await hintModel.awardBadge({
                userId,
                scenarioId: session.scenario_id,
                badgeName: `${scenario.title}_COMPLETE`,
                badgeType: 'completion',
            });
        }

        return response.success(res, 200, MESSAGES.SESSION_COMPLETED, {
            evaluation: scoreResult,
            session: closedSession,
            xpAwarded,
            updatedUser,
            completedObjectiveIds,
        });
    } catch (err) {
        console.error('completeSession error:', err);
        return response.error(res, 500, MESSAGES.SERVER_ERROR);
    }
};

module.exports = {
    startSession,
    getSession,
    abandonSession,
    completeSession,
};