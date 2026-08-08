import React from 'react';
import { Radar } from 'lucide-react';

/**
 * TaskbarLeft.jsx
 * Branding / system menu region. Static label for now — becomes a
 * clickable start/user menu later without changing Taskbar or its siblings.
 */
const TaskbarLeft = () => {
    return (
        <div className="taskbar-left">
            <Radar size={16} strokeWidth={2} className="taskbar-left__icon" />
            <span className="taskbar-left__brand">KINETIC BREACH</span>
            <span className="taskbar-left__live" aria-hidden="true" />
        </div>
    );
};

export default TaskbarLeft;
