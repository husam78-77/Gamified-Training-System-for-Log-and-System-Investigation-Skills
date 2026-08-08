/**
 * appAccents.js
 * Maps an application id to its HUD accent color. Purely cosmetic — used to
 * tint an app's icon glow, running-dot, and taskbar indicator so each app
 * reads as a distinct "signal" without abandoning the shared cyan theme.
 * Same pattern as appIcons.js: add an entry here when a new app needs a
 * non-default accent, everything else falls back to the house cyan.
 */
const APP_ACCENTS = {
    alerts: '#FF3B5C',
    aria: '#B983FF',
};

const DEFAULT_ACCENT = '#00FFFF';

/**
 * @param {string} appId
 * @returns {string} hex accent color for the given app id
 */
export const getAppAccent = (appId) => APP_ACCENTS[appId] || DEFAULT_ACCENT;
