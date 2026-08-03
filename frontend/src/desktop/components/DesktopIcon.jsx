import React from 'react';
import { getAppIcon } from '../utils/appIcons';
import '../styles/icons.css';

/**
 * DesktopIcon.jsx
 * Renders a single application's icon and name, data-driven from `app`.
 * Clicking it opens the application (handled by the parent Desktop).
 */
const DesktopIcon = ({ app, onClick }) => {
    const Icon = getAppIcon(app.id);

    return (
        <div className="desktop-icon" onClick={onClick}>
            <div className="desktop-icon__glyph">
                <Icon size={26} strokeWidth={1.75} />
            </div>
            <span className="desktop-icon__label">{app.name}</span>
        </div>
    );
};

export default DesktopIcon;
