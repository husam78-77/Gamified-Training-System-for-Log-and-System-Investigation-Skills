import React from 'react';
import { X } from 'lucide-react';

/**
 * WindowControls.jsx
 * Only the close button is implemented. Minimize/maximize are not built
 * yet — this is the seam where those buttons will be added later.
 */
const WindowControls = ({ onClose }) => {
    return (
        <div className="window-controls">
            <button
                type="button"
                className="window-controls__button window-controls__button--close"
                onClick={onClose}
                aria-label="Close window"
            >
                <X size={14} strokeWidth={2.5} />
            </button>
        </div>
    );
};

export default WindowControls;
