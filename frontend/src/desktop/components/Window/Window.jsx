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
 *
 * Minimized windows stay mounted (children keep their state) and are only
 * hidden via CSS (dev rule #17). Maximized windows ignore x/y and let the
 * .window--maximized class fill the desktop area instead.
 */
const Window = ({ title, children, x, y, zIndex, size = 'medium', minimized, maximized, active, onClose, onFocus, onMinimize, onMaximizeToggle }) => {
    const style = maximized ? { zIndex } : { left: x, top: y, zIndex };

    const className = [
        'window',
        !maximized && `window--${size}`,
        maximized && 'window--maximized',
        minimized && 'window--minimized',
        active && 'window--active',
    ].filter(Boolean).join(' ');

    return (
        <div className={className} style={style} onMouseDown={onFocus}>
            <WindowHeader
                title={title}
                maximized={maximized}
                onClose={onClose}
                onMinimize={onMinimize}
                onMaximizeToggle={onMaximizeToggle}
            />
            <WindowBody>{children}</WindowBody>
        </div>
    );
};

export default Window;
