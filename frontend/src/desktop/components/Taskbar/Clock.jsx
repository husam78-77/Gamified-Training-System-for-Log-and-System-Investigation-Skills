import React, { useState, useEffect } from 'react';

/**
 * Clock.jsx
 * Current local time (hours:minutes), ticking every second.
 */
const Clock = () => {
    const [now, setNow] = useState(() => new Date());

    useEffect(() => {
        const interval = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(interval);
    }, []);

    const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return <div className="clock">{time}</div>;
};

export default Clock;
