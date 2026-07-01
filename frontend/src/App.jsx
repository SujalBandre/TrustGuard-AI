import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import {
  Shield, Search, Upload, Zap, BarChart2, AlertTriangle, Award, LogOut, Cpu, User, FileText, Eye, Camera
} from 'lucide-react';

import Landing              from './pages/Landing';
import Login                from './pages/Login';
import MissionControl       from './pages/MissionControl';
import TrustBuyAnalyzer     from './pages/TrustBuyAnalyzer';
import BatchAnalysis        from './pages/BatchAnalysis';
import AdminReports         from './pages/AdminReports';
import AnalystPanel         from './pages/AnalystPanel';
import DamageClaimVerifier  from './pages/DamageClaimVerifier';
import VerificationDashboard from './pages/VerificationDashboard';
import { PulseMonitor }    from './components/PulseMonitor';
import './index.css';

const ADMIN_NAV = [
  { to: '/',                label: 'Mission Control',      icon: Shield },
  { to: '/batch',           label: 'Batch Analysis',       icon: Upload },
  { to: '/damage-verifier', label: 'Damage Verifier',      icon: Camera },
  { to: '/reports',         label: 'Reports & Requests',   icon: FileText },
];

const USER_NAV = [
  { to: '/trustbuy',        label: 'Review Analyzer',  icon: Search },
  { to: '/damage-verifier', label: 'Damage Verifier',  icon: Camera },
];

const ANALYST_NAV = [
  { to: '/analyst', label: 'Analyst Inbox',   icon: BarChart2 },
];

const OWNER_NAV = [
  { to: '/verification', label: 'Account Requests', icon: Shield },
];

function Sidebar({ modelLoaded, auth, setAuth }) {
  const isOwner   = auth?.role === 'owner';
  const isAdmin   = auth?.role === 'admin';
  const isAnalyst = auth?.role === 'analyst';
  const items = isOwner ? OWNER_NAV : isAdmin ? ADMIN_NAV : isAnalyst ? ANALYST_NAV : USER_NAV;

  const roleLabel = isOwner ? 'OWNER' : isAdmin ? 'ADMIN' : isAnalyst ? 'ANALYST' : 'USER';
  const roleColor = isOwner ? '#ef4444' : isAdmin ? '#a78bfa' : isAnalyst ? '#F59E0B' : 'var(--cyan)';
  const roleBg    = isOwner ? 'rgba(239,68,68,0.15)' : isAdmin ? 'rgba(124,58,237,0.15)' : isAnalyst ? 'rgba(245,158,11,0.12)' : 'rgba(0,212,255,0.1)';

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <Shield size={20} color="var(--cyan)" />
          <h2 style={{ fontSize: '13px', lineHeight: '1.3', fontWeight: '800', color: 'var(--cyan)', margin: 0 }}>
            TrustGuard AI
          </h2>
        </div>
        <p style={{ fontSize: '10px', color: '#666', margin: 0 }}>
          Fake Review Intelligence Platform
        </p>
        <div style={{
          marginTop: '8px', padding: '4px 8px', borderRadius: '6px', display: 'inline-flex',
          alignItems: 'center', gap: '5px', fontSize: '0.65rem', fontWeight: 700,
          background: roleBg, color: roleColor,
        }}>
          {isOwner ? <Shield size={10} /> : isAdmin ? <Cpu size={10} /> : isAnalyst ? <BarChart2 size={10} /> : <User size={10} />}
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
            <Icon size={16} /> {label}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-status">
        <PulseMonitor status={modelLoaded ? 'safe' : 'scanning'} />
        <div style={{ padding: '12px 4px 4px' }}>
          <div style={{ opacity: 0.5, marginBottom: '8px', fontSize: '0.65rem' }}>FastAPI · Port 8001</div>
          <button
            onClick={() => setAuth(null)}
            className="logout-btn"
          >
            <LogOut size={12} /> Logout System
          </button>
        </div>
      </div>
    </aside>
  );
}

export default function App() {
  const [modelLoaded, setModelLoaded] = useState(false);
  const [auth, setAuth] = useState(null);

  useEffect(() => {
    fetch('http://localhost:8001/health')
      .then(r => r.json())
      .then(d => setModelLoaded(d.model_loaded))
      .catch(() => {});
  }, []);

  const isAdmin   = auth?.role === 'admin';
  const isAnalyst = auth?.role === 'analyst';
  const isOwner   = auth?.role === 'owner';
  const isGuest   = !isAdmin && !isAnalyst && !isOwner;

  return (
    <Router>
      {!auth ? (
        <Routes>
          <Route path="/" element={<Landing setAuth={setAuth} />} />
          <Route path="/login" element={<Login setAuth={setAuth} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      ) : (
        <div className="app-shell" style={isGuest ? { display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw' } : {}}>
          {!isGuest && <Sidebar modelLoaded={modelLoaded} auth={auth} setAuth={setAuth} />}
          <main className="main-content" style={isGuest ? { marginLeft: 0, width: '100%', maxWidth: '1200px', margin: '0 auto', padding: '2rem 4rem' } : {}}>
            {isGuest && (
              <div style={{ marginBottom: '24px' }}>
                <button
                  onClick={() => setAuth(null)}
                  style={{
                    background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', color: 'var(--text-secondary)',
                    padding: '10px 18px', borderRadius: '8px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px',
                    fontSize: '0.85rem', fontWeight: 600, transition: 'all 0.2s',
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.borderColor = 'var(--text-muted)'; e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
                  onMouseOut={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                >
                  &larr; Back to Landing Page
                </button>
              </div>
            )}
            <Routes>
              {isOwner && (
                <>
                  <Route path="/verification" element={<VerificationDashboard auth={auth} />} />
                  <Route path="*" element={<Navigate to="/verification" replace />} />
                </>
              )}
              {isAdmin && (
                <>
                  <Route path="/"                element={<MissionControl />} />
                  <Route path="/batch"            element={<BatchAnalysis />} />
                  <Route path="/damage-verifier"  element={<DamageClaimVerifier />} />
                  <Route path="/reports"          element={<AdminReports />} />
                  <Route path="*"                element={<Navigate to="/" replace />} />
                </>
              )}
              {isAnalyst && (
                <>
                  <Route path="/analyst"    element={<AnalystPanel />} />
                  <Route path="*"           element={<Navigate to="/analyst" replace />} />
                </>
              )}
              {!isAdmin && !isAnalyst && !isOwner && (
                <>
                  <Route path="/trustbuy"        element={<TrustBuyAnalyzer />} />
                  <Route path="/damage-verifier" element={<DamageClaimVerifier />} />
                  <Route path="*"                element={<Navigate to={auth?.redirect || "/trustbuy"} replace />} />
                </>
              )}
            </Routes>
          </main>
        </div>
      )}
    </Router>
  );
}
