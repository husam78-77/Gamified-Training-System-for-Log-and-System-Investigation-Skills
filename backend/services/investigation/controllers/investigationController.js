/**
 * investigationController.js
 * Serves the player's current investigation (session + scenario + incident)
 * so the frontend can load it once and share it across every application.
 *
 * Routes served:
 *   GET /api/investigation/current      → getCurrent
 *   GET /api/investigation/report       → getReport
 *   PUT /api/investigation/report       → saveReport
 */

const { getCurrentInvestigation } = require('../investigationEngine');
const reportEngine = require('../reportEngine');
const eventEngine = require('../eventEngine');
const submissionEngine = require('../submissionEngine');
const reviewEngine = require('../reviewEngine');
const sessionModel = require('../../../models/sessionModel');
const response = require('../../../utils/responseHelper');
const MESSAGES = require('../../../constants/messages');

/**
 * GET /api/investigation/current
 * Returns the authenticated user's active session, scenario, and incident.
 */
const getCurrent = async (req, res) => {
    try {
        const userId = req.user.user_id;

        const investigation = await getCurrentInvestigation(userId);

        if (!investigation) {
            return response.error(res, 404, MESSAGES.INVESTIGATION_NOT_FOUND);
        }

        return response.success(res, 200, MESSAGES.INVESTIGATION_FETCHED, investigation);
    } catch (err) {
        console.error('getCurrentInvestigation error:', err);
        return response.error(res, 500, MESSAGES.SERVER_ERROR);
    }
};

/**
 * GET /api/investigation/report
 * Returns the player's Investigation Report — their saved content if
 * they've saved before, otherwise the incident's starter template.
 */
const getReport = async (req, res) => {
    try {
        const userId = req.user.user_id;
        const investigation = await getCurrentInvestigation(userId);

        if (!investigation) {
            return response.error(res, 404, MESSAGES.INVESTIGATION_NOT_FOUND);
        }

        const report = await reportEngine.getReport(investigation.sessionId, investigation.incidentId);
        return response.success(res, 200, MESSAGES.REPORT_FETCHED, report);
    } catch (err) {
        console.error('getReport error:', err);
        return response.error(res, 500, MESSAGES.SERVER_ERROR);
    }
};

/**
 * PUT /api/investigation/report
 * Body: { content }
 * Saves the player's Investigation Report content. May unlock the
 * INVESTIGATION_REPORT_COMPLETED discovery once the report is substantive.
 */
const saveReport = async (req, res) => {
    try {
        const userId = req.user.user_id;
        const { content } = req.body;

        if (typeof content !== 'string') {
            return response.error(res, 400, MESSAGES.INVALID_INPUT);
        }

        const investigation = await getCurrentInvestigation(userId);
        if (!investigation) {
            return response.error(res, 404, MESSAGES.INVESTIGATION_NOT_FOUND);
        }

        await eventEngine.logEvent(investigation.sessionId, eventEngine.EVENT_TYPES.REPORT_EDITED, {});

        const { report, unlockedDiscovery } = await reportEngine.saveReport({
            sessionId: investigation.sessionId,
            incidentId: investigation.incidentId,
            content,
        });

        return response.success(res, 200, MESSAGES.REPORT_SAVED, {
            content: report.content,
            updatedAt: report.updated_at,
            unlockedDiscovery,
        });
    } catch (err) {
        console.error('saveReport error:', err);
        return response.error(res, 500, MESSAGES.SERVER_ERROR);
    }
};

/**
 * POST /api/investigation/submit
 * Submits the player's active investigation: validates the report and
 * terminal history are present, freezes the session, awards XP/badges,
 * and runs the AI Review — returning the full result in one response.
 */
const submit = async (req, res) => {
    try {
        const userId = req.user.user_id;
        const investigation = await getCurrentInvestigation(userId);

        if (!investigation) {
            return response.error(res, 404, MESSAGES.INVESTIGATION_NOT_FOUND);
        }

        const result = await submissionEngine.submitInvestigation({
            sessionId: investigation.sessionId,
            userId,
        });

        return response.success(res, 200, MESSAGES.INVESTIGATION_SUBMITTED, result);
    } catch (err) {
        if (err instanceof submissionEngine.SubmissionError) {
            if (err.code === 'SESSION_NOT_FOUND') return response.error(res, 404, MESSAGES.SESSION_NOT_FOUND);
            if (err.code === 'SESSION_ALREADY_CLOSED') return response.error(res, 400, MESSAGES.SESSION_ALREADY_CLOSED);
            return response.error(res, 400, MESSAGES.SUBMISSION_INCOMPLETE);
        }
        console.error('submit error:', err);
        return response.error(res, 500, MESSAGES.SERVER_ERROR);
    }
};

/**
 * GET /api/investigation/review/:sessionId
 * Fetches a previously generated AI Review for a session the user owns.
 */
const getReview = async (req, res) => {
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

        const review = await reviewEngine.getReview(sessionId);
        if (!review) {
            return response.error(res, 404, MESSAGES.REVIEW_NOT_FOUND);
        }

        return response.success(res, 200, MESSAGES.REVIEW_FETCHED, review);
    } catch (err) {
        console.error('getReview error:', err);
        return response.error(res, 500, MESSAGES.SERVER_ERROR);
    }
};

/**
 * POST /api/investigation/event
 * Body: { eventType, eventData }
 * Generic Investigation Event logging endpoint (Phase 5) — any frontend
 * application can report a behavioural event (FILE_OPENED, EMAIL_OPENED,
 * ARTICLE_OPENED, APPLICATION_OPENED, ...) without a dedicated route per
 * app. Events carry no AI logic; this only persists raw data.
 */
const logEvent = async (req, res) => {
    try {
        const userId = req.user.user_id;
        const { eventType, eventData } = req.body;

        if (!eventType || typeof eventType !== 'string') {
            return response.error(res, 400, MESSAGES.INVALID_INPUT);
        }

        const investigation = await getCurrentInvestigation(userId);
        if (!investigation) {
            return response.error(res, 404, MESSAGES.INVESTIGATION_NOT_FOUND);
        }

        await eventEngine.logEvent(investigation.sessionId, eventType, eventData || {});

        return response.success(res, 200, MESSAGES.EVENT_LOGGED, {});
    } catch (err) {
        console.error('logEvent error:', err);
        return response.error(res, 500, MESSAGES.SERVER_ERROR);
    }
};

module.exports = {
    getCurrent,
    getReport,
    saveReport,
    submit,
    getReview,
    logEvent,
};
