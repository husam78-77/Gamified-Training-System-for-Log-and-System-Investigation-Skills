import { useEffect, useState } from "react";
import axios from "axios";

export default function StatusPage() {
    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(true);

    const checkHealth = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/health`);
            setStatus({ ...res.data, ok: true });
        } catch (err) {
            setStatus({
                server: "online",
                database: "disconnected",
                error: err.message,
                ok: false,
            });
        }
        setLoading(false);
    };

    useEffect(() => { checkHealth(); }, []);

    return (
        <div style={styles.page}>
            <h1 style={styles.title}>System Status</h1>
            {loading ? (
                <p style={styles.loading}>Checking...</p>
            ) : (
                <div style={styles.card}>
                    <StatusRow label="Server" value={status.server} good={status.server === "online"} />
                    <StatusRow label="Database" value={status.database} good={status.database === "connected"} />
                    {status.db_name && <StatusRow label="DB Name" value={status.db_name} good={true} />}
                    {status.timestamp && <StatusRow label="Time" value={new Date(status.timestamp).toLocaleString()} good={true} />}
                    {status.error && <p style={styles.error}>⚠ {status.error}</p>}
                    <button style={styles.btn} onClick={checkHealth}>Refresh</button>
                </div>
            )}
        </div>
    );
}

function StatusRow({ label, value, good }) {
    return (
        <div style={styles.row}>
            <span style={styles.label}>{label}</span>
            <span style={{ ...styles.badge, background: good ? "#16a34a" : "#dc2626" }}>
                {value}
            </span>
        </div>
    );
}

const styles = {
    page: { minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#0f172a", fontFamily: "monospace" },
    title: { color: "#f8fafc", fontSize: "2rem", marginBottom: "2rem" },
    loading: { color: "#94a3b8", fontSize: "1.2rem" },
    card: { background: "#1e293b", borderRadius: "12px", padding: "2rem", minWidth: "360px", boxShadow: "0 4px 30px rgba(0,0,0,0.4)" },
    row: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" },
    label: { color: "#94a3b8", fontSize: "0.95rem" },
    badge: { color: "#fff", padding: "4px 14px", borderRadius: "20px", fontSize: "0.85rem", fontWeight: "bold" },
    error: { color: "#f87171", fontSize: "0.85rem", marginTop: "1rem" },
    btn: { marginTop: "1.5rem", width: "100%", padding: "10px", background: "#3b82f6", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "1rem" },
};