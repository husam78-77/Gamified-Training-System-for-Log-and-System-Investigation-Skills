/**
 * emailEngine.js
 * Public API for the Email module — orchestrates the underlying builder
 * services without containing any business logic of its own.
 */

const emailBuilder = require('./emailBuilder');

/**
 * Build the sorted list of emails for an incident.
 * @param {string} incidentId
 * @returns {Promise<Array>} emails from emailBuilder.buildEmailsList
 */
const buildEmails = async (incidentId) => {
    return emailBuilder.buildEmailsList(incidentId);
};

module.exports = {
    buildEmails,
};
