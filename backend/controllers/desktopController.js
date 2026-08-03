/**
 * desktopController.js
 * Serves the desktop workspace (wallpaper, applications, notifications,
 * window-manager state) for the player's active incident.
 *
 * Routes served:
 *   GET /api/desktop → getDesktop
 */

const { buildDesktopWorkspace } = require('../services/desktop/desktopEngine');
const response = require('../utils/responseHelper');
const MESSAGES = require('../constants/messages');

/**
 * GET /api/desktop
 * Returns the full desktop workspace for the player's current incident.
 *
 * incidentId is temporarily hardcoded — once sessions carry an incident
 * reference, resolve it from req.user → session → incidentId instead.
 */
const getDesktop = async (req, res) => {
    try {
        const incidentId = "ssh_bruteforce";

        const desktop = await buildDesktopWorkspace(incidentId);

        return response.success(res, 200, MESSAGES.DESKTOP_FETCHED, desktop);
    } catch (err) {
        console.error('getDesktop error:', err);
        return response.error(res, 500, MESSAGES.SERVER_ERROR);
    }
};

module.exports = {
    getDesktop,
};
