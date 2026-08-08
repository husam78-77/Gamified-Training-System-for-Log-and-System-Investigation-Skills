import React from 'react';
import { Wifi, Cpu, ShieldAlert } from 'lucide-react';

/**
 * SystemStatus.jsx
 * Live-feeling system indicators. Two of them are real readings of the
 * desktop's own state — the number of running applications, and a load
 * figure derived from it — and the uplink indicator is a static placeholder
 * that becomes data-driven later without changing its position in the bar.
 *
 * Nothing here polls the backend: the desktop should never spend a request
 * on decoration.
 */
const SystemStatus = ({ openedApplications = [] }) => {
    const running = openedApplications.length;

    // Deliberately synthetic: a stable, monotonic figure so the readout
    // reacts to what the player does instead of flickering randomly.
    const load = Math.min(99, 8 + running * 11);
    const strained = load >= 60;

    return (
        <div className="system-status">
            <span className="system-status__item" title="Secure uplink to the evidence network">
                <Wifi size={13} strokeWidth={2} />
                Uplink
            </span>
            <span
                className={'system-status__item' + (strained ? ' system-status__item--warn' : '')}
                title={`${running} application${running === 1 ? '' : 's'} running`}
            >
                <Cpu size={13} strokeWidth={2} />
                {load}%
            </span>
            <span className="system-status__item system-status__item--secure" title="Session is isolated and recorded">
                <ShieldAlert size={13} strokeWidth={2} />
                Contained
            </span>
        </div>
    );
};

export default SystemStatus;
