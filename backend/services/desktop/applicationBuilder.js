/**
 * applicationBuilder.js
 * Resolves which desktop applications are enabled for an incident by
 * cross-referencing the global application catalog with the incident's
 * desktop.json.
 *
 * Kept modular on purpose: resolveApplications() is the single seam that
 * will later grow to understand disabledApplications, pinnedApplications,
 * and custom icon overrides — loadApplicationCatalog()/loadDesktopConfig()
 * stay untouched when that happens.
 */

const fs = require('fs/promises');
const path = require('path');

const CONTENT_ROOT = path.join(__dirname, '..', '..', 'content');
const APPLICATIONS_PATH = path.join(CONTENT_ROOT, 'desktop', 'applications.json');
const INCIDENTS_DIR = path.join(CONTENT_ROOT, 'incidents');

const readJson = async (filePath) => {
    const raw = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(raw);
};

/**
 * Load the full application catalog (every application the desktop knows about).
 */
const loadApplicationCatalog = async () => {
    try {
        return await readJson(APPLICATIONS_PATH);
    } catch (err) {
        throw new Error(`Failed to load application catalog (${APPLICATIONS_PATH}): ${err.message}`);
    }
};

/**
 * Load an incident's desktop.json.
 * @param {string} incidentId - folder name under content/incidents/
 */
const loadDesktopConfig = async (incidentId) => {
    const desktopConfigPath = path.join(INCIDENTS_DIR, incidentId, 'desktop.json');
    try {
        return await readJson(desktopConfigPath);
    } catch (err) {
        throw new Error(`Failed to load desktop config for incident "${incidentId}" (${desktopConfigPath}): ${err.message}`);
    }
};

/**
 * Resolve an incident's enabled applications against the full catalog.
 * @param {Array} catalog - full application catalog
 * @param {Object} desktopConfig - parsed desktop.json
 * @returns {Array} application objects, in enabledApplications order
 */
const resolveApplications = (catalog, desktopConfig) => {
    const enabledIds = desktopConfig.enabledApplications || [];

    return enabledIds.map((id) => {
        const app = catalog.find((a) => a.id === id);
        if (!app) {
            throw new Error(`desktop.json references unknown application id "${id}"`);
        }
        return app;
    });
};

/**
 * Build the list of desktop applications enabled for an incident.
 * @param {string} incidentId
 * @returns {Promise<Array>}
 */
const buildApplications = async (incidentId) => {
    const [catalog, desktopConfig] = await Promise.all([
        loadApplicationCatalog(),
        loadDesktopConfig(incidentId),
    ]);

    return resolveApplications(catalog, desktopConfig);
};

module.exports = {
    buildApplications,
};
