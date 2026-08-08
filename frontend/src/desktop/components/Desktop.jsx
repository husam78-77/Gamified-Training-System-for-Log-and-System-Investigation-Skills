import React, { useState, useCallback, useRef, useMemo } from 'react';
import Wallpaper from './Wallpaper';
import DesktopIcon from './DesktopIcon';
import WindowManager from './WindowManager';
import { Taskbar } from './Taskbar';
import { useAuth } from '../../context/AuthContext';
import { logEvent } from '../../services/investigationService';
import '../styles/desktop.css';

// Each newly opened window cascades slightly from the last so they
// don't all land in exactly the same spot (e.g. 120,80 → 150,110 → 180,140).
const WINDOW_ORIGIN = { x: 70, y: 64 };
const WINDOW_CASCADE_STEP = 30;

/**
 * Desktop.jsx
 * Pure rendering component — receives the desktop object and renders it.
 * Never fetches data itself and never knows where it comes from;
 * DesktopPage owns loading.
 *
 * Owns openedApplications: the set of windows currently open, each as
 * { id, title, x, y, zIndex, minimized, maximized, prevBounds }. This is
 * local UI state, separate from the fetched desktop data.
 *
 * activeAppId is never stored — it's derived from openedApplications (the
 * visible window with the highest zIndex) so Taskbar/WindowManager can
 * never fall out of sync with it (dev rule #6 — no duplicate state).
 */
const Desktop = ({ desktop }) => {
    const { wallpaper, applications = [] } = desktop;
    const { token } = useAuth();

    const [openedApplications, setOpenedApplications] = useState([]);
    const zIndexCounter = useRef(10);

    const activeAppId = useMemo(() => {
        const visible = openedApplications.filter((opened) => !opened.minimized);
        if (visible.length === 0) return null;
        return visible.reduce((top, opened) => (opened.zIndex > top.zIndex ? opened : top)).id;
    }, [openedApplications]);

    // The single entry point every launcher (desktop icon, and any future
    // launcher) uses. Already open + visible → focus it. Already open +
    // minimized → restore it. Not open → create it. Never creates a
    // duplicate window (dev rule #12).
    const openApplication = useCallback((app) => {
        const nextZIndex = (zIndexCounter.current += 1);

        setOpenedApplications((prev) => {
            const existing = prev.find((opened) => opened.id === app.id);

            if (existing) {
                return prev.map((opened) =>
                    opened.id === app.id ? { ...opened, minimized: false, zIndex: nextZIndex } : opened
                );
            }

            logEvent('APPLICATION_OPENED', { appId: app.id }, token);

            const offset = prev.length * WINDOW_CASCADE_STEP;

            return [
                ...prev,
                {
                    id: app.id,
                    title: app.name,
                    x: WINDOW_ORIGIN.x + offset,
                    y: WINDOW_ORIGIN.y + offset,
                    zIndex: nextZIndex,
                    minimized: false,
                    maximized: false,
                    prevBounds: null,
                },
            ];
        });
    }, [token]);

    const closeApplication = useCallback((appId) => {
        setOpenedApplications((prev) => prev.filter((opened) => opened.id !== appId));
        logEvent('APPLICATION_CLOSED', { appId }, token);
    }, [token]);

    const focusApplication = useCallback((appId) => {
        const nextZIndex = (zIndexCounter.current += 1);

        setOpenedApplications((prev) =>
            prev.map((opened) => (opened.id === appId ? { ...opened, zIndex: nextZIndex } : opened))
        );
    }, []);

    // Keeps the application mounted (state intact) and only hides its
    // window — WindowManager still renders it, Window just applies
    // display:none (dev rule #17 — MINIMIZE must not destroy state).
    const minimizeApplication = useCallback((appId) => {
        setOpenedApplications((prev) =>
            prev.map((opened) => (opened.id === appId ? { ...opened, minimized: true } : opened))
        );
    }, []);

    const restoreApplication = useCallback((appId) => {
        const nextZIndex = (zIndexCounter.current += 1);

        setOpenedApplications((prev) =>
            prev.map((opened) =>
                opened.id === appId ? { ...opened, minimized: false, zIndex: nextZIndex } : opened
            )
        );
    }, []);

    // Commits a window's on-screen position once a header drag ends
    // (Window.jsx tracks the drag locally and only reports the final
    // x/y here — see dev rule #6, single source of truth for position).
    const updateApplicationPosition = useCallback((appId, x, y) => {
        setOpenedApplications((prev) =>
            prev.map((opened) => (opened.id === appId ? { ...opened, x, y } : opened))
        );
    }, []);

    const toggleMaximize = useCallback((appId) => {
        const nextZIndex = (zIndexCounter.current += 1);

        setOpenedApplications((prev) =>
            prev.map((opened) => {
                if (opened.id !== appId) return opened;

                if (opened.maximized) {
                    const restored = opened.prevBounds || { x: WINDOW_ORIGIN.x, y: WINDOW_ORIGIN.y };
                    return { ...opened, maximized: false, prevBounds: null, ...restored, zIndex: nextZIndex };
                }

                return {
                    ...opened,
                    maximized: true,
                    prevBounds: { x: opened.x, y: opened.y },
                    zIndex: nextZIndex,
                };
            })
        );
    }, []);

    // Taskbar click on a running application (dev rule #20): minimized →
    // restore, already active → minimize (matches standard OS taskbar
    // behaviour), otherwise → focus.
    const handleTaskbarSelect = useCallback((appId) => {
        const app = openedApplications.find((opened) => opened.id === appId);
        if (!app) return;

        if (app.minimized) restoreApplication(appId);
        else if (appId === activeAppId) minimizeApplication(appId);
        else focusApplication(appId);
    }, [openedApplications, activeAppId, restoreApplication, minimizeApplication, focusApplication]);

    return (
        <div className="desktop">
            <Wallpaper wallpaper={wallpaper} />
            <div className="desktop-icons">
                {applications.map((app, index) => {
                    const opened = openedApplications.find((o) => o.id === app.id);
                    return (
                        <DesktopIcon
                            key={app.id}
                            app={app}
                            index={index}
                            isRunning={Boolean(opened)}
                            isActive={app.id === activeAppId}
                            onClick={() => openApplication(app)}
                        />
                    );
                })}
            </div>
            <WindowManager
                openedApplications={openedApplications}
                activeAppId={activeAppId}
                onClose={closeApplication}
                onFocus={focusApplication}
                onMinimize={minimizeApplication}
                onMaximizeToggle={toggleMaximize}
                onDragEnd={updateApplicationPosition}
            />
            <Taskbar
                openedApplications={openedApplications}
                activeAppId={activeAppId}
                onSelect={handleTaskbarSelect}
            />
        </div>
    );
};

export default Desktop;
