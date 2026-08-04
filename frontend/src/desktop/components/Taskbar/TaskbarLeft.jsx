import React from 'react';

/**
 * TaskbarLeft.jsx
 * Branding / system menu region. Static label for now — becomes a
 * clickable start/user menu later without changing Taskbar or its siblings.
 */
const TaskbarLeft = () => {
    return (
        <div className="taskbar-left">
            <span className="taskbar-left__brand">KINETIC BREACH</span>
        </div>
    );
};

export default TaskbarLeft;
