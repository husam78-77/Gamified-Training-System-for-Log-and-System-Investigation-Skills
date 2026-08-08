import React, { useState } from 'react';
import { Bell } from 'lucide-react';

/**
 * NotificationCenter.jsx
 * Owns the notifications[] list. Only the architecture exists for now —
 * a count badge, no popup, no dropdown. Future sources (new email, alerts)
 * push into this same state without changing its shape.
 */
const NotificationCenter = () => {
    const [notifications] = useState([]);

    return (
        <div className="notification-center" title="Notifications">
            <Bell size={15} strokeWidth={2} />
            {notifications.length > 0 && (
                <span className="notification-center__count">{notifications.length}</span>
            )}
        </div>
    );
};

export default NotificationCenter;
