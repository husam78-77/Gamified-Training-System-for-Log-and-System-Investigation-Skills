import React from 'react';
import { useDesktop } from '../hooks/useDesktop';
import { Desktop } from '../components';
import '../styles/desktop.css';

/**
 * DesktopPage.jsx
 * Owns data loading for the desktop. Desktop itself only renders.
 */
const DesktopPage = () => {
    const { desktop, loading, error } = useDesktop();

    if (loading) {
        return <div className="desktop-status">Loading...</div>;
    }

    if (error) {
        return <div className="desktop-status desktop-status--error">Error: {error}</div>;
    }

    return <Desktop desktop={desktop} />;
};

export default DesktopPage;
