import React from 'react';
import RunningApplications from './RunningApplications';

/**
 * TaskbarCenter.jsx
 * Center region — currently just RunningApplications, but kept as its
 * own component so other center-region features can be added as siblings
 * without touching Taskbar.
 */
const TaskbarCenter = ({ openedApplications = [], activeAppId = null, onSelect }) => {
    return (
        <div className="taskbar-center">
            <RunningApplications openedApplications={openedApplications} activeAppId={activeAppId} onSelect={onSelect} />
        </div>
    );
};

export default TaskbarCenter;
