import React, { useState } from 'react';

/**
 * NotificationCenter.jsx
 * Owns the notifications[] list. Only the architecture exists for now —
 * a count badge, no popup, no dropdown. Future sources (new email, alerts)
 * push into this same state without changing its shape.
 */
const NotificationCenter = () => {
    const [notifications] = useState([]);

    return (
        <div className="notification-center">
            <span className="notification-center__count">{notifications.length}</span>
        </div>
    );
};

export default NotificationCenter;
