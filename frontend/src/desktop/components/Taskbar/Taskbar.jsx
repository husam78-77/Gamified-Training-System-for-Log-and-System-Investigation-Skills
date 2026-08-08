import React, { useState, useCallback } from 'react';
import TaskbarLeft from './TaskbarLeft';
import TaskbarCenter from './TaskbarCenter';
import TaskbarRight from './TaskbarRight';
import '../../styles/taskbar.css';

/**
 * Taskbar.jsx
 * Root of the system bar — a layout shell (Left / Center / Right) plus the
 * one piece of state that genuinely belongs to the bar as a whole: which
 * drop-down panel is open. Only one may be open at a time, so the launcher
 * and the notification panel can't cover each other; each region still owns
 * everything else about its own contents.
 *
 * openedApplications/activeAppId are passed straight through from Desktop —
 * the same state WindowManager renders windows from — so RunningApplications
 * can never fall out of sync with what's actually open (dev rule #20).
 */
const Taskbar = ({
    applications = [],
    openedApplications = [],
    activeAppId = null,
    feed,
    onSelect,
    onLaunch,
    onOpenPalette,
    onOpenShortcuts,
    onExit,
}) => {
    const [openPanel, setOpenPanel] = useState(null);

    const togglePanel = useCallback((panel) => {
        setOpenPanel((current) => (current === panel ? null : panel));
    }, []);

    const closePanel = useCallback(() => setOpenPanel(null), []);

    return (
        <div className="taskbar">
            <TaskbarLeft
                applications={applications}
                openedApplications={openedApplications}
                menuOpen={openPanel === 'launcher'}
                onToggleMenu={() => togglePanel('launcher')}
                onCloseMenu={closePanel}
                onLaunch={onLaunch}
                onOpenPalette={onOpenPalette}
                onOpenShortcuts={onOpenShortcuts}
                onExit={onExit}
            />
            <TaskbarCenter
                openedApplications={openedApplications}
                activeAppId={activeAppId}
                onSelect={onSelect}
                onOpenPalette={onOpenPalette}
            />
            <TaskbarRight
                feed={feed}
                openedApplications={openedApplications}
                panelOpen={openPanel === 'notifications'}
                onTogglePanel={() => togglePanel('notifications')}
                onClosePanel={closePanel}
            />
        </div>
    );
};

export default Taskbar;
