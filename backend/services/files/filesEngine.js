/**
 * filesEngine.js
 * Public API for the File Manager backend — exposes the exact same
 * virtualFiles the Terminal already reads from the Environment Engine.
 * No filesystem logic lives here; buildEnvironment() is the single source.
 *
 * When a sessionId is supplied, the player's saved Investigation Report
 * overlays the starter template — the same overlay Terminal applies — so
 * File Manager and Terminal always render identical content (dev rule #11).
 */

const { buildEnvironment } = require('../environment/environmentEngine');
const reportEngine = require('../investigation/reportEngine');

/**
 * Get the virtual filesystem for an incident.
 * @param {string} incidentId
 * @param {number} [sessionId] - when provided, overlays the session's saved report
 * @returns {Promise<Array>} virtualFiles
 */
const getFiles = async (incidentId, sessionId = null) => {
    const environment = await buildEnvironment(incidentId);

    if (sessionId) {
        await reportEngine.applyReportOverlay(environment.virtualFiles, environment.incident, sessionId);
    }

    return environment.virtualFiles;
};

module.exports = {
    getFiles,
};
