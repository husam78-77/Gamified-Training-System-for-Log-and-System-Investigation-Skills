import React from 'react';

/**
 * BrowserViewer.jsx
 * Right-pane content view. Renders the currently selected page — an
 * article's text, or a menu page's linked items — straight from
 * browser.json. No rendering beyond plain text/links: no markdown, no
 * embedded media.
 */
const BrowserViewer = ({ page, pages, onNavigate }) => {
    if (!page) {
        return <div className="browser-viewer browser-viewer--empty">Page not found.</div>;
    }

    if (page.type === 'menu') {
        return (
            <div className="browser-viewer">
                <h2 className="browser-viewer__title">{page.title}</h2>
                <ul className="browser-viewer__menu">
                    {page.items.map((id) => {
                        const item = pages.find((p) => p.id === id);
                        if (!item) return null;
                        return (
                            <li key={id}>
                                <button
                                    type="button"
                                    className="browser-viewer__menu-link"
                                    onClick={() => onNavigate(id)}
                                >
                                    {item.title}
                                </button>
                            </li>
                        );
                    })}
                </ul>
            </div>
        );
    }

    return (
        <div className="browser-viewer">
            <h2 className="browser-viewer__title">{page.title}</h2>
            <div className="browser-viewer__content">{page.content}</div>
        </div>
    );
};

export default BrowserViewer;
