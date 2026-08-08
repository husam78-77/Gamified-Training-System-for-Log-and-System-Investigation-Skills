import React, { useState, useEffect } from 'react';

/**
 * Clock.jsx
 * Current local time (hours:minutes:seconds) and date, ticking every second.
 * Seconds are split out so they can be rendered dimmer than the hours and
 * minutes — the readout stays glanceable while still showing the desktop is
 * live.
 */
const Clock = () => {
    const [now, setNow] = useState(() => new Date());

    useEffect(() => {
        const interval = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(interval);
    }, []);

    const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const date = now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });

    return (
        <div className="clock" title={now.toString()}>
            <span className="clock__time">
                {time}
                <span className="clock__seconds">:{seconds}</span>
            </span>
            <span className="clock__date">{date}</span>
        </div>
    );
};

export default Clock;
