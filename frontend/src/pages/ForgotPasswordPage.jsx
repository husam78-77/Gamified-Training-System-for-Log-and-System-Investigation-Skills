import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const ForgotPasswordPage = () => {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Frontend validation matching your C# backend logic
  const isValidEmail = (email) => {
    return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(""); // Clear any previous errors
    
    const email = e.target.email.value.trim();

    // 1. Frontend Validation
    if (!email) {
      setErrorMsg("Email is required.");
      return;
    }

    if (!isValidEmail(email)) {
      setErrorMsg("Invalid email format.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch(
        "https://localhost:7003/api/user/forgot-password",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            email: email
          })
        }
      );

      // 2. Handle Backend Response
      if (res.ok) {
        // Backend returns OK (for security reasons, whether it exists or not)
        setIsSubmitted(true);
      } else {
        // Capture specific backend error messages (e.g. from BadRequest)
        const backendError = await res.text();
        setErrorMsg(backendError || "An error occurred while sending the request.");
      }

    } catch (err) {
      console.error(err);
      setErrorMsg("Cannot connect to the server. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-surface font-body text-on-surface min-h-screen flex flex-col relative overflow-hidden">
      
      {/* Background Graphic (Subtle AI/Tech nodes) */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-secondary/10 rounded-full blur-3xl opacity-50 pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-5%] w-72 h-72 bg-primary/10 rounded-full blur-3xl opacity-50 pointer-events-none"></div>

      {/* Simplified Navbar */}
      <header className="w-full px-8 py-6 flex justify-between items-center z-50 max-w-screen-2xl mx-auto absolute top-0 left-0 right-0">
        <Link to="/" className="flex items-center gap-2">
          <span className="font-headline text-2xl font-bold text-primary tracking-tight">IntelliCode Learn</span>
        </Link>
        <div className="hidden md:flex gap-6 items-center">
          <Link to="/login" className="font-headline font-semibold text-sm tracking-wide text-secondary hover:text-primary transition-colors">Sign In</Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow flex items-center justify-center p-6 relative z-10 mt-16">
        <div className="w-full max-w-md">
          
          {/* Card Container */}
          <div className="bg-white p-10 sm:p-12 shadow-2xl rounded-2xl border border-outline-variant/10 relative overflow-hidden">
            
            {/* Top color bar decorative element */}
            <div className="absolute top-0 left-0 w-full h-1 modern-gradient"></div>

            {/* Icon Header */}
            <div className="mb-8 flex justify-center">
              <div className="w-16 h-16 bg-secondary/10 rounded-full flex items-center justify-center">
                <span className="material-symbols-outlined text-secondary text-3xl">lock_reset</span>
              </div>
            </div>

            <div className="mb-6 text-center">
              <h1 className="font-headline text-3xl font-bold text-primary tracking-tight mb-3">Reset Password</h1>
              <p className="text-secondary/80 font-body text-sm leading-relaxed">
                Enter the email address associated with your account, and we'll send you a link to reset your password.
              </p>
            </div>

            {/* ERROR MESSAGE BOX */}
            {errorMsg && (
              <div className="mb-6 p-4 bg-error-container border border-error/20 rounded-lg flex items-start gap-3 animate-fade-in">
                <span className="material-symbols-outlined text-on-error-container text-xl shrink-0">error</span>
                <p className="text-sm font-semibold text-on-error-container mt-0.5">{errorMsg}</p>
              </div>
            )}

            {!isSubmitted ? (
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Email Input */}
                <div className="group">
                  <label className="block font-headline text-sm font-semibold text-primary mb-2" htmlFor="email">
                    Email Address
                  </label>
                  <div className="relative">
                    <input 
                      className={`w-full bg-surface-container-low border ${errorMsg ? 'border-error focus:ring-error/20 focus:border-error' : 'border-outline-variant/30 focus:ring-secondary/20 focus:border-secondary'} rounded-lg focus:ring-2 transition-all duration-300 py-3 pl-4 pr-10 text-on-surface placeholder:text-outline-variant`}
                      id="email" 
                      name="email" 
                      placeholder="student@university.edu" 
                      type="text" // Changed to text so our custom Regex catches it before the browser does
                    />
                    <span className={`material-symbols-outlined absolute right-3 top-3.5 ${errorMsg ? 'text-error' : 'text-secondary/50'} text-xl pointer-events-none transition-colors`}>mail</span>
                  </div>
                </div>

                <div className="pt-2">
                  <button 
                    className="w-full modern-gradient py-3.5 px-6 text-white font-headline font-bold text-base rounded-lg shadow-md hover:shadow-lg hover:opacity-95 active:scale-[0.98] transition-all flex justify-center items-center gap-2 group disabled:opacity-70" 
                    type="submit"
                    disabled={isLoading}
                  >
                    {isLoading ? "Sending..." : "Send Reset Link"}
                    {!isLoading && <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">send</span>}
                  </button>
                </div>
              </form>
            ) : (
              /* Success Message State */
              <div className="bg-surface-container-low p-6 rounded-xl border border-secondary/20 text-center animate-fade-in">
                <span className="material-symbols-outlined text-4xl text-secondary mb-2">mark_email_read</span>
                <h3 className="font-headline font-bold text-primary mb-2">Check your inbox</h3>
                <p className="text-sm text-on-surface-variant">
                  If an account exists for that email, we have sent password reset instructions.
                </p>
              </div>
            )}

            {/* Back to Login Link */}
            <div className="mt-8 text-center">
              <Link to="/login" className="inline-flex items-center gap-2 text-sm font-semibold text-secondary hover:text-primary transition-colors group">
                <span className="material-symbols-outlined text-sm group-hover:-translate-x-1 transition-transform">arrow_back</span>
                Back to Login
              </Link>
            </div>
            
          </div>

          {/* Support Message */}
          <div className="mt-8 text-center px-4">
            <p className="text-xs text-outline-variant font-headline uppercase tracking-widest leading-loose">
              Having trouble? Contact <br/> <a href="mailto:support@intellicode.edu" className="text-secondary font-bold hover:underline">support@intellicode.edu</a>
            </p>
          </div>

        </div>
      </main>

    </div>
  );
};

export default ForgotPasswordPage;