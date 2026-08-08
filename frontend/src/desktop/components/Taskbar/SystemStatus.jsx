import React from 'react';
import { Wifi, BatteryFull } from 'lucide-react';

/**
 * SystemStatus.jsx
 * Static placeholder indicators — network and power. Each becomes a real
 * data-driven indicator later without changing its position in the taskbar.
 */
const SystemStatus = () => {
    return (
        <div className="system-status">
            <span className="system-status__item">
                <Wifi size={13} strokeWidth={2} />
                Online
            </span>
            <span className="system-status__item">
                <BatteryFull size={13} strokeWidth={2} />
                100%
            </span>
        </div>
    );
};

export default SystemStatus;
