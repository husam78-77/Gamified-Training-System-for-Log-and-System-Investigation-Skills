/**
 * filesController.js
 * Serves the virtual filesystem for the File Manager application.
 *
 * Routes served:
 *   GET /api/files → getFiles
 */

const { getFiles } = require('../filesEngine');
const response = require('../../../utils/responseHelper');
const MESSAGES = require('../../../constants/messages');

/**
 * GET /api/files?incidentId=...&sessionId=...
 * Returns the virtual filesystem for the given incident. incidentId and
 * sessionId come from the frontend's Investigation Context
 * (GET /api/investigation/current). sessionId is optional but required to
 * see live Investigation Report edits (falls back to the starter template
 * without it).
 */
const getFilesHandler = async (req, res) => {
    try {
        const { incidentId, sessionId } = req.query;

        if (!incidentId) {
            return response.error(res, 400, MESSAGES.INVALID_INPUT);
        }

        const virtualFiles = await getFiles(incidentId, sessionId ? parseInt(sessionId, 10) : null);

        return response.success(res, 200, MESSAGES.FILES_FETCHED, virtualFiles);
    } catch (err) {
        console.error('getFiles error:', err);
        return response.error(res, 500, MESSAGES.SERVER_ERROR);
    }
};

module.exports = {
    getFiles: getFilesHandler,
};
