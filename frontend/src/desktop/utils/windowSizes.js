/**
 * windowSizes.js
 * Maps an application id to its default window size class. Add new
 * entries here as new applications are introduced — Window never
 * hardcodes which size goes with which app (same pattern as appIcons.js).
 */
const WINDOW_SIZES = {
    terminal: 'large',
    files: 'large',
    browser: 'large',
    report: 'large',
    email: 'medium',
    aria: 'medium',
    alerts: 'medium',
};

/**
 * @param {string} appId
 * @returns {'small'|'medium'|'large'} default window size for the given
 *   app id, falling back to 'medium' for unmapped ids
 */
export const getWindowSize = (appId) => WINDOW_SIZES[appId] || 'medium';
