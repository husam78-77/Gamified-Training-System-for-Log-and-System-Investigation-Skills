import React from 'react';
import TaskbarLeft from './TaskbarLeft';
import TaskbarCenter from './TaskbarCenter';
import TaskbarRight from './TaskbarRight';
import '../../styles/taskbar.css';

/**
 * Taskbar.jsx
 * Root of the system bar — a pure layout shell (Left / Center / Right).
 * Each region owns its own concerns, so new taskbar features (start menu,
 * window minimize/restore, notification popovers, ...) slot into the
 * region they belong to without touching Taskbar itself.
 *
 * openedApplications is passed straight through from Desktop — the same
 * list WindowManager renders windows from — so RunningApplications always
 * reflects exactly what's open.
 */
const Taskbar = ({ openedApplications = [] }) => {
    return (
        <div className="taskbar">
            <TaskbarLeft />
            <TaskbarCenter openedApplications={openedApplications} />
            <TaskbarRight />
        </div>
    );
};

export default Taskbar;
