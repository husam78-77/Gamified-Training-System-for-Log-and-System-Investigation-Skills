/**
 * environmentEngine.js
 * Main environment API — assembles the full runtime environment for a
 * scenario: incident definition + template metadata + template filesystem
 * with the incident's evidence pack applied on top.
 *
 * This is the single entry point (buildEnvironment) that callers should
 * use; loadIncident/loadTemplateMetadata stay internal, and the filesystem
 * loading/injection steps are delegated to environmentLoader and
 * evidenceInjector rather than reimplemented here.
 */

const fs = require('fs/promises');
const path = require('path');
const { loadTemplate } = require('./environmentLoader');
const { injectEvidence } = require('./evidenceInjector');

const CONTENT_ROOT = path.join(__dirname, '..', '..', 'content');
const INCIDENTS_DIR = path.join(CONTENT_ROOT, 'incidents');
const TEMPLATES_DIR = path.join(CONTENT_ROOT, 'templates');

const readJson = async (filePath) => {
    const raw = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(raw);
};

/**
 * Load an incident's incident.json.
 * @param {string} incidentId - folder name under content/incidents/
 */
const loadIncident = async (incidentId) => {
    const incidentPath = path.join(INCIDENTS_DIR, incidentId, 'incident.json');
    try {
        return await readJson(incidentPath);
    } catch (err) {
        throw new Error(`Failed to load incident "${incidentId}" (${incidentPath}): ${err.message}`);
    }
};

/**
 * Load an arbitrary JSON content file from an incident's folder
 * (discoveries.json, objectives.json, review.json, ...). Single, generic
 * entry point every content-driven engine should use instead of
 * re-implementing its own file read.
 * @param {string} incidentId
 * @param {string} fileName - e.g. 'discoveries.json'
 */
const loadIncidentContent = async (incidentId, fileName) => {
    const filePath = path.join(INCIDENTS_DIR, incidentId, fileName);
    try {
        return await readJson(filePath);
    } catch (err) {
        throw new Error(`Failed to load "${fileName}" for incident "${incidentId}" (${filePath}): ${err.message}`);
    }
};

/**
 * Load a template's metadata.json.
 * @param {string} templateName - folder name under content/templates/
 */
const loadTemplateMetadata = async (templateName) => {
    const metadataPath = path.join(TEMPLATES_DIR, templateName, 'metadata.json');
    try {
        return await readJson(metadataPath);
    } catch (err) {
        throw new Error(`Failed to load template metadata "${templateName}" (${metadataPath}): ${err.message}`);
    }
};

/**
 * Build the full runtime environment for a scenario: the incident
 * definition, its template's metadata, and the template filesystem with
 * the incident's evidence pack (replace/delete/create) applied.
 * @param {string} incidentId
 * @returns {Promise<{incident: object, template: object, virtualFiles: Array}>}
 */
const buildEnvironment = async (incidentId) => {
    const incident = await loadIncident(incidentId);
    const template = await loadTemplateMetadata(incident.template);

    const virtualFiles = await loadTemplate(incident.template);
    await injectEvidence(virtualFiles, incidentId);

    return { incident, template, virtualFiles };
};

module.exports = {
    buildEnvironment,
    loadIncidentContent,
};
