import React, { useLayoutEffect, useRef, useState } from 'react';
import { useDismissable } from '../hooks/useDismissable';

/**
 * ContextMenu.jsx
 * A single right-click menu used for both surfaces that have one — the empty
 * desktop and an application tile. It renders whatever item list it is
 * given ({ id, label, icon, danger, disabled, run }), so what the menu can
 * do is decided by Desktop, not here.
 *
 * The menu flips itself back inside the viewport after mounting, so a
 * right-click near the bottom or right edge never opens off-screen.
 */
const MENU_MARGIN = 8;

const ContextMenu = ({ x, y, items = [], onClose }) => {
    const ref = useDismissable(onClose);
    const measureRef = useRef(null);
    const [position, setPosition] = useState({ left: x, top: y });

    useLayoutEffect(() => {
        const rect = measureRef.current?.getBoundingClientRect();
        if (!rect) return;

        setPosition({
            left: Math.min(x, window.innerWidth - rect.width - MENU_MARGIN),
            top: Math.min(y, window.innerHeight - rect.height - MENU_MARGIN),
        });
    }, [x, y, items.length]);

    const attachRef = (node) => {
        ref.current = node;
        measureRef.current = node;
    };

    return (
        <div className="context-menu" ref={attachRef} style={position} role="menu">
            {items.map((item) =>
                item.separator ? (
                    <span key={item.id} className="context-menu__separator" aria-hidden="true" />
                ) : (
                    <button
                        key={item.id}
                        type="button"
                        role="menuitem"
                        className={'context-menu__item' + (item.danger ? ' context-menu__item--danger' : '')}
                        disabled={item.disabled}
                        onClick={() => {
                            onClose();
                            item.run?.();
                        }}
                    >
                        {item.icon && <item.icon size={13} strokeWidth={2} />}
                        <span className="context-menu__label">{item.label}</span>
                        {item.shortcut && <kbd className="context-menu__shortcut">{item.shortcut}</kbd>}
                    </button>
                )
            )}
        </div>
    );
};

export default ContextMenu;
