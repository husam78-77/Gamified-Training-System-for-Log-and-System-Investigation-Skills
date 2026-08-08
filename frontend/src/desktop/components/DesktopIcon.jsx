import React from 'react';
import { getAppIcon } from '../utils/appIcons';
import '../styles/icons.css';

/**
 * DesktopIcon.jsx
 * Renders a single application's icon and name, data-driven from `app`.
 * Clicking it opens the application (handled by the parent Desktop).
 *
 * isRunning/isActive come straight from Desktop's openedApplications state
 * — the same state WindowManager/Taskbar read — so the running indicator
 * can never fall out of sync with what's actually open (dev rule #6).
 */
const DesktopIcon = ({ app, isRunning, isActive, onClick }) => {
    const Icon = getAppIcon(app.id);

    const className = [
        'desktop-icon',
        isActive && 'desktop-icon--active',
    ].filter(Boolean).join(' ');

    return (
        <div className={className} onClick={onClick}>
            <div className="desktop-icon__glyph">
                <Icon size={26} strokeWidth={1.75} />
            </div>
            <span className="desktop-icon__label">{app.name}</span>
            {isRunning && <span className="desktop-icon__running-dot" aria-hidden="true" />}
        </div>
    );
};

export default DesktopIcon;
