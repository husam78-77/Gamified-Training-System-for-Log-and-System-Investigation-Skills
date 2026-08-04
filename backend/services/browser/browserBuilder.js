/**
 * browserBuilder.js
 * Loads and validates an incident's browser.json — a small, predefined set
 * of knowledge-base pages (menus and articles) for the in-desktop Browser.
 */

const fs = require('fs/promises');
const path = require('path');

const CONTENT_ROOT = path.join(__dirname, '..', '..', 'content');
const INCIDENTS_DIR = path.join(CONTENT_ROOT, 'incidents');

const readJson = async (filePath) => {
    const raw = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(raw);
};

/**
 * Load an incident's browser.json.
 * @param {string} incidentId - folder name under content/incidents/
 */
const loadBrowserConfig = async (incidentId) => {
    const browserPath = path.join(INCIDENTS_DIR, incidentId, 'browser.json');
    try {
        return await readJson(browserPath);
    } catch (err) {
        throw new Error(`Failed to load browser config for incident "${incidentId}" (${browserPath}): ${err.message}`);
    }
};

/**
 * Validate an incident's browser.json structure.
 * @param {Object} config - parsed browser.json
 * @param {string} incidentId
 * @returns {{homePage: string, pages: Array}}
 */
const validateBrowser = (config, incidentId) => {
    if (!config || typeof config.homePage !== 'string') {
        throw new Error(`browser.json for incident "${incidentId}" is missing "homePage"`);
    }
    if (!Array.isArray(config.pages)) {
        throw new Error(`browser.json for incident "${incidentId}" is missing a "pages" array`);
    }

    const pageIds = new Set();

    config.pages.forEach((page, index) => {
        ['id', 'title', 'type'].forEach((field) => {
            if (page[field] === undefined || page[field] === null) {
                throw new Error(`browser.json for incident "${incidentId}" is missing field "${field}" on page at index ${index}`);
            }
        });

        if (page.type === 'menu' && !Array.isArray(page.items)) {
            throw new Error(`browser.json for incident "${incidentId}" page "${page.id}" is type "menu" but has no "items" array`);
        }
        if (page.type === 'article' && typeof page.content !== 'string') {
            throw new Error(`browser.json for incident "${incidentId}" page "${page.id}" is type "article" but has no "content" string`);
        }

        pageIds.add(page.id);
    });

    if (!pageIds.has(config.homePage)) {
        throw new Error(`browser.json for incident "${incidentId}" homePage "${config.homePage}" does not match any page id`);
    }

    return { homePage: config.homePage, pages: config.pages };
};

/**
 * Load and validate an incident's browser content.
 * @param {string} incidentId
 * @returns {Promise<{homePage: string, pages: Array}>}
 */
const buildBrowserData = async (incidentId) => {
    const config = await loadBrowserConfig(incidentId);
    return validateBrowser(config, incidentId);
};

module.exports = {
    buildBrowserData,
};
