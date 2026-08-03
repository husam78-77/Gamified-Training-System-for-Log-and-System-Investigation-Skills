/**
 * desktopBuilder.js
 * Assembles the full desktop environment for an incident: wallpaper,
 * enabled applications, notifications, and initial window-manager state.
 *
 * Kept modular on purpose: loadWallpaper()/buildNotifications()/buildState()
 * are separated so wallpaper overrides, real notifications, and widgets can
 * each be extended independently without touching buildDesktop() itself.
 */

const fs = require('fs/promises');
const path = require('path');
const { buildApplications } = require('./applicationBuilder');

const CONTENT_ROOT = path.join(__dirname, '..', '..', 'content');
const DESKTOP_CONFIG_PATH = path.join(CONTENT_ROOT, 'desktop', 'desktop.json');

const readJson = async (filePath) => {
    const raw = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(raw);
};

/**
 * Load the desktop's wallpaper from content/desktop/desktop.json.
 */
const loadWallpaper = async () => {
    try {
        const config = await readJson(DESKTOP_CONFIG_PATH);
        return config.wallpaper;
    } catch (err) {
        throw new Error(`Failed to load desktop config (${DESKTOP_CONFIG_PATH}): ${err.message}`);
    }
};

// No notification source exists yet — placeholder seam for later incidents.
const buildNotifications = () => [];

// Initial window-manager state; nothing open or focused yet.
const buildState = () => ({
    activeApplication: null,
    openedApplications: [],
    focusedApplication: null,
});

/**
 * Build the full desktop environment for an incident.
 * @param {string} incidentId
 * @returns {Promise<{wallpaper: string, applications: Array, notifications: Array, state: Object}>}
 */
const buildDesktop = async (incidentId) => {
    const [applications, wallpaper] = await Promise.all([
        buildApplications(incidentId),
        loadWallpaper(),
    ]);

    const notifications = buildNotifications();
    const state = buildState();

    return { wallpaper, applications, notifications, state };
};

module.exports = {
    buildDesktop,
};
