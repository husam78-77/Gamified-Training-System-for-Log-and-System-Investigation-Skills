/**
 * useWindowSession.js
 * Owns every open window on the desktop — the "window manager" half of the
 * Desktop, extracted from Desktop.jsx so the component stays a layout shell
 * while this file holds the rules.
 *
 * Each entry is { id, title, x, y, width, height, zIndex, minimized,
 * maximized, snapped, prevBounds }. This is local UI state only; it is never
 * fetched and never sent anywhere. The one backend touch point is the
 * existing fire-and-forget logEvent() call on open/close — unchanged.
 *
 * activeAppId is derived, never stored (dev rule #6 — no duplicate state):
 * it is the visible window with the highest zIndex, so the Taskbar, the
 * window switcher, and WindowManager can never disagree about what is
 * focused.
 */

import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { logEvent } from '../../services/investigationService';
import { getWindowDefaultSize, getWindowMinSize, fitToWorkArea, getWorkArea } from '../utils/windowSizes';
import { getSnapBounds } from '../utils/snapping';

// Each newly opened window cascades slightly from the last so they don't all
// land in exactly the same spot (e.g. 70,64 → 100,94 → 130,124).
const WINDOW_ORIGIN = { x: 70, y: 66 };
const WINDOW_CASCADE_STEP = 30;
const MAX_CASCADE_STEPS = 6;

// Breathing room between tiled windows, so a grid reads as separate frames
// rather than one panel with seams.
const TILE_GUTTER = 6;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

/**
 * Keeps a window inside the work area — used when opening and when the
 * browser is resized, so a window can never be stranded off-screen.
 */
const clampToWorkArea = (bounds, workArea) => ({
    ...bounds,
    x: clamp(bounds.x, 40 - bounds.width, workArea.width - 60),
    y: clamp(bounds.y, workArea.top, workArea.top + workArea.height - 48),
});

/**
 * @param {(entry: {level?: string, title: string, detail?: string}) => void} [notify]
 *   optional system-feed reporter; window events surface as notifications.
 */
export const useWindowSession = (notify) => {
    const { token } = useAuth();

    const [openedApplications, setOpenedApplications] = useState([]);
    const zIndexCounter = useRef(10);

    const nextZIndex = useCallback(() => (zIndexCounter.current += 1), []);

    const activeAppId = useMemo(() => {
        const visible = openedApplications.filter((opened) => !opened.minimized);
        if (visible.length === 0) return null;
        return visible.reduce((top, opened) => (opened.zIndex > top.zIndex ? opened : top)).id;
    }, [openedApplications]);

    // Shrinking the browser must never strand a window outside the visible
    // work area — every window is pulled back inside on resize, keeping its
    // size where it still fits.
    useEffect(() => {
        const handleResize = () => {
            const workArea = getWorkArea();

            setOpenedApplications((prev) =>
                prev.map((opened) => {
                    const size = fitToWorkArea(
                        { width: opened.width, height: opened.height },
                        workArea,
                        getWindowMinSize(opened.id)
                    );
                    return { ...opened, ...clampToWorkArea({ ...opened, ...size }, workArea) };
                })
            );
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // The single entry point every launcher (desktop icon, taskbar launcher,
    // command palette, hotkey) uses. Already open + visible → focus it.
    // Already open + minimized → restore it. Not open → create it. Never
    // creates a duplicate window (dev rule #12).
    const openApplication = useCallback((app) => {
        const zIndex = nextZIndex();

        setOpenedApplications((prev) => {
            const existing = prev.find((opened) => opened.id === app.id);

            if (existing) {
                return prev.map((opened) =>
                    opened.id === app.id ? { ...opened, minimized: false, zIndex } : opened
                );
            }

            logEvent('APPLICATION_OPENED', { appId: app.id }, token);
            notify?.({ level: 'info', title: `${app.name} launched`, detail: 'Application window opened.', toast: false });

            const workArea = getWorkArea();
            const size = fitToWorkArea(getWindowDefaultSize(app.id), workArea, getWindowMinSize(app.id));
            const offset = Math.min(prev.length, MAX_CASCADE_STEPS) * WINDOW_CASCADE_STEP;

            const bounds = clampToWorkArea(
                { x: WINDOW_ORIGIN.x + offset, y: WINDOW_ORIGIN.y + offset, ...size },
                workArea
            );

            return [
                ...prev,
                {
                    id: app.id,
                    title: app.name,
                    ...bounds,
                    zIndex,
                    minimized: false,
                    maximized: false,
                    snapped: null,
                    prevBounds: null,
                },
            ];
        });
    }, [token, notify, nextZIndex]);

    const closeApplication = useCallback((appId) => {
        setOpenedApplications((prev) => {
            const closing = prev.find((opened) => opened.id === appId);
            if (closing) notify?.({ level: 'muted', title: `${closing.title} closed`, toast: false });
            return prev.filter((opened) => opened.id !== appId);
        });
        logEvent('APPLICATION_CLOSED', { appId }, token);
    }, [token, notify]);

    const focusApplication = useCallback((appId) => {
        const zIndex = nextZIndex();
        setOpenedApplications((prev) =>
            prev.map((opened) => (opened.id === appId ? { ...opened, zIndex } : opened))
        );
    }, [nextZIndex]);

    // Keeps the application mounted (state intact) and only hides its window
    // — WindowManager still renders it, Window just applies display:none
    // (dev rule #17 — MINIMIZE must not destroy state).
    const minimizeApplication = useCallback((appId) => {
        setOpenedApplications((prev) =>
            prev.map((opened) => (opened.id === appId ? { ...opened, minimized: true } : opened))
        );
    }, []);

    const restoreApplication = useCallback((appId) => {
        const zIndex = nextZIndex();
        setOpenedApplications((prev) =>
            prev.map((opened) =>
                opened.id === appId ? { ...opened, minimized: false, zIndex } : opened
            )
        );
    }, [nextZIndex]);

    const toggleMaximize = useCallback((appId) => {
        const zIndex = nextZIndex();

        setOpenedApplications((prev) =>
            prev.map((opened) => {
                if (opened.id !== appId) return opened;

                if (opened.maximized) {
                    const restored = opened.prevBounds || { x: WINDOW_ORIGIN.x, y: WINDOW_ORIGIN.y };
                    return { ...opened, maximized: false, prevBounds: null, snapped: null, ...restored, zIndex };
                }

                return {
                    ...opened,
                    maximized: true,
                    snapped: null,
                    prevBounds: { x: opened.x, y: opened.y, width: opened.width, height: opened.height },
                    zIndex,
                };
            })
        );
    }, [nextZIndex]);

    // Commits a window's geometry once a header drag or an edge resize ends
    // (Window tracks the gesture locally and only reports the final
    // rectangle — see dev rule #6, single source of truth for position).
    const setApplicationBounds = useCallback((appId, bounds) => {
        setOpenedApplications((prev) =>
            prev.map((opened) => {
                if (opened.id !== appId) return opened;
                const minSize = getWindowMinSize(appId);
                return {
                    ...opened,
                    ...bounds,
                    width: Math.max(minSize.width, bounds.width ?? opened.width),
                    height: Math.max(minSize.height, bounds.height ?? opened.height),
                    snapped: null,
                };
            })
        );
    }, []);

    /**
     * Applies a snap zone to a window. 'maximize' deliberately reuses the
     * existing maximized state instead of writing full-screen bounds, so
     * restore keeps working exactly as before.
     */
    const snapApplication = useCallback((appId, zone) => {
        if (!zone) return;

        if (zone === 'maximize') {
            setOpenedApplications((prev) =>
                prev.map((opened) => {
                    if (opened.id !== appId || opened.maximized) return opened;
                    return {
                        ...opened,
                        maximized: true,
                        snapped: null,
                        prevBounds: { x: opened.x, y: opened.y, width: opened.width, height: opened.height },
                    };
                })
            );
            return;
        }

        const bounds = getSnapBounds(zone);
        if (!bounds) return;

        // A quarter-snap on a short/narrow viewport could otherwise offer this
        // app's window less room than it needs to stay usable — same floor
        // every other resize path respects (Task 4: sensible minimum size).
        const minSize = getWindowMinSize(appId);
        bounds.width = Math.max(minSize.width, bounds.width);
        bounds.height = Math.max(minSize.height, bounds.height);

        setOpenedApplications((prev) =>
            prev.map((opened) =>
                opened.id === appId
                    ? {
                        ...opened,
                        ...bounds,
                        maximized: false,
                        snapped: zone,
                        prevBounds: opened.prevBounds || { x: opened.x, y: opened.y, width: opened.width, height: opened.height },
                    }
                    : opened
            )
        );
    }, []);

    // Taskbar click on a running application (dev rule #20): minimized →
    // restore, already active → minimize (matches standard OS taskbar
    // behaviour), otherwise → focus.
    const selectApplication = useCallback((appId) => {
        const app = openedApplications.find((opened) => opened.id === appId);
        if (!app) return;

        if (app.minimized) restoreApplication(appId);
        else if (appId === activeAppId) minimizeApplication(appId);
        else focusApplication(appId);
    }, [openedApplications, activeAppId, restoreApplication, minimizeApplication, focusApplication]);

    const minimizeAll = useCallback(() => {
        setOpenedApplications((prev) => prev.map((opened) => ({ ...opened, minimized: true })));
    }, []);

    const closeAll = useCallback(() => {
        openedApplications.forEach((opened) => logEvent('APPLICATION_CLOSED', { appId: opened.id }, token));
        setOpenedApplications([]);
        notify?.({ level: 'muted', title: 'Workspace cleared', detail: 'All application windows closed.', toast: false });
    }, [openedApplications, token, notify]);

    /** Lays every visible window out in a grid that fills the work area. */
    const tileWindows = useCallback(() => {
        setOpenedApplications((prev) => {
            const visible = prev.filter((opened) => !opened.minimized);
            if (visible.length === 0) return prev;

            const workArea = getWorkArea();
            const columns = Math.ceil(Math.sqrt(visible.length));
            const rows = Math.ceil(visible.length / columns);
            const cellWidth = Math.floor(workArea.width / columns);
            const cellHeight = Math.floor(workArea.height / rows);

            const positions = new Map(
                visible.map((opened, index) => [
                    opened.id,
                    {
                        x: (index % columns) * cellWidth + TILE_GUTTER,
                        y: workArea.top + Math.floor(index / columns) * cellHeight + TILE_GUTTER,
                        width: cellWidth - TILE_GUTTER * 2,
                        height: cellHeight - TILE_GUTTER * 2,
                    },
                ])
            );

            return prev.map((opened) =>
                positions.has(opened.id)
                    ? { ...opened, ...positions.get(opened.id), maximized: false, snapped: 'tiled' }
                    : opened
            );
        });
        notify?.({ level: 'info', title: 'Windows tiled', toast: false });
    }, [notify]);

    /** Restacks every visible window from the origin, newest on top. */
    const cascadeWindows = useCallback(() => {
        setOpenedApplications((prev) => {
            const workArea = getWorkArea();
            let step = 0;

            return prev.map((opened) => {
                if (opened.minimized) return opened;

                const size = fitToWorkArea(getWindowDefaultSize(opened.id), workArea, getWindowMinSize(opened.id));
                const offset = Math.min(step, MAX_CASCADE_STEPS) * WINDOW_CASCADE_STEP;
                step += 1;

                return {
                    ...opened,
                    ...clampToWorkArea({ x: WINDOW_ORIGIN.x + offset, y: WINDOW_ORIGIN.y + offset, ...size }, workArea),
                    maximized: false,
                    snapped: null,
                };
            });
        });
        notify?.({ level: 'info', title: 'Windows cascaded', toast: false });
    }, [notify]);

    return {
        openedApplications,
        activeAppId,
        openApplication,
        closeApplication,
        focusApplication,
        minimizeApplication,
        restoreApplication,
        toggleMaximize,
        setApplicationBounds,
        snapApplication,
        selectApplication,
        minimizeAll,
        closeAll,
        tileWindows,
        cascadeWindows,
    };
};
