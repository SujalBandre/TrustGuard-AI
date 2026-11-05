import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink, Navigate, useLocation } from 'react-router-dom';
import {
  Shield, Search, Upload, BarChart2, LogOut, Cpu, User, FileText, Camera, Sun, Moon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import Landing from './pages/Landing';
import Login from './pages/Login';
import MissionControl from './pages/MissionControl';
import TrustBuyAnalyzer from './pages/TrustBuyAnalyzer';
import BatchAnalysis from './pages/BatchAnalysis';
import AdminReports from './pages/AdminReports';
import AnalystPanel from './pages/AnalystPanel';
import DamageClaimVerifier from './pages/DamageClaimVerifier';
import VerificationDashboard from './pages/VerificationDashboard';
import { PulseMonitor } from './components/PulseMonitor';
import { useTheme } from './hooks/useTheme';
import './index.css';

const ADMIN_NAV = [
  { to: '/', label: 'Mission Control', icon: Shield },
  { to: '/batch', label: 'Batch Analysis', icon: Upload },
  { to: '/damage-verifier', label: 'Damage Verifier', icon: Camera },
  { to: '/reports', label: 'Reports & Requests', icon: FileText },
];

const USER_NAV = [
  { to: '/trustbuy', label: 'Review Analyzer', icon: Search },
  { to: '/damage-verifier', label: 'Damage Verifier', icon: Camera },
];

const ANALYST_NAV = [
  { to: '/analyst', label: 'Analyst Inbox', icon: BarChart2 },
];

const OWNER_NAV = [
  { to: '/verification', label: 'Account Requests', icon: Shield },
];

function Sidebar({ modelLoaded, auth, setAuth, theme, toggleTheme }) {
  const isOwner = auth?.role === 'owner';
  const isAdmin = auth?.role === 'admin';
  const isAnalyst = auth?.role === 'analyst';
  const items = isOwner ? OWNER_NAV : isAdmin ? ADMIN_NAV : isAnalyst ? ANALYST_NAV : USER_NAV;

  const roleLabel = isOwner ? 'OWNER' : isAdmin ? 'ADMIN' : isAnalyst ? 'ANALYST' : 'USER';

  return (
    <motion.aside
      className="sidebar"
      initial={{ x: -250 }}
      animate={{ x: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      <div className="sidebar-logo">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '8px',
              background: 'linear-gradient(135deg, #C0392B, #8E44AD)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 15px rgba(124,58,237,0.3)',
            }}>
              <Shield size={18} color="#ffffff" />
            </div>
            <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>
              <span style={{ color: 'var(--text-primary)' }}>TrustGuard</span>
              <span style={{ color: '#C0392B' }}> AI</span>
            </h2>
          </div>

        </div>
        <p style={{ margin: '4px 0 0' }}>Intelligence Platform</p>
        <div style={{
          marginTop: '12px', padding: '5px 10px', borderRadius: '8px', display: 'inline-flex',
          alignItems: 'center', gap: '6px', fontSize: '0.7rem', fontWeight: 700,
          background: 'var(--accent-dim)', color: 'var(--accent-primary)',
          border: '1px solid var(--border)', fontFamily: 'var(--font-mono)',
        }}>
          {isOwner ? <Shield size={11} /> : isAdmin ? <Cpu size={11} /> : isAnalyst ? <BarChart2 size={11} /> : <User size={11} />}
          {roleLabel} · {auth?.username || roleLabel.toLowerCase()}
        </div>
      </div>

      <nav className="sidebar-nav">
        <span className="nav-section-label">
          {isOwner ? 'Owner Panel' : isAdmin ? 'Admin Panel' : isAnalyst ? 'Analyst Panel' : 'User Panel'}
        </span>
        {items.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} end={to === '/'}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <Icon size={18} /> {label}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-status">
        <PulseMonitor status={modelLoaded ? 'safe' : 'scanning'} />
        <div style={{ padding: '12px 4px 4px' }}>
          <div style={{ opacity: 0.5, marginBottom: '8px', fontSize: '0.65rem', fontFamily: 'var(--font-mono)' }}>FastAPI · Port 8001</div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setAuth(null)}
            className="logout-btn"
          >
            <LogOut size={14} /> Logout System
          </motion.button>
        </div>
      </div>
    </motion.aside>
  );
}

const PageWrapper = ({ children }) => {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -15 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        style={{ width: '100%' }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};

export default function App() {
  const [modelLoaded, setModelLoaded] = useState(false);
  const [auth, setAuth] = useState(null);
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    fetch('http://localhost:8001/health')
      .then(r => r.json())
      .then(d => setModelLoaded(d.model_loaded))
      .catch(() => { });
  }, []);

  const isAdmin = auth?.role === 'admin';
  const isAnalyst = auth?.role === 'analyst';
  const isOwner = auth?.role === 'owner';
  const isGuest = !isAdmin && !isAnalyst && !isOwner;

  return (
    <Router>
      {!auth ? (
        <AnimatePresence mode="wait">
          <Routes>
            <Route path="/" element={<PageWrapper><Landing setAuth={setAuth} theme={theme} toggleTheme={toggleTheme} /></PageWrapper>} />
            <Route path="/login" element={<PageWrapper><Login setAuth={setAuth} /></PageWrapper>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AnimatePresence>
      ) : (
        <div className="app-shell" style={isGuest ? { display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw' } : {}}>
          {!isGuest && (
            <Sidebar
              modelLoaded={modelLoaded}
              auth={auth}
              setAuth={setAuth}
              theme={theme}
              toggleTheme={toggleTheme}
            />
          )}
          <main className="main-content" style={isGuest ? { marginLeft: 0, width: '100%', maxWidth: '1200px', margin: '0 auto', padding: '3rem' } : {}}>
            {isGuest && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <button
                  onClick={() => setAuth(null)}
                  className="btn btn-secondary btn-sm"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                >
                  ← Back to Landing Page
                </button>

              </motion.div>
            )}
            <Routes>
              {isOwner && (
                <>
                  <Route path="/verification" element={<PageWrapper><VerificationDashboard auth={auth} /></PageWrapper>} />
                  <Route path="*" element={<Navigate to="/verification" replace />} />
                </>
              )}
              {isAdmin && (
                <>
                  <Route path="/" element={<PageWrapper><MissionControl /></PageWrapper>} />
                  <Route path="/batch" element={<PageWrapper><BatchAnalysis /></PageWrapper>} />
                  <Route path="/damage-verifier" element={<PageWrapper><DamageClaimVerifier /></PageWrapper>} />
                  <Route path="/reports" element={<PageWrapper><AdminReports /></PageWrapper>} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </>
              )}
              {isAnalyst && (
                <>
                  <Route path="/analyst" element={<PageWrapper><AnalystPanel /></PageWrapper>} />
                  <Route path="*" element={<Navigate to="/analyst" replace />} />
                </>
              )}
              {!isAdmin && !isAnalyst && !isOwner && (
                <>
                  <Route path="/trustbuy" element={<PageWrapper><TrustBuyAnalyzer /></PageWrapper>} />
                  <Route path="/damage-verifier" element={<PageWrapper><DamageClaimVerifier /></PageWrapper>} />
                  <Route path="*" element={<Navigate to={auth?.redirect || "/trustbuy"} replace />} />
                </>
              )}
            </Routes>
          </main>
        </div>
      )}
    </Router>
  );
}
