/**
 * snapping.js
 * Edge snapping for dragged windows — pure geometry, no React and no state.
 * Window reports the live pointer position while dragging, Desktop asks this
 * module which zone (if any) is armed and what bounds that zone means. Both
 * the drag preview and the committed bounds come from the same functions, so
 * what the player sees highlighted is exactly what they get.
 */

import { getWorkArea } from './windowSizes';

/** How close to an edge the pointer must be (px) before a zone arms. */
const EDGE_THRESHOLD = 22;

/** Fraction of the work area's height that counts as a corner (quarter tile). */
const CORNER_BAND = 0.3;

/**
 * Which snap zone the pointer is currently over, if any.
 *
 * @param {number} clientX
 * @param {number} clientY
 * @returns {'left'|'right'|'top-left'|'top-right'|'bottom-left'|'bottom-right'|'maximize'|null}
 */
export const getSnapZone = (clientX, clientY) => {
    const workArea = getWorkArea();
    const relativeY = (clientY - workArea.top) / workArea.height;

    if (clientY <= workArea.top + EDGE_THRESHOLD) return 'maximize';

    if (clientX <= EDGE_THRESHOLD) {
        if (relativeY <= CORNER_BAND) return 'top-left';
        if (relativeY >= 1 - CORNER_BAND) return 'bottom-left';
        return 'left';
    }

    if (clientX >= workArea.width - EDGE_THRESHOLD) {
        if (relativeY <= CORNER_BAND) return 'top-right';
        if (relativeY >= 1 - CORNER_BAND) return 'bottom-right';
        return 'right';
    }

    return null;
};

/**
 * The bounds a zone resolves to. 'maximize' returns null — the caller turns
 * that into the existing maximized state rather than a hardcoded rectangle.
 *
 * @param {string|null} zone
 * @returns {{x: number, y: number, width: number, height: number}|null}
 */
export const getSnapBounds = (zone) => {
    if (!zone || zone === 'maximize') return null;

    const workArea = getWorkArea();
    const halfWidth = Math.round(workArea.width / 2);
    const halfHeight = Math.round(workArea.height / 2);

    const layouts = {
        left: { x: 0, y: workArea.top, width: halfWidth, height: workArea.height },
        right: { x: halfWidth, y: workArea.top, width: workArea.width - halfWidth, height: workArea.height },
        'top-left': { x: 0, y: workArea.top, width: halfWidth, height: halfHeight },
        'top-right': { x: halfWidth, y: workArea.top, width: workArea.width - halfWidth, height: halfHeight },
        'bottom-left': { x: 0, y: workArea.top + halfHeight, width: halfWidth, height: workArea.height - halfHeight },
        'bottom-right': { x: halfWidth, y: workArea.top + halfHeight, width: workArea.width - halfWidth, height: workArea.height - halfHeight },
    };

    return layouts[zone] || null;
};

/**
 * Bounds to draw the drag preview with. Identical to getSnapBounds except
 * 'maximize', which has no stored bounds — the preview still needs a
 * rectangle to outline, so it gets the whole work area.
 *
 * @param {string|null} zone
 * @returns {{x: number, y: number, width: number, height: number}|null}
 */
export const getSnapPreviewBounds = (zone) => {
    if (zone !== 'maximize') return getSnapBounds(zone);

    const workArea = getWorkArea();
    return { x: 0, y: workArea.top, width: workArea.width, height: workArea.height };
};

/**
 * Human-readable name for the zone, shown on the snap preview so the player
 * knows what releasing the mouse will do.
 *
 * @param {string|null} zone
 * @returns {string}
 */
export const getSnapLabel = (zone) => {
    const labels = {
        maximize: 'Maximize',
        left: 'Snap left',
        right: 'Snap right',
        'top-left': 'Top left quarter',
        'top-right': 'Top right quarter',
        'bottom-left': 'Bottom left quarter',
        'bottom-right': 'Bottom right quarter',
    };
    return labels[zone] || '';
};
