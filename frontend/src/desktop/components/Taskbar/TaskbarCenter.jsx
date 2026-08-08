import React from 'react';
import { Search } from 'lucide-react';
import RunningApplications from './RunningApplications';

/**
 * TaskbarCenter.jsx
 * Center region — the running-application strip, plus the search affordance
 * that makes the command palette discoverable for players who never guess a
 * hotkey. Kept as its own component so center-region features can be added
 * as siblings without touching Taskbar.
 */
const TaskbarCenter = ({ openedApplications = [], activeAppId = null, onSelect, onOpenPalette }) => {
    return (
        <div className="taskbar-center">
            <button type="button" className="taskbar-search" onClick={onOpenPalette}>
                <Search size={13} strokeWidth={2} />
                <span className="taskbar-search__label">Search tools & actions</span>
                <kbd className="taskbar-search__key">Ctrl K</kbd>
            </button>
            <RunningApplications
                openedApplications={openedApplications}
                activeAppId={activeAppId}
                onSelect={onSelect}
            />
        </div>
    );
};

export default TaskbarCenter;
