import React from 'react';
import '@xterm/xterm/css/xterm.css';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LandingPage from './pages/LandingPage/LandingPage';
import LoginPage from './pages/Login/LoginPage';
import RegisterPage from './pages/RegisterPage/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import Dashboard from './pages/Dashboard/Dashboard';
import VerifyEmailPage from './pages/VerifyEmailPage';
import AuthCallback from './pages/auth/callback/AuthCallback';
import Layout from './components/layout/Layout';
import Mission from './pages/Mission/MissionDashboard/MissionDashboard';
import Sequence from './pages/Mission/MissionDashboard/MissionSequence';
import Briefing from './pages/Mission/MissionDashboard/MissionBriefing';
import Game from './pages/GamingEnvironment/GamingEnvironment';
import Profile from './pages/Profile/Profile';
import Progress from './pages/Progress/Progress'

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            {/* ── Public routes ──────────────────────────── */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/verify-email" element={<VerifyEmailPage />} />
            <Route path="/auth/callback" element={<AuthCallback />} />

            {/* ── Protected routes ───────────────────────── */}
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Layout><Dashboard /></Layout>
              </ProtectedRoute>
            } />

            <Route path="/mission" element={
              <ProtectedRoute>
                <Layout><Mission /></Layout>
              </ProtectedRoute>
            } />

            {/* Type param: /sequence/bruteforce, /sequence/script, etc. */}
            <Route path="/sequence/:type" element={
              <ProtectedRoute>
                <Layout><Sequence /></Layout>
              </ProtectedRoute>
            } />

            {/* Receives state: { scenario_id, mode, type } from Sequence */}
            <Route path="/briefing/:scenario_id" element={
              <ProtectedRoute>
                <Layout><Briefing /></Layout>
              </ProtectedRoute>
            } />

            {/* Full screen — no Layout wrapper (game owns the full viewport) */}
            {/* Receives state: { scenario_id, mode } from Briefing */}
            <Route path="/game/:scenario_id" element={
              <ProtectedRoute>
                <Game />
              </ProtectedRoute>
            } />

            <Route path="/profile" element={
              <ProtectedRoute>
                <Layout><Profile /></Layout>
              </ProtectedRoute>
            } />

            <Route path="/progress" element={
              <ProtectedRoute>
                <Layout><Progress /></Layout>
              </ProtectedRoute>
            } />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;