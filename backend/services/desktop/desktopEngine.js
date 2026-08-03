/**
 * desktopEngine.js
 * Public API for the Desktop module — orchestrates the underlying builder
 * services without containing any business logic of its own.
 */

const desktopBuilder = require('./desktopBuilder');

/**
 * Build the full desktop workspace for an incident.
 * @param {string} incidentId
 * @returns {Promise<Object>} the desktop object from desktopBuilder.buildDesktop
 */
const buildDesktopWorkspace = async (incidentId) => {
    return desktopBuilder.buildDesktop(incidentId);
};

module.exports = {
    buildDesktopWorkspace,
};
