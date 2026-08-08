/**
 * appAccents.js
 * Maps an application id to its HUD accent color. Purely cosmetic — used to
 * tint an app's icon glow, running-dot, window chrome, and taskbar indicator
 * so each app reads as a distinct "signal" without abandoning the shared
 * cyan theme. Add an entry here when a new app needs a non-default accent,
 * everything else falls back to the house cyan.
 */
const APP_ACCENTS = {
    terminal: '#00FFFF',
    email: '#4DA3FF',
    browser: '#3BE8B0',
    files: '#FFB347',
    alerts: '#FF3B5C',
    aria: '#B983FF',
    report: '#F5F07A',
};

const DEFAULT_ACCENT = '#00FFFF';

/**
 * @param {string} appId
 * @returns {string} hex accent color for the given app id
 */
export const getAppAccent = (appId) => APP_ACCENTS[appId] || DEFAULT_ACCENT;

/**
 * Same accent as an `r, g, b` triplet so CSS can build translucent shades
 * from it (`rgba(var(--accent-rgb), 0.15)`) instead of hardcoding a second
 * color per app.
 *
 * @param {string} appId
 * @returns {string} e.g. "0, 255, 255"
 */
export const getAppAccentRgb = (appId) => {
    const hex = getAppAccent(appId).replace('#', '');
    const value = parseInt(hex, 16);
    return `${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}`;
};
