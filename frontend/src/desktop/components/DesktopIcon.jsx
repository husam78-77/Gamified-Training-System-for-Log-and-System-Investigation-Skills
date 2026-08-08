import React from 'react';
import { getAppIcon } from '../utils/appIcons';
import { getAppAccent, getAppAccentRgb } from '../utils/appAccents';
import { getAppMeta } from '../utils/appMeta';
import '../styles/icons.css';

/**
 * DesktopIcon.jsx
 * Renders a single application's tile, data-driven from `app`. Clicking it
 * opens the application (handled by the parent Desktop); right-clicking asks
 * Desktop for that application's context menu.
 *
 * A real <button> rather than a div, so the icon column is reachable by
 * keyboard and announces itself properly.
 *
 * isRunning/isActive come straight from the window session — the same state
 * WindowManager and the Taskbar read — so the running indicator can never
 * fall out of sync with what's actually open (dev rule #6).
 *
 * `index` drives the entrance-animation stagger and the Alt+n launch hint
 * shown on hover; it is never used for identity or ordering logic.
 */
const DesktopIcon = ({ app, isRunning, isActive, onClick, onContextMenu, index = 0 }) => {
    const Icon = getAppIcon(app.id);
    const meta = getAppMeta(app.id);

    const className = [
        'desktop-icon',
        isRunning && 'desktop-icon--running',
        isActive && 'desktop-icon--active',
    ].filter(Boolean).join(' ');

    return (
        <button
            type="button"
            className={className}
            style={{
                '--accent': getAppAccent(app.id),
                '--accent-rgb': getAppAccentRgb(app.id),
                '--i': index,
            }}
            onClick={onClick}
            onContextMenu={onContextMenu}
            title={meta.tagline}
        >
            <span className="desktop-icon__glyph">
                <Icon size={26} strokeWidth={1.65} />
                <span className="desktop-icon__scan" aria-hidden="true" />
            </span>
            <span className="desktop-icon__label">{app.name}</span>
            {index < 9 && <span className="desktop-icon__hotkey" aria-hidden="true">ALT {index + 1}</span>}
            {isRunning && <span className="desktop-icon__running-dot" aria-hidden="true" />}
        </button>
    );
};

export default DesktopIcon;
