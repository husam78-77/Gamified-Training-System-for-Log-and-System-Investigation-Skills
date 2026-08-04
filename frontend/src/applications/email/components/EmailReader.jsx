import React from 'react';

/**
 * EmailReader.jsx
 * Renders the currently selected email's full content.
 */
const EmailReader = ({ email }) => {
    if (!email) {
        return <div className="email-reader email-reader--empty">Select an email to read it.</div>;
    }

    return (
        <div className="email-reader">
            <div className="email-reader__subject">{email.subject}</div>
            <div className="email-reader__meta">
                <span className="email-reader__from">
                    {email.from?.name} &lt;{email.from?.email}&gt;
                </span>
                <span className="email-reader__timestamp">{email.timestamp}</span>
            </div>
            <div className="email-reader__body">{email.body}</div>
        </div>
    );
};

export default EmailReader;
