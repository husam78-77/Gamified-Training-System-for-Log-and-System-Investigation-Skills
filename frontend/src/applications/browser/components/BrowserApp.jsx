import React, { useState, useEffect } from 'react';
import { useInvestigation } from '../../../context/InvestigationContext';
import { useBrowser } from '../hooks/useBrowser';
import BrowserSidebar from './BrowserSidebar';
import BrowserViewer from './BrowserViewer';
import '../styles/browser.css';

/**
 * BrowserApp.jsx
 * A Knowledge Browser, not a web browser — displays predefined pages
 * loaded from browser.json. No search, no URL bar, no internet, no
 * external requests.
 *
 * incidentId comes from the Investigation Context Desktop already loaded —
 * this component never fetches or hardcodes it itself.
 */
const BrowserApp = () => {
    const { investigation } = useInvestigation();
    const { homePage, pages, loading, error } = useBrowser(investigation?.incidentId);
    const [currentPageId, setCurrentPageId] = useState(null);

    useEffect(() => {
        if (!currentPageId && homePage) {
            setCurrentPageId(homePage);
        }
    }, [homePage, currentPageId]);

    if (loading) {
        return <div className="browser-status">Loading...</div>;
    }

    if (error) {
        return <div className="browser-status browser-status--error">Error: {error}</div>;
    }

    const homeMenu = pages.find((p) => p.id === homePage);
    const navOrder = homeMenu?.items || [];
    const articles = pages.filter((p) => p.type === 'article');
    const sidebarItems = navOrder.length > 0
        ? navOrder.map((id) => articles.find((a) => a.id === id)).filter(Boolean)
        : articles;

    const currentPage = pages.find((p) => p.id === currentPageId) || null;

    return (
        <div className="browser-app">
            <BrowserSidebar items={sidebarItems} currentPageId={currentPageId} onNavigate={setCurrentPageId} />
            <BrowserViewer page={currentPage} pages={pages} onNavigate={setCurrentPageId} />
        </div>
    );
};

export default BrowserApp;
