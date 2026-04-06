import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [isValidToken, setIsValidToken] = useState(null);
  const [passwordsMatch, setPasswordsMatch] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // --- VALIDATION LOGIC (MATCHES BACKEND) ---
  const isStrongPassword = (password) => {
    const pattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
    return pattern.test(password);
  };

  // Validate token when page loads
  useEffect(() => {
    const validateToken = async () => {
      const token = searchParams.get("token");
      if (!token) {
        setIsValidToken(false);
        return;
      }

      try {
        const res = await fetch(
          `https://localhost:7003/api/user/validate-reset-token?token=${token}`
        );
        setIsValidToken(res.ok);
      } catch (err) {
        console.error(err);
        setIsValidToken(false);
      }
    };
    validateToken();
  }, [searchParams]);

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    
    const newPassword = e.target.newPassword.value;
    const confirmPassword = e.target.confirmPassword.value;

    // 1. Check Passwords Match
    if (newPassword !== confirmPassword) {
      setPasswordsMatch(false);
      setErrorMessage("Passwords do not match.");
      return;
    }
    setPasswordsMatch(true);

    // 2. Strong Password Validation (Mirroring Backend)
    if (!isStrongPassword(newPassword)) {
      setErrorMessage("Password must contain: 1 uppercase, 1 lowercase, 1 number, 1 special character and be at least 8 characters long.");
      return;
    }

    const token = searchParams.get("token");

    try {
      setLoading(true);
      const res = await fetch(
        "https://localhost:7003/api/user/reset-password",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token: token,
            newPassword: newPassword
          })
        }
      );

      if (res.ok) {
        // You could use a success state here, but a direct navigate works too
        navigate("/login?reset=success");
      } else {
        const errorText = await res.text();
        setErrorMessage(errorText || "Failed to reset password.");
      }
    } catch (err) {
      console.error(err);
      setErrorMessage("Server error. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-surface font-body text-on-surface min-h-screen flex flex-col relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-secondary/10 rounded-full blur-3xl opacity-50"></div>
      <div className="absolute bottom-[-10%] right-[-5%] w-72 h-72 bg-primary/10 rounded-full blur-3xl opacity-50"></div>

      <main className="flex-grow flex items-center justify-center p-6 relative z-10">
        <div className="w-full max-w-md">
          <div className="bg-white p-10 shadow-2xl rounded-2xl border relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 modern-gradient"></div>

            {isValidToken === null && (
              <div className="text-center py-10">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-secondary">Checking reset link...</p>
              </div>
            )}

            {isValidToken === false && (
              <div className="text-center">
                <span className="material-symbols-outlined text-red-500 text-5xl mb-4">link_off</span>
                <h2 className="font-headline text-xl font-bold text-red-600 mb-3">Invalid or expired link</h2>
                <p className="text-sm text-secondary mb-6">This reset link is no longer valid. Please request a new one.</p>
                <Link to="/forgot-password" size="lg" className="w-full block bg-primary text-white py-3 rounded-lg font-bold hover:opacity-90">
                  Request new link
                </Link>
              </div>
            )}

            {isValidToken === true && (
              <>
                <div className="mb-8 text-center">
                  <div className="w-16 h-16 bg-secondary/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-secondary/20">
                    <span className="material-symbols-outlined text-secondary text-3xl">lock_reset</span>
                  </div>
                  <h1 className="font-headline text-2xl font-bold text-primary mb-3">Create New Password</h1>
                  <p className="text-secondary text-sm">Enter a strong password for your account.</p>
                </div>

                {/* ERROR MESSAGE ALERT BOX */}
                {errorMessage && (
                  <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 flex items-center gap-3 animate-pulse-once">
                    <span className="material-symbols-outlined text-red-500 text-sm">error</span>
                    <p className="text-xs text-red-700 font-medium">{errorMessage}</p>
                  </div>
                )}

                <form onSubmit={handleResetPassword} className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-primary">New Password</label>
                    <input
                      type="password"
                      name="newPassword"
                      required
                      placeholder="••••••••"
                      className="w-full border border-outline-variant/30 rounded-lg p-3 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2 text-primary">Confirm Password</label>
                    <input
                      type="password"
                      name="confirmPassword"
                      required
                      placeholder="••••••••"
                      className={`w-full border rounded-lg p-3 transition-all ${
                        !passwordsMatch ? "border-red-500 focus:ring-red-200" : "border-outline-variant/30 focus:ring-primary/20"
                      }`}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className={`w-full modern-gradient text-white py-3.5 rounded-lg font-bold shadow-md transition-all ${
                      loading ? "opacity-70 cursor-not-allowed" : "hover:shadow-lg active:scale-[0.98]"
                    }`}
                  >
                    {loading ? "Updating Password..." : "Reset Password"}
                  </button>
                </form>

                <div className="mt-6 text-center">
                  <Link to="/login" className="text-secondary hover:text-primary text-sm font-semibold transition-colors">
                    Back to Login
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default ResetPasswordPage;