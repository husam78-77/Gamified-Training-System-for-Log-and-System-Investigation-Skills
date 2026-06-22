import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { exchangeOAuthCode } from '../../../services/authService';

export default function AuthCallback() {
    const navigate = useNavigate();
    const { login } = useAuth();
    const processed = useRef(false);

    useEffect(() => {
        if (processed.current) return;
        processed.current = true;

        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');

        if (!code) {
            navigate('/login', { replace: true });
            return;
        }

        // The redirect only carries a one-time exchange code — trade it for
        // the real token + user payload here, never in the URL itself.
        exchangeOAuthCode(code)
            .then(({ token, user }) => {
                login(user, token);
                navigate('/dashboard', { replace: true });
            })
            .catch(() => {
                navigate('/login', { replace: true });
            });
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