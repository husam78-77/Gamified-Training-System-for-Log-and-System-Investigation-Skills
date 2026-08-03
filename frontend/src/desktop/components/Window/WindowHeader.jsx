import React from 'react';
import WindowControls from './WindowControls';

/**
 * WindowHeader.jsx
 * Renders the application title and the window controls.
 */
const WindowHeader = ({ title, onClose }) => {
    return (
        <div className="window-header">
            <span className="window-header__title">{title}</span>
            <WindowControls onClose={onClose} />
        </div>
    );
};

export default WindowHeader;
