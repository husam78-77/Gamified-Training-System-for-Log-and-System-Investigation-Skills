import React from 'react';
import { X } from 'lucide-react';
import { SHORTCUTS, SHORTCUT_GROUPS } from '../utils/shortcuts';
import { useDismissable } from '../hooks/useDismissable';

/**
 * ShortcutsOverlay.jsx
 * The keyboard help card. Renders utils/shortcuts.js directly — the same
 * list Desktop binds its handlers from — so it documents what is really
 * bound rather than a hand-written copy that drifts.
 */
const ShortcutsOverlay = ({ onClose }) => {
    const ref = useDismissable(onClose);

    return (
        <div className="shortcuts-backdrop">
            <div className="shortcuts" ref={ref} role="dialog" aria-label="Keyboard shortcuts">
                <div className="shortcuts__header">
                    <span className="shortcuts__title">Keyboard Shortcuts</span>
                    <button type="button" className="shortcuts__close" onClick={onClose} aria-label="Close">
                        <X size={14} strokeWidth={2.5} />
                    </button>
                </div>

                <div className="shortcuts__groups">
                    {SHORTCUT_GROUPS.map((group) => (
                        <section key={group} className="shortcuts__group">
                            <h3 className="shortcuts__group-title">{group}</h3>
                            {SHORTCUTS.filter((shortcut) => shortcut.group === group).map((shortcut) => (
                                <div key={shortcut.id} className="shortcuts__row">
                                    <span className="shortcuts__keys">
                                        {shortcut.keys.map((key) => (
                                            <kbd key={key}>{key}</kbd>
                                        ))}
                                    </span>
                                    <span className="shortcuts__description">{shortcut.description}</span>
                                </div>
                            ))}
                        </section>
                    ))}
                </div>

                <p className="shortcuts__note">
                    Shortcuts pause while you are typing inside an application — the Terminal and the
                    Report editor keep their own keys.
                </p>
            </div>
        </div>
    );
};

export default ShortcutsOverlay;
