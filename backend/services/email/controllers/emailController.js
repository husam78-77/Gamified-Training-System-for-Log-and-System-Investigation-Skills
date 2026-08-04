/**
 * emailController.js
 * Serves the player's incident emails.
 *
 * Routes served:
 *   GET /api/email → getEmails
 */

const { buildEmails } = require('../emailEngine');
const response = require('../../../utils/responseHelper');
const MESSAGES = require('../../../constants/messages');

/**
 * GET /api/email?incidentId=...
 * Returns the sorted email list for the given incident. incidentId comes
 * from the frontend's Investigation Context (GET /api/investigation/current).
 */
const getEmails = async (req, res) => {
    try {
        const { incidentId } = req.query;

        if (!incidentId) {
            return response.error(res, 400, MESSAGES.INVALID_INPUT);
        }

        const emails = await buildEmails(incidentId);

        return response.success(res, 200, MESSAGES.EMAILS_FETCHED, emails);
    } catch (err) {
        console.error('getEmails error:', err);
        return response.error(res, 500, MESSAGES.SERVER_ERROR);
    }
};

module.exports = {
    getEmails,
};
