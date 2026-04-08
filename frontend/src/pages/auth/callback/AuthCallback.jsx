import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';

export default function AuthCallback() {
    const navigate = useNavigate();
    const { login } = useAuth();
    const processed = useRef(false);

    useEffect(() => {
        if (processed.current) return;
        processed.current = true;

        const params = new URLSearchParams(window.location.search);
        const token = params.get('token');
        const userRaw = params.get('user');

        if (token && userRaw) {
            try {
                const user = JSON.parse(decodeURIComponent(userRaw));
                login(user, token);
                navigate('/dashboard', { replace: true });
            } catch {
                navigate('/login', { replace: true });
            }
        } else {
            navigate('/login', { replace: true });
        }
    }, []);

    return (
        <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <span className="material-symbols-outlined text-[#FF003C] text-5xl animate-spin">progress_activity</span>
                <p className="font-label text-xs tracking-widest text-[#00FFFF]/60 uppercase">Verifying Credentials...</p>
            </div>
        </div>
    );
}