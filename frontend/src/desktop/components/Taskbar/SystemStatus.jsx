import React from 'react';

/**
 * SystemStatus.jsx
 * Static placeholder indicators — network and power. Each becomes a real
 * data-driven indicator later without changing its position in the taskbar.
 */
const SystemStatus = () => {
    return (
        <div className="system-status">
            <span className="system-status__item">Network: Online</span>
            <span className="system-status__item">Power: 100%</span>
        </div>
    );
};

export default SystemStatus;
