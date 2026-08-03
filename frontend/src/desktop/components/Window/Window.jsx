import React from 'react';
import WindowHeader from './WindowHeader';
import WindowBody from './WindowBody';
import '../../styles/window.css';

/**
 * Window.jsx
 * The base window frame every application (Terminal, Email, Browser,
 * Files, Alerts, ARIA, ...) renders its content inside of.
 *
 * Position/stacking (x, y, zIndex) are owned by the caller (Desktop) —
 * Window just applies them. No drag, no resize — those plug in later
 * without changing this component's props.
 */
const Window = ({ title, children, x, y, zIndex, onClose, onFocus }) => {
    return (
        <div
            className="window"
            style={{ left: x, top: y, zIndex }}
            onMouseDown={onFocus}
        >
            <WindowHeader title={title} onClose={onClose} />
            <WindowBody>{children}</WindowBody>
        </div>
    );
};

export default Window;
