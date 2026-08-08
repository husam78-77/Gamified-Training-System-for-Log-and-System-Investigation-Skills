import React from 'react';
import { getSnapPreviewBounds, getSnapLabel } from '../utils/snapping';

/**
 * SnapPreview.jsx
 * The translucent rectangle that shows where a dragged window will land.
 * Renders nothing unless a zone is armed, and draws it from the exact same
 * geometry the window will be given on release (utils/snapping) — so the
 * preview can never promise a layout the drop doesn't deliver.
 */
const SnapPreview = ({ zone }) => {
    const bounds = getSnapPreviewBounds(zone);
    if (!bounds) return null;

    return (
        <div
            className="snap-preview"
            style={{ left: bounds.x, top: bounds.y, width: bounds.width, height: bounds.height }}
            aria-hidden="true"
        >
            <span className="snap-preview__label">{getSnapLabel(zone)}</span>
        </div>
    );
};

export default SnapPreview;
