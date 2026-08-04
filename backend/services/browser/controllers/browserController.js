/**
 * browserController.js
 * Serves the incident's Knowledge Browser content.
 *
 * Routes served:
 *   GET /api/browser → getBrowser
 */

const { buildBrowser } = require('../browserEngine');
const response = require('../../../utils/responseHelper');
const MESSAGES = require('../../../constants/messages');

/**
 * GET /api/browser?incidentId=...
 * Returns the homePage id and full page list for the given incident.
 * incidentId comes from the frontend's Investigation Context
 * (GET /api/investigation/current).
 */
const getBrowser = async (req, res) => {
    try {
        const { incidentId } = req.query;

        if (!incidentId) {
            return response.error(res, 400, MESSAGES.INVALID_INPUT);
        }

        const browser = await buildBrowser(incidentId);

        return response.success(res, 200, MESSAGES.BROWSER_FETCHED, browser);
    } catch (err) {
        console.error('getBrowser error:', err);
        return response.error(res, 500, MESSAGES.SERVER_ERROR);
    }
};

module.exports = {
    getBrowser,
};
