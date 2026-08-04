/**
 * filesEngine.js
 * Public API for the File Manager backend — exposes the exact same
 * virtualFiles the Terminal already reads from the Environment Engine.
 * No filesystem logic lives here; buildEnvironment() is the single source.
 */

const { buildEnvironment } = require('../environment/environmentEngine');

/**
 * Get the virtual filesystem for an incident.
 * @param {string} incidentId
 * @returns {Promise<Array>} virtualFiles, exactly as buildEnvironment() produces them
 */
const getFiles = async (incidentId) => {
    const environment = await buildEnvironment(incidentId);
    return environment.virtualFiles;
};

module.exports = {
    getFiles,
};
