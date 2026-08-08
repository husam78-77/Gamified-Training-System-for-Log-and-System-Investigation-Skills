import React from 'react';
import { Minus, Square, Copy, X } from 'lucide-react';

/**
 * WindowControls.jsx
 * Minimize / maximize-restore / close. Button clicks stop propagation so
 * they don't also trigger the window's onFocus (mousedown) handler on
 * their way to being minimized/closed.
 */
const WindowControls = ({ maximized, onClose, onMinimize, onMaximizeToggle }) => {
    const stop = (handler) => (event) => {
        event.stopPropagation();
        handler?.();
    };

    return (
        <div className="window-controls" onDoubleClick={(event) => event.stopPropagation()}>
            <button
                type="button"
                className="window-controls__button window-controls__button--minimize"
                onMouseDown={(event) => event.stopPropagation()}
                onClick={stop(onMinimize)}
                aria-label="Minimize window"
            >
                <Minus size={14} strokeWidth={2.5} />
            </button>
            <button
                type="button"
                className="window-controls__button window-controls__button--maximize"
                onMouseDown={(event) => event.stopPropagation()}
                onClick={stop(onMaximizeToggle)}
                aria-label={maximized ? 'Restore window' : 'Maximize window'}
            >
                {maximized ? <Copy size={12} strokeWidth={2.5} /> : <Square size={12} strokeWidth={2.5} />}
            </button>
            <button
                type="button"
                className="window-controls__button window-controls__button--close"
                onMouseDown={(event) => event.stopPropagation()}
                onClick={stop(onClose)}
                aria-label="Close window"
            >
                <X size={14} strokeWidth={2.5} />
            </button>
        </div>
    );
};

export default WindowControls;
