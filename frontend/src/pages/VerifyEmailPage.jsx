import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

const VerifyEmailPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const hasVerified = useRef(false);
  const [verificationStatus, setVerificationStatus] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {

  if (hasVerified.current) return;

  hasVerified.current = true;

  const verifyEmail = async () => {

    const token = searchParams.get("token");

    if (!token) {

      setVerificationStatus(false);

      setErrorMessage(
        "No verification token found."
      );

      return;

    }

    try {

      const res = await fetch(

        `https://localhost:7003/api/user/verify-email?token=${token}`,

        { method: "GET" }

      );

      if (res.ok) {

        setVerificationStatus(true);

        setTimeout(() =>

          navigate("/login?verified=true"),

          4000

        );

      }

      else {

        const errorText = await res.text();

        setVerificationStatus(false);

        setErrorMessage(

          errorText ||

          "Invalid or expired token"

        );

      }

    }

    catch {

      setVerificationStatus(false);

      setErrorMessage(

        "Server connection error"

      );

    }

  };

  verifyEmail();

}, [searchParams, navigate]);

  return (
    <div className="bg-gray-50 font-sans text-gray-900 min-h-screen flex flex-col relative overflow-hidden">
      
      {/* Optional: Add these keyframes to your global CSS for the 'animate-fade-in' class */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fadeIn 0.5s ease-out forwards;
        }
      `}</style>

      {/* Background Decor */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-blue-50 rounded-full blur-3xl opacity-50"></div>
      <div className="absolute bottom-[-10%] right-[-5%] w-72 h-72 bg-purple-50 rounded-full blur-3xl opacity-50"></div>

      <main className="flex-grow flex items-center justify-center p-6 relative z-10">
        <div className="w-full max-w-md">
          <div className="bg-white p-10 shadow-2xl rounded-2xl border border-gray-100 relative overflow-hidden text-center">
            
            {/* Top decorative gradient bar */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 to-purple-600"></div>

            {/* --- LOADING STATE --- */}
            {verificationStatus === null && (
              <div className="py-10">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-6"></div>
                <h2 className="text-xl font-bold text-gray-800 mb-2">Verifying your email</h2>
                <p className="text-gray-500 text-sm">Communicating with the server...</p>
              </div>
            )}

            {/* --- SUCCESS STATE --- */}
            {verificationStatus === true && (
              <div className="py-6 animate-fade-in">
                <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-green-100">
                  <span className="material-symbols-outlined text-green-500 text-5xl">verified</span>
                </div>
                <h1 className="text-2xl font-bold text-gray-800 mb-3">Email Verified!</h1>
                <p className="text-gray-600 text-sm mb-8 px-4">
                  Your account is now active. You're ready to start your C++ learning journey.
                </p>
                <Link 
                  to="/login" 
                  className="w-full block bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3.5 rounded-lg font-bold shadow-md hover:opacity-90 transition-all"
                >
                  Go to Login
                </Link>
                <p className="text-xs text-gray-400 mt-6">Redirecting you automatically in a few seconds...</p>
              </div>
            )}

            {/* --- FAILURE STATE --- */}
            {verificationStatus === false && (
              <div className="py-6 animate-fade-in">
                <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-100">
                  <span className="material-symbols-outlined text-red-500 text-5xl">error</span>
                </div>
                <h2 className="text-2xl font-bold text-red-600 mb-3">Verification Failed</h2>
                <p className="text-gray-600 text-sm mb-8 px-4">
                  {errorMessage}
                </p>
                <div className="space-y-3">
                  <Link 
                    to="/register" 
                    className="w-full block bg-gray-800 text-white py-3 rounded-lg font-bold hover:bg-gray-900 transition-all"
                  >
                    Back to Registration
                  </Link>
                  <Link to="/support" className="text-sm text-gray-500 hover:text-blue-600 font-medium block transition-colors">
                    Need help? Contact support
                  </Link>
                </div>
              </div>
            )}

          </div>
        </div>
      </main>
    </div>
  );
};

export default VerifyEmailPage;