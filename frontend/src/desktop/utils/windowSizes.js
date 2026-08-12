/**
 * windowSizes.js
 * Per-application window dimensions: a default (opening) size and a minimum
 * (resize floor) size. Windows are sized numerically, not by CSS class, so
 * the same values drive opening, dragging, resizing, and snapping — Window
 * never hardcodes which size goes with which app (same pattern as
 * appIcons.js).
 *
 * The default is a starting point only — every window can still be freely
 * resized within [min, work area] by the player (Window.jsx's resize
 * handles). The minimum is chosen from each application's own layout, not
 * an arbitrary number, so a window can never be shrunk past the point its
 * content stops working:
 *
 * - terminal: prompt/output column needs to stay readable.
 * - files / browser: the sidebar (file tree / article list) has its own
 *   CSS min-width, so the window minimum is that sidebar plus enough room
 *   for the viewer next to it to still show something.
 * - email: the message list plus a legible reader pane.
 * - aria: header + one message + the ask-a-question control.
 * - report: the editor plus its action buttons on one line.
 * - alerts: a small placeholder surface; the global floor is enough.
 */
const APP_DIMENSIONS = {
    terminal: { default: { width: 880, height: 560 }, min: { width: 560, height: 460 } },
    files: { default: { width: 880, height: 600 }, min: { width: 460, height: 380 } },
    browser: { default: { width: 880, height: 600 }, min: { width: 460, height: 380 } },
    report: { default: { width: 820, height: 620 }, min: { width: 460, height: 400 } },
    email: { default: { width: 760, height: 520 }, min: { width: 460, height: 360 } },
    aria: { default: { width: 640, height: 560 }, min: { width: 400, height: 420 } },
    alerts: { default: { width: 560, height: 460 }, min: { width: 380, height: 300 } },
};

/** Absolute floor for any application not listed above. */
export const DEFAULT_MIN_SIZE = { width: 380, height: 300 };

const DEFAULT_SIZE = { width: 640, height: 520 };

/** Height of the system bar; the usable desktop area starts below it. */
export const TASKBAR_HEIGHT = 46;

/**
 * @param {string} appId
 * @returns {{width: number, height: number}} default pixel size a window of
 *   this app should open at, falling back to a medium default for unmapped
 *   ids
 */
export const getWindowDefaultSize = (appId) => APP_DIMENSIONS[appId]?.default || DEFAULT_SIZE;

/**
 * @param {string} appId
 * @returns {{width: number, height: number}} the smallest this app's window
 *   may be resized to before its own layout stops being usable
 */
export const getWindowMinSize = (appId) => APP_DIMENSIONS[appId]?.min || DEFAULT_MIN_SIZE;

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
 * Shrinks a size so a window can never open larger than the work area (small
 * laptop screens, or a browser window the player resized), while never going
 * below that application's own usable minimum.
 *
 * @param {{width: number, height: number}} size
 * @param {{width: number, height: number}} workArea
 * @param {{width: number, height: number}} [minSize]
 * @returns {{width: number, height: number}}
 */
export const fitToWorkArea = (size, workArea, minSize = DEFAULT_MIN_SIZE) => ({
    width: Math.max(minSize.width, Math.min(size.width, workArea.width - 32)),
    height: Math.max(minSize.height, Math.min(size.height, workArea.height - 32)),
});
