/**
 * investigationController.js
 * Serves the player's current investigation (session + scenario + incident)
 * so the frontend can load it once and share it across every application.
 *
 * Routes served:
 *   GET /api/investigation/current → getCurrent
 */

const { getCurrentInvestigation } = require('../investigationEngine');
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

module.exports = {
    getCurrent,
};
