import React from 'react';

/**
 * BrowserSidebar.jsx
 * Left-pane navigation — one row per navigable page, driven entirely by
 * the order declared in browser.json's homePage menu. No URL bar, no
 * search: this is the whole navigation surface.
 */
const BrowserSidebar = ({ items, currentPageId, onNavigate }) => {
    return (
        <div className="browser-sidebar">
            {items.map((page) => (
                <button
                    key={page.id}
                    type="button"
                    className={
                        'browser-sidebar__item' +
                        (page.id === currentPageId ? ' browser-sidebar__item--active' : '')
                    }
                    onClick={() => onNavigate(page.id)}
                >
                    {page.title}
                </button>
            ))}
        </div>
    );
};

export default BrowserSidebar;
