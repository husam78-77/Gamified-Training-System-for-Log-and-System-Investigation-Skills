import React from 'react';

/**
 * EmailList.jsx
 * Renders the list of emails and reports clicks on an email back to the parent.
 */
const EmailList = ({ emails, selectedId, onSelect }) => {
    return (
        <div className="email-list">
            {emails.map((email) => (
                <button
                    key={email.id}
                    type="button"
                    className={
                        'email-list__item' +
                        (email.id === selectedId ? ' email-list__item--active' : '')
                    }
                    onClick={() => onSelect(email.id)}
                >
                    <span className="email-list__from">{email.from?.name}</span>
                    <span className="email-list__subject">{email.subject}</span>
                    <span className="email-list__timestamp">{email.timestamp}</span>
                </button>
            ))}
        </div>
    );
};

export default EmailList;
