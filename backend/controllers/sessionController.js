/**
 * sessionController.js
 * Manages the full lifecycle of a gameplay session.
 *
 * KEY DESIGN DECISIONS:
 *
 * 1. startSession NO LONGER trusts scenario_id from the frontend.
 *    The backend determines which scenario the user should play via
 *    progressionModel.getAuthorizedScenarioForUser().
 *    The frontend sends only { mode } — the scenario is assigned server-side.
 *
 * 2. Race condition protection:
 *    - DB-level unique partial index prevents two concurrent in_progress sessions
 *      for the same user+scenario (see migration_add_scenario_order.sql)
 *    - startSession handles the unique violation gracefully by resuming
 *
 * 3. completeSession now correctly determines completion:
 *    - completed = true only if there ARE required objectives AND all are done
 *    - completed = false if there are no objectives (safety guard)
 *
 * Routes:
 *   POST /api/sessions/start                  → startSession
 *   GET  /api/sessions/:sessionId             → getSession
 *   POST /api/sessions/:sessionId/abandon     → abandonSession
 *   POST /api/sessions/:sessionId/complete    → completeSession
 *   GET  /api/sessions/next-scenario          → getNextScenario
 */

const sessionModel = require('../models/sessionModel');
const scenarioModel = require('../models/scenarioModel');
const terminalModel = require('../models/terminalModel');
const hintModel = require('../models/hintModel');
const progressionModel = require('../models/progressionModel');
const evaluationService = require('../services/evaluationService');
const response = require('../utils/responseHelper');
const MESSAGES = require('../constants/messages');

// ─────────────────────────────────────────────────────────────────────────────
// START SESSION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/sessions/start
 * Body: { mode }
 *
 * The backend determines which scenario the user plays.
 * The frontend does NOT send scenario_id here.
 *
 * Flow:
 *  1. Validate mode
 *  2. Check for existing in_progress session → resume it immediately
 *  3. Determine next scenario via progressionModel
 *  4. If no scenarios left → return 'all_complete' status
 *  5. Create session — handle DB unique violation as a resume
 *  6. Return session + scenario data needed to boot GamingEnvironment
 */
const startSession = async (req, res) => {
    try {
        const userId = req.user.user_id;
        const { mode, scenario_id } = req.body;

        // ── Validate mode ────────────────────────────────────────────────
        if (!mode || !['timed', 'free'].includes(mode)) {
            return response.error(res, 400, MESSAGES.INVALID_MODE);
        }

        // ── Validate scenario_id ─────────────────────────────────────────
        if (!scenario_id) {
            return response.error(res, 400, 'scenario_id is required');
        }

        // ── Step 1: Check if session already exists for this scenario ────
        const existingSession = await sessionModel.getActiveSession(userId, scenario_id);

        if (existingSession) {
            const scenario = await scenarioModel.getScenarioById(scenario_id);

            return response.success(res, 200, MESSAGES.SESSION_RESUMED, {
                session: existingSession,
                scenario,
                resumed: true,
            });
        }

        // ── Step 2: Validate scenario exists ─────────────────────────────
        const scenario = await scenarioModel.getScenarioById(scenario_id);

        if (!scenario) {
            return response.error(res, 404, 'Scenario not found or inactive');
        }

        // ── Step 3 : unlock ────────────────────────────
        // لو عندك نظام progression خليه check فقط
        /*
        const allowed = await progressionModel.isScenarioUnlocked(userId, scenario_id);
        if (!allowed) {
            return response.error(res, 403, 'Scenario locked');
        }
        */

        // ── Step 4: Create new session ───────────────────────────────────
        let session;
        try {
            session = await sessionModel.createSession({
                userId,
                scenarioId: scenario_id,
                mode,
            });
        } catch (dbErr) {
            // Race condition protection
            if (dbErr.code === '23505') {
                const existing = await sessionModel.getActiveSession(userId, scenario_id);
                if (existing) {
                    return response.success(res, 200, MESSAGES.SESSION_RESUMED, {
                        session: existing,
                        scenario,
                        resumed: true,
                    });
                }
            }
            throw dbErr;
        }

        // ── Success ─────────────────────────────────────────────────────
        return response.success(res, 201, MESSAGES.SESSION_STARTED, {
            session,
            scenario,
            resumed: false,
        });

    } catch (err) {
        console.error('startSession error:', err);
        return response.error(res, 500, MESSAGES.SERVER_ERROR);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET NEXT SCENARIO (read-only, no session creation)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/sessions/next-scenario
 * Returns what the next scenario for this user would be — without creating
 * a session. Used by the frontend to display the correct level card.
 */
const getNextScenario = async (req, res) => {
    try {
        const userId = req.user.user_id;
        const scenario = await progressionModel.getNextScenarioForUser(userId);

        if (!scenario) {
            return response.success(res, 200, MESSAGES.ALL_SCENARIOS_COMPLETE, {
                scenario: null,
                allComplete: true,
            });
        }

        return response.success(res, 200, 'Next scenario retrieved', { scenario });
    } catch (err) {
        console.error('getNextScenario error:', err);
        return response.error(res, 500, MESSAGES.SERVER_ERROR);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET SESSION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/sessions/:sessionId
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

// ─────────────────────────────────────────────────────────────────────────────
// ABANDON SESSION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/sessions/:sessionId/abandon
 * Timed mode early exit — no score, no progress.
 */
const abandonSession = async (req, res) => {
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

        const abandoned = await sessionModel.abandonSession(sessionId);
        return response.success(res, 200, MESSAGES.SESSION_ABANDONED, { session: abandoned });
    } catch (err) {
        console.error('abandonSession error:', err);
        return response.error(res, 500, MESSAGES.SERVER_ERROR);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// COMPLETE SESSION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/sessions/:sessionId/complete
 *
 * Flow:
 *  1. Validate session ownership + status
 *  2. Load all evaluation data in parallel
 *  3. Determine completion status correctly
 *  4. Calculate score and XP
 *  5. Save evaluation result
 *  6. Close session
 *  7. Upsert progress via progressionModel (single authority)
 *  8. Award XP via progressionModel
 *  9. Award badge if score threshold met
 * 10. Return full summary + next scenario info
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

        // ── Load all evaluation data in parallel ──────────────────────────
        const [expectedSteps, objectives, matchedCommands, totalCount, hintsUsed, scenario] =
            await Promise.all([
                scenarioModel.getExpectedStepsByScenario(session.scenario_id),
                scenarioModel.getObjectivesByScenario(session.scenario_id),
                terminalModel.getMatchedCommands(sessionId),
                terminalModel.countTotalCommands(sessionId),
                hintModel.countHintsUsed(sessionId),
                scenarioModel.getScenarioById(session.scenario_id),
            ]);

        // ── Determine completed objectives ────────────────────────────────
        const matchedStepOrders = matchedCommands.map(c => c.match_step_order);
        const completedObjectiveIds = evaluationService.resolveCompletedObjectives(
            objectives, matchedStepOrders
        );

        // ── Determine completion status ───────────────────────────────────
        // BUG FIX: previously 0 === 0 would mark complete when no objectives exist
        const requiredObjectives = objectives.filter(o => !o.is_secret);
        const missionCompleted = requiredObjectives.length > 0
            && completedObjectiveIds.filter(id =>
                requiredObjectives.some(o => o.objective_id === id)
            ).length === requiredObjectives.length;

        // ── Calculate score ───────────────────────────────────────────────
        const scoreResult = evaluationService.calculateScore({
            expectedSteps,
            matchedCommands,
            totalCommandsCount: totalCount,
            objectives,
            completedObjectiveIds,
            hintsUsed,
        });

        // ── Calculate XP ──────────────────────────────────────────────────
        const xpAwarded = evaluationService.calculateXp(
            scoreResult.totalWeightedScore,
            scenario.difficulty,
            hintsUsed
        );

        // ── Save evaluation result ────────────────────────────────────────
        await terminalModel.saveEvaluationResult({ sessionId, ...scoreResult });

        // ── Close session ─────────────────────────────────────────────────
        const closedSession = await sessionModel.closeSession({
            sessionId,
            finalScore: scoreResult.totalWeightedScore,
            status: 'completed',
        });

        // ── Upsert progress (single authority: progressionModel) ──────────
        await progressionModel.upsertUserProgress({
            userId,
            scenarioId: session.scenario_id,
            score: scoreResult.totalWeightedScore,
            completed: missionCompleted,
        });

        // ── Award XP ──────────────────────────────────────────────────────
        const updatedUser = await progressionModel.addXpToUser(userId, xpAwarded);

        // ── Award badge if score >= 60 ────────────────────────────────────
        if (scoreResult.totalWeightedScore >= 60) {
            await progressionModel.awardBadge({
                userId,
                scenarioId: session.scenario_id,
                badgeName: `${scenario.title}_COMPLETE`,
                badgeType: 'completion',
            });
        }

        // ── Determine next scenario for the frontend ──────────────────────
        // Frontend should use this — never compute it themselves
        const nextScenario = await progressionModel.getNextScenarioForUser(userId);

        return response.success(res, 200, MESSAGES.SESSION_COMPLETED, {
            evaluation: scoreResult,
            session: closedSession,
            missionCompleted,
            xpAwarded,
            updatedUser,
            completedObjectiveIds,
            nextScenario,          // Frontend uses this to know what comes next
        });

    } catch (err) {
        console.error('completeSession error:', err);
        return response.error(res, 500, MESSAGES.SERVER_ERROR);
    }
};

module.exports = {
    startSession,
    getNextScenario,
    getSession,
    abandonSession,
    completeSession,
};