import React from 'react';
import Clock from './Clock';
import NotificationCenter from './NotificationCenter';
import SystemStatus from './SystemStatus';

/**
 * TaskbarRight.jsx
 * System-info region — SystemStatus, NotificationCenter, Clock. Each is
 * self-contained, so new indicators can be added as siblings here without
 * touching Taskbar.
 */
const TaskbarRight = ({ feed, panelOpen, onTogglePanel, onClosePanel }) => {
    return (
        <div className="taskbar-right">
            <SystemStatus />
            <NotificationCenter
                feed={feed}
                open={panelOpen}
                onToggle={onTogglePanel}
                onClose={onClosePanel}
            />
            <Clock />
        </div>
    );
};

export default TaskbarRight;
