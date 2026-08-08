import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getAppIcon } from '../utils/appIcons';
import { getAppAccent } from '../utils/appAccents';
import { getAppMeta } from '../utils/appMeta';

/**
 * WindowSwitcher.jsx
 * The Ctrl+` overlay: one card per open window, arrow keys (or repeated
 * Ctrl+`) to move through them, Enter or a click to focus. It is the fast
 * path back to a window buried under three others.
 *
 * Alt+Tab is owned by the operating system and never reaches the browser,
 * which is why the shell binds Ctrl+` instead.
 *
 * Selection starts on the window *after* the active one, so opening and
 * confirming immediately swaps to the previous window the way a real task
 * switcher does.
 */
const WindowSwitcher = ({ openedApplications = [], activeAppId, onSelect, onClose }) => {
    const startIndex = openedApplications.findIndex((app) => app.id === activeAppId);
    const [selected, setSelected] = useState(() =>
        openedApplications.length > 1 ? (startIndex + 1) % openedApplications.length : 0
    );

    // Read by the key handler so it can confirm the current card without
    // re-binding the listener on every arrow press.
    const selectedRef = useRef(selected);
    selectedRef.current = selected;

    const move = useCallback((direction) => {
        setSelected((current) => {
            const count = openedApplications.length;
            if (count === 0) return 0;
            return (current + direction + count) % count;
        });
    }, [openedApplications.length]);

    const confirm = useCallback((index) => {
        const target = openedApplications[index];
        onClose();
        if (target) onSelect(target.id);
    }, [openedApplications, onSelect, onClose]);

    useEffect(() => {
        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                onClose();
                return;
            }

            if (event.key === 'ArrowRight' || event.key === 'ArrowDown' || event.key === '`') {
                event.preventDefault();
                move(1);
                return;
            }

            if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
                event.preventDefault();
                move(-1);
                return;
            }

            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                confirm(selectedRef.current);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [move, confirm, onClose]);

    if (openedApplications.length === 0) return null;

    return (
        <div className="switcher-backdrop" onMouseDown={onClose}>
            <div className="switcher" onMouseDown={(event) => event.stopPropagation()}>
                <span className="switcher__label">Open windows</span>

                <div className="switcher__cards">
                    {openedApplications.map((app, index) => {
                        const Icon = getAppIcon(app.id);

                        return (
                            <button
                                key={app.id}
                                type="button"
                                className={'switcher__card' + (index === selected ? ' switcher__card--selected' : '')}
                                style={{ '--accent': getAppAccent(app.id) }}
                                onMouseEnter={() => setSelected(index)}
                                onClick={() => confirm(index)}
                            >
                                <span className="switcher__card-icon">
                                    <Icon size={22} strokeWidth={1.7} />
                                </span>
                                <span className="switcher__card-name">{app.title}</span>
                                <span className="switcher__card-state">
                                    {app.minimized ? 'Minimized' : app.id === activeAppId ? 'Focused' : 'Open'}
                                </span>
                                <span className="switcher__card-tagline">{getAppMeta(app.id).tagline}</span>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default WindowSwitcher;
