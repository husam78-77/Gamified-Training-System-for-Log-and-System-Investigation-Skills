/**
 * hintController.js
 * Handles AI hint requests during an active session.
 *
 * Routes served:
 *   POST /api/hints/request   → requestHint
 *   GET  /api/hints/:sessionId → getHintLog
 */

const hintModel = require('../models/hintModel');
const sessionModel = require('../models/sessionModel');
const scenarioModel = require('../models/scenarioModel');
const terminalModel = require('../models/terminalModel');
const hintService = require('../services/hintService');
const response = require('../utils/responseHelper');
const MESSAGES = require('../constants/messages');

// Max hints allowed per session to prevent abuse
const MAX_HINTS_PER_SESSION = 5;

/**
 * POST /api/hints/request
 * Generates a contextual AI hint for the user's current state.
 *
 * Body: { session_id }
 *
 * Flow:
 *  1. Validate session + ownership
 *  2. Check hint limit not exceeded
 *  3. Load command history + expected steps + previous hints
 *  4. Call hintService to generate hint
 *  5. Save hint to ai_hint_log
 *  6. Return hint text
 */
const requestHint = async (req, res) => {
    try {
        const userId = req.user.user_id;
        const { session_id } = req.body;

        if (!session_id) {
            return response.error(res, 400, MESSAGES.INVALID_INPUT);
        }

        const sessionId = parseInt(session_id, 10);

        // Validate session
        const session = await sessionModel.getSessionById(sessionId, userId);
        if (!session) {
            return response.error(res, 404, MESSAGES.SESSION_NOT_FOUND);
        }
        if (session.status !== 'in_progress') {
            return response.error(res, 400, MESSAGES.SESSION_ALREADY_CLOSED);
        }

        // Check hint limit
        const hintsUsed = await hintModel.countHintsUsed(sessionId);
        if (hintsUsed >= MAX_HINTS_PER_SESSION) {
            return response.error(res, 429, MESSAGES.HINT_LIMIT_REACHED);
        }

        // Load everything the hint engine needs
        const [commandHistory, expectedSteps, previousHintRows, scenario] = await Promise.all([
            terminalModel.getCommandHistory(sessionId),
            scenarioModel.getExpectedStepsByScenario(session.scenario_id),
            hintModel.getHintsBySession(sessionId),
            scenarioModel.getScenarioById(session.scenario_id),
        ]);

        const matchedHistory = await terminalModel.getMatchedCommands(sessionId);
        const completedStepOrders = matchedHistory.map(c => c.match_step_order);
        const previousHints = previousHintRows.map(h => h.hint_returned);

        // Generate hint
        const { prompt, hint, triggerCommands } = await hintService.generateHint({
            commandHistory,
            expectedSteps,
            completedStepOrders,
            previousHints,
            scenarioTitle: scenario.title,
            missionBrief: scenario.mission_brief,
        });

        // Save to log
        await hintModel.saveHint({
            sessionId,
            triggerCommands,
            promptSent: prompt,
            hintReturned: hint,
        });

        return response.success(res, 200, MESSAGES.HINT_GENERATED, {
            hint,
            hintsRemaining: MAX_HINTS_PER_SESSION - (hintsUsed + 1),
        });
    } catch (err) {
        console.error('requestHint error:', err);
        return response.error(res, 500, MESSAGES.SERVER_ERROR);
    }
};

/**
 * GET /api/hints/:sessionId
 * Returns all hints generated during a session.
 * Used to restore hint panel on page refresh.
 */
const getHintLog = async (req, res) => {
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

        const hints = await hintModel.getHintsBySession(sessionId);
        const hintsUsed = hints.length;

        return response.success(res, 200, MESSAGES.HINT_LOG_FETCHED, {
            hints,
            hintsRemaining: Math.max(0, MAX_HINTS_PER_SESSION - hintsUsed),
        });
    } catch (err) {
        console.error('getHintLog error:', err);
        return response.error(res, 500, MESSAGES.SERVER_ERROR);
    }
};

module.exports = {
    requestHint,
    getHintLog,
};