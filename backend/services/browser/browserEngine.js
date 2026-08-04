/**
 * browserEngine.js
 * Public API for the Browser module — orchestrates the underlying builder
 * service without containing any business logic of its own.
 */

const browserBuilder = require('./browserBuilder');

/**
 * Build the knowledge-base content (homePage + pages) for an incident.
 * @param {string} incidentId
 * @returns {Promise<{homePage: string, pages: Array}>} from browserBuilder.buildBrowserData
 */
const buildBrowser = async (incidentId) => {
    return browserBuilder.buildBrowserData(incidentId);
};

module.exports = {
    buildBrowser,
};
