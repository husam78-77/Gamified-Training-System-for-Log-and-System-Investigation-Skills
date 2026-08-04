import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useInvestigation } from '../../context/InvestigationContext';
import { useTerminal } from '../../hooks/useTerminal';
import TerminalPanel from '../../components/TerminalPanel';
import { fetchFullScenarioData } from '../../services/scenarioService';
import { abandonSession } from '../../services/sessionService';
import './styles/terminal-app.css';

/**
 * TerminalApp.jsx
 * Mounts the existing terminal (useTerminal + TerminalPanel) inside the
 * Desktop Window System. No terminal logic lives here — this component
 * only reads the session/scenario Desktop already loaded (via
 * useInvestigation) and hands them to the same hooks/component
 * GamingEnvironment already uses. It does not create or resume a session
 * itself — that already happened once, before Desktop ever mounted.
 */
const TerminalApp = () => {
    const navigate = useNavigate();
    const { token } = useAuth();
    const { investigation } = useInvestigation();
    const [scenarioData, setScenarioData] = useState(null);
    const [exiting, setExiting] = useState(false);

    useEffect(() => {
        if (!investigation?.scenarioId || !token) return;

        let cancelled = false;
        fetchFullScenarioData(investigation.scenarioId, token)
            .then((data) => {
                if (!cancelled) setScenarioData(data);
            })
            .catch(() => {
                // Terminal still mounts with an empty filesystem on failure.
            });

        return () => {
            cancelled = true;
        };
    }, [investigation?.scenarioId, token]);

    const terminal = useTerminal({
        sessionId: investigation?.sessionId,
        token,
        initialFiles: scenarioData?.virtualFiles || [],
    });

    // Temporary way to close out the active session from the Desktop —
    // calls the same sessionService.abandonSession the old GamingEnvironment
    // exit button used (via useSession.abandon), just without its
    // confirmation modal.
    const handleExit = useCallback(async () => {
        if (!investigation?.sessionId) {
            navigate('/mission');
            return;
        }
        setExiting(true);
        try {
            await abandonSession(investigation.sessionId, token);
        } catch (err) {
            // Navigate away regardless — this is a best-effort cleanup.
        }
        navigate('/mission');
    }, [investigation?.sessionId, token, navigate]);

    return (
        <div className="terminal-app">
            <div className="terminal-app__panel">
                <TerminalPanel
                    terminalRef={terminal.terminalRef}
                    currentPath={terminal.currentPath}
                    isReady={terminal.isReady}
                    isProcessing={terminal.isProcessingState}
                    hasNewDiscovery={false}
                />
            </div>
            <div className="terminal-app__footer">
                <button
                    type="button"
                    className="terminal-app__exit"
                    onClick={handleExit}
                    disabled={exiting}
                >
                    {exiting ? 'ENDING…' : 'EXIT SESSION'}
                </button>
            </div>
        </div>
    );
};

export default TerminalApp;
