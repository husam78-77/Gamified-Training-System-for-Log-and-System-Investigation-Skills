/**
 * emailBuilder.js
 * Loads and validates an incident's emails.json, returning emails sorted
 * by their declared order.
 */

const fs = require('fs/promises');
const path = require('path');

const CONTENT_ROOT = path.join(__dirname, '..', '..', 'content');
const INCIDENTS_DIR = path.join(CONTENT_ROOT, 'incidents');

const REQUIRED_FIELDS = ['id', 'order', 'category', 'from', 'subject', 'timestamp', 'body'];

const readJson = async (filePath) => {
    const raw = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(raw);
};

/**
 * Load an incident's emails.json.
 * @param {string} incidentId - folder name under content/incidents/
 */
const loadEmailsConfig = async (incidentId) => {
    const emailsPath = path.join(INCIDENTS_DIR, incidentId, 'emails.json');
    try {
        return await readJson(emailsPath);
    } catch (err) {
        throw new Error(`Failed to load emails config for incident "${incidentId}" (${emailsPath}): ${err.message}`);
    }
};

/**
 * Validate an incident's emails.json structure.
 * @param {Object} config - parsed emails.json
 * @param {string} incidentId
 * @returns {Array} the raw emails array
 */
const validateEmails = (config, incidentId) => {
    if (!config || !Array.isArray(config.emails)) {
        throw new Error(`emails.json for incident "${incidentId}" is missing an "emails" array`);
    }

    config.emails.forEach((email, index) => {
        REQUIRED_FIELDS.forEach((field) => {
            if (email[field] === undefined || email[field] === null) {
                throw new Error(`emails.json for incident "${incidentId}" is missing field "${field}" on email at index ${index}`);
            }
        });
    });

    return config.emails;
};

/**
 * Load, validate, and sort an incident's emails.
 * @param {string} incidentId
 * @returns {Promise<Array>} emails sorted by order
 */
const buildEmailsList = async (incidentId) => {
    const config = await loadEmailsConfig(incidentId);
    const emails = validateEmails(config, incidentId);

    return [...emails].sort((a, b) => a.order - b.order);
};

module.exports = {
    buildEmailsList,
};
