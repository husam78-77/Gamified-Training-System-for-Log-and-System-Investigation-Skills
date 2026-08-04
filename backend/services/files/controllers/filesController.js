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
 * GET /api/files?incidentId=...
 * Returns the virtual filesystem for the given incident. incidentId comes
 * from the frontend's Investigation Context (GET /api/investigation/current).
 */
const getFilesHandler = async (req, res) => {
    try {
        const { incidentId } = req.query;

        if (!incidentId) {
            return response.error(res, 400, MESSAGES.INVALID_INPUT);
        }

        const virtualFiles = await getFiles(incidentId);

        return response.success(res, 200, MESSAGES.FILES_FETCHED, virtualFiles);
    } catch (err) {
        console.error('getFiles error:', err);
        return response.error(res, 500, MESSAGES.SERVER_ERROR);
    }
};

module.exports = {
    getFiles: getFilesHandler,
};
