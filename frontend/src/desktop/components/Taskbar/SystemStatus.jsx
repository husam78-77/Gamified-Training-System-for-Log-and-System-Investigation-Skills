import React from 'react';
import { ShieldCheck } from 'lucide-react';

/**
 * SystemStatus.jsx
 * A single, honest indicator: this workspace is an isolated investigation
 * sandbox. Earlier drafts of this bar showed a synthetic "load %" derived
 * from window count and a static "uplink" light — neither reflected
 * anything real, so they were cut (dev rule: don't invent backend
 * functionality merely to create visual indicators). What remains is a
 * fact that is actually true for the whole session, not a number that
 * pretends to update.
 */
const SystemStatus = () => {
    return (
        <span className="system-status__item" title="This workspace runs in an isolated investigation sandbox">
            <ShieldCheck size={13} strokeWidth={2} />
            Sandboxed
        </span>
    );
};

export default SystemStatus;
