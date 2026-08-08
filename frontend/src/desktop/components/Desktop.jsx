import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Search, Keyboard, LayoutGrid, Layers, Minimize2, XCircle, LogOut, PanelsTopLeft, Play, Minus,
} from 'lucide-react';
import Wallpaper from './Wallpaper';
import DesktopIcon from './DesktopIcon';
import WindowManager from './WindowManager';
import SnapPreview from './SnapPreview';
import CaseHud from './CaseHud';
import BootSequence from './BootSequence';
import CommandPalette from './CommandPalette';
import WindowSwitcher from './WindowSwitcher';
import ShortcutsOverlay from './ShortcutsOverlay';
import ContextMenu from './ContextMenu';
import Toasts from './Toasts';
import { Taskbar } from './Taskbar';
import { useWindowSession } from '../hooks/useWindowSession';
import { useSystemFeed } from '../hooks/useSystemFeed';
import { useHotkeys } from '../hooks/useHotkeys';
import { useInvestigation } from '../../context/InvestigationContext';
import { comboFor } from '../utils/shortcuts';
import { getSnapLabel } from '../utils/snapping';
import '../styles/desktop.css';
import '../styles/overlays.css';

/**
 * Desktop.jsx
 * Pure rendering component — receives the desktop object and renders it.
 * Never fetches data itself and never knows where it comes from; DesktopPage
 * owns loading.
 *
 * All window state and the rules around it live in useWindowSession, and all
 * system notifications in useSystemFeed. What is left here is the shell
 * itself: the layers of the screen (wallpaper → icons → windows → system bar
 * → overlays), the shortcut map, and the two menus that need to know about
 * everything at once (the command palette and the context menu).
 *
 * Only one overlay is ever open, so they share a single `overlay` value
 * rather than a boolean each — there is no state in which two of them could
 * disagree about who has focus.
 */
const Desktop = ({ desktop }) => {
    const { wallpaper, applications = [] } = desktop;
    const navigate = useNavigate();
    const { investigation } = useInvestigation();

    const feed = useSystemFeed();
    const session = useWindowSession(feed.notify);
    const { openedApplications, activeAppId } = session;

    const [overlay, setOverlay] = useState(null);
    const [contextMenu, setContextMenu] = useState(null);
    const [snapZone, setSnapZone] = useState(null);
    const [booting, setBooting] = useState(true);

    const toggleOverlay = useCallback((name) => {
        setOverlay((current) => (current === name ? null : name));
    }, []);

    const closeOverlay = useCallback(() => setOverlay(null), []);
    const exitToMissionControl = useCallback(() => navigate('/mission'), [navigate]);

    // Toasts are kept rare on purpose — opening a window is its own feedback,
    // so routine window bookkeeping only goes to the feed. What does earn a
    // toast is the arrival itself, and the one thing a new player cannot
    // discover by looking: the palette hotkey.
    const bootFinished = useRef(false);
    const hintTimer = useRef(0);

    const handleBootFinish = useCallback(() => {
        if (bootFinished.current) return;
        bootFinished.current = true;
        setBooting(false);

        feed.notify({
            level: 'success',
            title: 'Workspace attached',
            detail: `${applications.length} tools cleared for this case.`,
        });

        hintTimer.current = setTimeout(() => {
            feed.notify({
                level: 'info',
                title: 'Press Ctrl K to search',
                detail: 'Every tool and window action, one keystroke away.',
            });
        }, 2800);
    }, [feed, applications.length]);

    useEffect(() => () => clearTimeout(hintTimer.current), []);

    /* ── Window gestures ─────────────────────────────────────────────── */

    // A drag either lands where it was dropped or, if a screen edge was
    // armed at the moment of release, snaps to that zone instead.
    const handleDragEnd = useCallback((appId, bounds, zone) => {
        setSnapZone(null);

        if (zone) {
            session.snapApplication(appId, zone);
            feed.notify({ level: 'muted', title: getSnapLabel(zone), detail: 'Window snapped into place.', toast: false });
            return;
        }

        session.setApplicationBounds(appId, bounds);
    }, [session, feed]);

    const handleResizeEnd = useCallback((appId, bounds) => {
        session.setApplicationBounds(appId, bounds);
    }, [session]);

    /* ── Context menus ───────────────────────────────────────────────── */

    const openDesktopMenu = useCallback((event) => {
        event.preventDefault();

        const hasWindows = openedApplications.length > 0;

        setContextMenu({
            x: event.clientX,
            y: event.clientY,
            items: [
                { id: 'search', label: 'Search tools & actions', icon: Search, shortcut: 'Ctrl K', run: () => setOverlay('palette') },
                { id: 'sep-1', separator: true },
                { id: 'tile', label: 'Tile windows', icon: LayoutGrid, disabled: !hasWindows, run: session.tileWindows },
                { id: 'cascade', label: 'Cascade windows', icon: Layers, disabled: !hasWindows, run: session.cascadeWindows },
                { id: 'show-desktop', label: 'Show desktop', icon: Minimize2, disabled: !hasWindows, run: session.minimizeAll },
                { id: 'close-all', label: 'Close all windows', icon: XCircle, disabled: !hasWindows, danger: true, run: session.closeAll },
                { id: 'sep-2', separator: true },
                { id: 'shortcuts', label: 'Keyboard shortcuts', icon: Keyboard, run: () => setOverlay('shortcuts') },
                { id: 'exit', label: 'Return to Mission Control', icon: LogOut, run: exitToMissionControl },
            ],
        });
    }, [openedApplications.length, session, exitToMissionControl]);

    const openIconMenu = useCallback((event, app) => {
        event.preventDefault();
        event.stopPropagation();

        const opened = openedApplications.find((current) => current.id === app.id);

        setContextMenu({
            x: event.clientX,
            y: event.clientY,
            items: [
                {
                    id: 'open',
                    label: opened ? `Focus ${app.name}` : `Open ${app.name}`,
                    icon: opened ? PanelsTopLeft : Play,
                    run: () => session.openApplication(app),
                },
                {
                    id: 'minimize',
                    label: 'Minimize',
                    icon: Minus,
                    disabled: !opened || opened.minimized,
                    run: () => session.minimizeApplication(app.id),
                },
                {
                    id: 'close',
                    label: 'Close',
                    icon: XCircle,
                    disabled: !opened,
                    danger: true,
                    run: () => session.closeApplication(app.id),
                },
            ],
        });
    }, [openedApplications, session]);

    /* ── Command palette + shortcuts ─────────────────────────────────── */

    const commands = useMemo(() => {
        return [
            { id: 'tile', title: 'Tile windows', subtitle: 'Fit every open window into a grid', icon: LayoutGrid, keywords: 'arrange grid layout', shortcut: 'Ctrl Alt T', run: session.tileWindows },
            { id: 'cascade', title: 'Cascade windows', subtitle: 'Restack windows from the top left', icon: Layers, keywords: 'arrange stack', run: session.cascadeWindows },
            { id: 'show-desktop', title: 'Show desktop', subtitle: 'Minimize everything', icon: Minimize2, keywords: 'hide minimize all', shortcut: 'Ctrl Alt D', run: session.minimizeAll },
            { id: 'switcher', title: 'Switch window', subtitle: 'Jump to another open window', icon: PanelsTopLeft, keywords: 'alt tab change focus', shortcut: 'Ctrl `', run: () => setOverlay('switcher') },
            { id: 'close-all', title: 'Close all windows', subtitle: 'Clear the workspace', icon: XCircle, keywords: 'quit exit clear', run: session.closeAll },
            { id: 'shortcuts', title: 'Keyboard shortcuts', subtitle: 'Every key the shell listens for', icon: Keyboard, keywords: 'help keys hotkeys', run: () => setOverlay('shortcuts') },
            { id: 'exit', title: 'Return to Mission Control', subtitle: 'Leave the workspace', icon: LogOut, keywords: 'quit leave mission back', run: exitToMissionControl },
        ];
    }, [openedApplications.length, session, exitToMissionControl]);

    const hotkeys = useMemo(() => {
        const withActive = (action) => () => {
            if (activeAppId) action(activeAppId);
        };

        const bindings = {
            [comboFor('palette')]: () => toggleOverlay('palette'),
            // Opens rather than toggles: once the switcher is up it owns the
            // key itself, so holding Ctrl and tapping ` walks the cards.
            [comboFor('switcher')]: () => openedApplications.length > 0 && setOverlay('switcher'),
            [comboFor('shortcuts')]: () => toggleOverlay('shortcuts'),
            [comboFor('snapLeft')]: withActive((id) => session.snapApplication(id, 'left')),
            [comboFor('snapRight')]: withActive((id) => session.snapApplication(id, 'right')),
            [comboFor('maximize')]: withActive(session.toggleMaximize),
            [comboFor('minimize')]: withActive(session.minimizeApplication),
            [comboFor('close')]: withActive(session.closeApplication),
            [comboFor('tile')]: session.tileWindows,
            [comboFor('showDesktop')]: session.minimizeAll,
            escape: () => {
                closeOverlay();
                setContextMenu(null);
            },
        };

        // Alt+1..9 launches the nth tool in the incident's own application
        // order — the same order the icon column and launcher show.
        applications.slice(0, 9).forEach((app, index) => {
            bindings[`alt+${index + 1}`] = () => session.openApplication(app);
        });

        return bindings;
    }, [applications, openedApplications.length, activeAppId, session, toggleOverlay, closeOverlay]);

    useHotkeys(hotkeys, !booting);

    /* ── Render ──────────────────────────────────────────────────────── */

    return (
        <div className="desktop">
            <Wallpaper wallpaper={wallpaper} />

            <div className="desktop-surface" onContextMenu={openDesktopMenu}>
                <div className="desktop-icons">
                    <span className="desktop-icons__label">Toolkit</span>
                    {applications.map((app, index) => {
                        const opened = openedApplications.find((current) => current.id === app.id);

                        return (
                            <DesktopIcon
                                key={app.id}
                                app={app}
                                index={index}
                                isRunning={Boolean(opened)}
                                isActive={app.id === activeAppId}
                                onClick={() => session.openApplication(app)}
                                onContextMenu={(event) => openIconMenu(event, app)}
                            />
                        );
                    })}
                </div>

                <CaseHud openedApplications={openedApplications} applicationCount={applications.length} />
            </div>

            <WindowManager
                openedApplications={openedApplications}
                activeAppId={activeAppId}
                onClose={session.closeApplication}
                onFocus={session.focusApplication}
                onMinimize={session.minimizeApplication}
                onMaximizeToggle={session.toggleMaximize}
                onDragEnd={handleDragEnd}
                onResizeEnd={handleResizeEnd}
                onSnapHint={setSnapZone}
            />

            <SnapPreview zone={snapZone} />

            <Taskbar
                applications={applications}
                openedApplications={openedApplications}
                activeAppId={activeAppId}
                feed={feed}
                onSelect={session.selectApplication}
                onLaunch={session.openApplication}
                onOpenPalette={() => setOverlay('palette')}
                onOpenShortcuts={() => setOverlay('shortcuts')}
                onExit={exitToMissionControl}
            />

            <Toasts toasts={feed.toasts} onDismiss={feed.dismissToast} />

            {overlay === 'palette' && (
                <CommandPalette
                    applications={applications}
                    openedApplications={openedApplications}
                    commands={commands}
                    onLaunch={session.openApplication}
                    onClose={closeOverlay}
                />
            )}

            {overlay === 'switcher' && (
                <WindowSwitcher
                    openedApplications={openedApplications}
                    activeAppId={activeAppId}
                    onSelect={session.restoreApplication}
                    onClose={closeOverlay}
                />
            )}

            {overlay === 'shortcuts' && <ShortcutsOverlay onClose={closeOverlay} />}

            {contextMenu && (
                <ContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    items={contextMenu.items}
                    onClose={() => setContextMenu(null)}
                />
            )}

            {booting && <BootSequence investigation={investigation} onFinish={handleBootFinish} />}
        </div>
    );
};

export default Desktop;
