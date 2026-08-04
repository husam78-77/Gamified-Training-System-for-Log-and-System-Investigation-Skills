import React, { useState, useCallback, useRef } from 'react';
import Wallpaper from './Wallpaper';
import DesktopIcon from './DesktopIcon';
import WindowManager from './WindowManager';
import { Taskbar } from './Taskbar';
import '../styles/desktop.css';

// Each newly opened window cascades slightly from the last so they
// don't all land in exactly the same spot (e.g. 120,80 → 150,110 → 180,140).
const WINDOW_ORIGIN = { x: 120, y: 80 };
const WINDOW_CASCADE_STEP = 30;

/**
 * Desktop.jsx
 * Pure rendering component — receives the desktop object and renders it.
 * Never fetches data itself and never knows where it comes from;
 * DesktopPage owns loading.
 *
 * Owns openedApplications: the set of windows currently open, each as
 * { id, title, x, y, zIndex }. This is local UI state, separate from the
 * fetched desktop data.
 */
const Desktop = ({ desktop }) => {
    const { wallpaper, applications = [] } = desktop;

    const [openedApplications, setOpenedApplications] = useState([]);
    const zIndexCounter = useRef(10);

    const openApplication = useCallback((app) => {
        const nextZIndex = (zIndexCounter.current += 1);

        setOpenedApplications((prev) => {
            if (prev.some((opened) => opened.id === app.id)) return prev;

            const offset = prev.length * WINDOW_CASCADE_STEP;

            return [
                ...prev,
                {
                    id: app.id,
                    title: app.name,
                    x: WINDOW_ORIGIN.x + offset,
                    y: WINDOW_ORIGIN.y + offset,
                    zIndex: nextZIndex,
                },
            ];
        });
    }, []);

    const closeApplication = useCallback((appId) => {
        setOpenedApplications((prev) => prev.filter((opened) => opened.id !== appId));
    }, []);

    const focusApplication = useCallback((appId) => {
        const nextZIndex = (zIndexCounter.current += 1);

        setOpenedApplications((prev) =>
            prev.map((opened) => (opened.id === appId ? { ...opened, zIndex: nextZIndex } : opened))
        );
    }, []);

    return (
        <div className="desktop">
            <Wallpaper wallpaper={wallpaper} />
            <div className="desktop-icons">
                {applications.map((app) => (
                    <DesktopIcon key={app.id} app={app} onClick={() => openApplication(app)} />
                ))}
            </div>
            <WindowManager
                openedApplications={openedApplications}
                onClose={closeApplication}
                onFocus={focusApplication}
            />
            <Taskbar openedApplications={openedApplications} />
        </div>
    );
};

export default Desktop;
