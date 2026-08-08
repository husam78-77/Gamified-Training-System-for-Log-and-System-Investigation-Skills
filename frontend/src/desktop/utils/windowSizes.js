/**
 * windowSizes.js
 * Maps an application id to its default window size class, and each class to
 * real pixel dimensions. Windows are sized numerically (not by CSS class) so
 * the same values can be dragged, resized, and snapped — Window never
 * hardcodes which size goes with which app (same pattern as appIcons.js).
 */
const SIZE_PRESETS = {
    small: { width: 460, height: 400 },
    medium: { width: 640, height: 520 },
    large: { width: 980, height: 660 },
};

const WINDOW_SIZES = {
    terminal: 'large',
    files: 'large',
    browser: 'large',
    report: 'large',
    email: 'medium',
    aria: 'medium',
    alerts: 'medium',
};

/** No window may be resized smaller than this — below it, app content breaks. */
export const MIN_WINDOW_SIZE = { width: 380, height: 260 };

/** Height of the system bar; the usable desktop area starts below it. */
export const TASKBAR_HEIGHT = 46;

/**
 * @param {string} appId
 * @returns {{width: number, height: number}} default pixel size for the given
 *   app id, falling back to the medium preset for unmapped ids
 */
export const getWindowSize = (appId) => SIZE_PRESETS[WINDOW_SIZES[appId]] || SIZE_PRESETS.medium;

/**
 * The rectangle windows live in: the viewport minus the system bar. Read at
 * call time so it always reflects the current browser size.
 *
 * @returns {{top: number, left: number, width: number, height: number}}
 */
export const getWorkArea = () => ({
    top: TASKBAR_HEIGHT,
    left: 0,
    width: window.innerWidth,
    height: window.innerHeight - TASKBAR_HEIGHT,
});

/**
 * Shrinks a default size so a window can never open larger than the work
 * area (small laptop screens, or a browser window the player resized).
 *
 * @param {{width: number, height: number}} size
 * @param {{width: number, height: number}} workArea
 * @returns {{width: number, height: number}}
 */
export const fitToWorkArea = (size, workArea) => ({
    width: Math.max(MIN_WINDOW_SIZE.width, Math.min(size.width, workArea.width - 32)),
    height: Math.max(MIN_WINDOW_SIZE.height, Math.min(size.height, workArea.height - 32)),
});
