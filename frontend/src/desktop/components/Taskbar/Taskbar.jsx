import React from 'react';
import TaskbarLeft from './TaskbarLeft';
import TaskbarCenter from './TaskbarCenter';
import TaskbarRight from './TaskbarRight';
import '../../styles/taskbar.css';

/**
 * Taskbar.jsx
 * Root of the system bar — a pure layout shell (Left / Center / Right).
 * Each region owns its own concerns, so new taskbar features (start menu,
 * notification popovers, ...) slot into the region they belong to without
 * touching Taskbar itself.
 *
 * openedApplications/activeAppId are passed straight through from Desktop
 * — the same state WindowManager renders windows from — so
 * RunningApplications can never fall out of sync with what's actually open
 * (dev rule #20).
 */
const Taskbar = ({ openedApplications = [], activeAppId = null, onSelect }) => {
    return (
        <div className="taskbar">
            <TaskbarLeft />
            <TaskbarCenter openedApplications={openedApplications} activeAppId={activeAppId} onSelect={onSelect} />
            <TaskbarRight />
        </div>
    );
};

export default Taskbar;
