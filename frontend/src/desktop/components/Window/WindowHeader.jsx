import React from 'react';
import WindowControls from './WindowControls';

/**
 * WindowHeader.jsx
 * Renders the application title and the window controls. Dragging is
 * started here (onHeaderMouseDown, from Window.jsx) — control buttons stop
 * propagation on their own mousedown so clicking them never starts a drag.
 */
const WindowHeader = ({ title, maximized, onHeaderMouseDown, onClose, onMinimize, onMaximizeToggle }) => {
    return (
        <div className="window-header" onMouseDown={onHeaderMouseDown} onDoubleClick={onMaximizeToggle}>
            <span className="window-header__title">{title}</span>
            <WindowControls maximized={maximized} onClose={onClose} onMinimize={onMinimize} onMaximizeToggle={onMaximizeToggle} />
        </div>
    );
};

export default WindowHeader;
