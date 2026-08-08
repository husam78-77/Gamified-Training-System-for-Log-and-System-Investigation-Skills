import React, { useState, useEffect } from 'react';

/**
 * Clock.jsx
 * Current local time (hours:minutes:seconds) and date, ticking every second.
 */
const Clock = () => {
    const [now, setNow] = useState(() => new Date());

    useEffect(() => {
        const interval = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(interval);
    }, []);

    const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const date = now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });

    return (
        <div className="clock">
            <span className="clock__time">{time}</span>
            <span className="clock__date">{date}</span>
        </div>
    );
};

export default Clock;
