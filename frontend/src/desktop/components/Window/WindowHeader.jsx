import React from 'react';
import WindowControls from './WindowControls';

/**
 * WindowHeader.jsx
 * Renders the application title and the window controls.
 */
const WindowHeader = ({ title, maximized, onClose, onMinimize, onMaximizeToggle }) => {
    return (
        <div className="window-header" onDoubleClick={onMaximizeToggle}>
            <span className="window-header__title">{title}</span>
            <WindowControls maximized={maximized} onClose={onClose} onMinimize={onMinimize} onMaximizeToggle={onMaximizeToggle} />
        </div>
    );
};

export default WindowHeader;
