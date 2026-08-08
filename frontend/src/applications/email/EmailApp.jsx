import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useInvestigation } from '../../context/InvestigationContext';
import { useEmails } from './hooks/useEmails';
import EmailList from './components/EmailList';
import EmailReader from './components/EmailReader';
import { logEvent } from '../../services/investigationService';
import './styles/email.css';

/**
 * EmailApp.jsx
 * Consumes /api/email and displays the incident's emails inside the
 * Email window: a message list on the left, the selected message on
 * the right. No read/unread state, no attachments, no sending.
 *
 * incidentId comes from the Investigation Context Desktop already loaded —
 * this component never fetches or hardcodes it itself.
 */
const EmailApp = () => {
    const { token } = useAuth();
    const { investigation } = useInvestigation();
    const { emails, loading, error } = useEmails(investigation?.incidentId);
    const [selectedId, setSelectedId] = useState(null);

    const handleSelect = useCallback((emailId) => {
        setSelectedId(emailId);
        logEvent('EMAIL_OPENED', { emailId }, token);
    }, [token]);

    useEffect(() => {
        if (!selectedId && emails.length > 0) {
            handleSelect(emails[0].id);
        }
    }, [emails, selectedId, handleSelect]);

    if (loading) {
        return <div className="email-status">Loading...</div>;
    }

    if (error) {
        return <div className="email-status email-status--error">Error: {error}</div>;
    }

    const selectedEmail = emails.find((email) => email.id === selectedId) || null;

    return (
        <div className="email-app">
            <EmailList emails={emails} selectedId={selectedId} onSelect={handleSelect} />
            <EmailReader email={selectedEmail} />
        </div>
    );
};

export default EmailApp;
