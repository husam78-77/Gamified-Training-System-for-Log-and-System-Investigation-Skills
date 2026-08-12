import React from 'react';
import { Radar, ChevronDown } from 'lucide-react';
import LauncherMenu from './LauncherMenu';

/**
 * TaskbarLeft.jsx
 * Branding + the system launcher. The brand itself is the launcher button
 * (like a start button), and the menu it opens is a sibling component so
 * this file stays about the bar, not about the menu's contents.
 */
const TaskbarLeft = ({
    applications,
    openedApplications,
    menuOpen,
    onToggleMenu,
    onCloseMenu,
    onLaunch,
    onOpenPalette,
    onOpenShortcuts,
    onExit,
}) => {
    return (
        <div className="taskbar-left">
            <button
                type="button"
                className={'taskbar-left__launcher' + (menuOpen ? ' taskbar-left__launcher--open' : '')}
                onClick={onToggleMenu}
                aria-expanded={menuOpen}
                aria-label="Open system launcher"
            >
                <Radar size={15} strokeWidth={2} className="taskbar-left__icon" />
                <span className="taskbar-left__brand">KINETIC BREACH</span>
                <ChevronDown size={12} strokeWidth={2.5} className="taskbar-left__caret" />
            </button>

            {menuOpen && (
                <LauncherMenu
                    applications={applications}
                    openedApplications={openedApplications}
                    onClose={onCloseMenu}
                    onLaunch={onLaunch}
                    onOpenPalette={onOpenPalette}
                    onOpenShortcuts={onOpenShortcuts}
                    onExit={onExit}
                />
            )}
        </div>
    );
};

export default TaskbarLeft;
