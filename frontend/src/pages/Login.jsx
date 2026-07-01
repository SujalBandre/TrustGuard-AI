import React, { useState } from 'react';
import { Shield, Cpu, Lock, User, Eye, EyeOff, AlertCircle, BarChart2, CheckCircle } from 'lucide-react';

export default function Login({ setAuth }) {
  const [activeRole, setActiveRole] = useState('admin');
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername]     = useState('');
  const [password, setPassword]     = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPass, setShowPass]     = useState(false);
  const [error, setError]           = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading]       = useState(false);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      if (isRegistering) {
        const resp = await fetch('http://localhost:8001/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password, role: activeRole, display_name: displayName || username }),
        });
        const data = await resp.json();
        if (resp.ok) {
          setSuccessMsg(data.msg || 'Registration successful. Pending approval.');
          setIsRegistering(false);
          setPassword('');
        } else {
          setError(data.detail || 'Registration failed');
        }
      } else {
        const resp = await fetch('http://localhost:8001/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password }),
        });
        const data = await resp.json();
        if (resp.ok) {
          setAuth({ token: data.token, role: data.role, username: data.username || username, redirect: data.redirect });
        } else {
          setError(data.detail || 'Invalid credentials');
        }
      }
    } catch {
      setError('Cannot connect to backend. Ensure server is running on port 8001.');
    } finally {
      setLoading(false);
    }
  };

  const fillCreds = (role) => {
    setActiveRole(role);
    if (!isRegistering) {
      setUsername(role);
      setPassword(role);
    }
    setError('');
    setSuccessMsg('');
  };

  return (
    <div style={{
      minHeight: '100vh', width: '100vw', background: 'var(--bg-deepspace)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backgroundImage: 'radial-gradient(ellipse at 20% 50%, rgba(0,212,255,0.06) 0%, transparent 60%), radial-gradient(ellipse at 80% 50%, rgba(124,58,237,0.06) 0%, transparent 60%)',
    }}>
      <div style={{ width: '100%', maxWidth: '420px', padding: '20px' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
            <div style={{
              width: '64px', height: '64px', borderRadius: '16px',
              background: 'linear-gradient(135deg, var(--cyan), var(--purple))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 40px rgba(0,212,255,0.3)',
            }}>
              <Shield size={32} color="#000" />
            </div>
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '4px' }}>
            TrustGuard <span style={{ color: 'var(--cyan)' }}>AI</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            AI-Powered Fake Review & Reputation Intelligence
          </p>
        </div>

        {/* Role Selector */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '24px'
        }}>
          <button
            type="button"
            onClick={() => fillCreds('admin')}
            style={{
              padding: '12px 4px', borderRadius: '12px', border: `2px solid ${activeRole === 'admin' ? 'var(--purple)' : 'var(--border)'}`,
              background: activeRole === 'admin' ? 'var(--purple-dim)' : 'var(--bg-card)',
              cursor: 'pointer', transition: 'all 0.2s', display: 'flex', flexDirection: 'column',
              alignItems: 'center', gap: '6px', color: activeRole === 'admin' ? '#a78bfa' : 'var(--text-secondary)',
            }}
          >
            <Cpu size={20} />
            <div style={{ fontWeight: 700, fontSize: '0.75rem' }}>Admin</div>
          </button>
          <button
            type="button"
            onClick={() => fillCreds('analyst')}
            style={{
              padding: '12px 4px', borderRadius: '12px', border: `2px solid ${activeRole === 'analyst' ? '#F59E0B' : 'var(--border)'}`,
              background: activeRole === 'analyst' ? 'rgba(245,158,11,0.12)' : 'var(--bg-card)',
              cursor: 'pointer', transition: 'all 0.2s', display: 'flex', flexDirection: 'column',
              alignItems: 'center', gap: '6px', color: activeRole === 'analyst' ? '#F59E0B' : 'var(--text-secondary)',
            }}
          >
            <BarChart2 size={20} />
            <div style={{ fontWeight: 700, fontSize: '0.75rem' }}>Analyst</div>
          </button>
        </div>

        {/* Auth Form */}
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: '16px', padding: '24px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        }}>
          {/* Toggle Register / Login */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginBottom: '20px' }}>
            <span 
              onClick={() => { setIsRegistering(false); setError(''); setSuccessMsg(''); }}
              style={{ fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer', color: !isRegistering ? 'var(--text-primary)' : 'var(--text-muted)', borderBottom: !isRegistering ? '2px solid var(--cyan)' : '2px solid transparent', paddingBottom: '4px' }}>
              Login
            </span>
            <span 
              onClick={() => { setIsRegistering(true); setError(''); setSuccessMsg(''); }}
              style={{ fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer', color: isRegistering ? 'var(--text-primary)' : 'var(--text-muted)', borderBottom: isRegistering ? '2px solid var(--cyan)' : '2px solid transparent', paddingBottom: '4px' }}>
              Register
            </span>
          </div>

          {error && (
            <div style={{
              background: 'var(--red-dim)', border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: '8px', padding: '10px 12px', marginBottom: '16px',
              display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--red)', fontSize: '0.8rem',
            }}>
              <AlertCircle size={16} /> {error}
            </div>
          )}

          {successMsg && (
            <div style={{
              background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '8px', padding: '10px 12px', marginBottom: '16px',
              display: 'flex', alignItems: 'center', gap: '8px', color: '#10B981', fontSize: '0.8rem',
            }}>
              <CheckCircle size={16} /> {successMsg}
            </div>
          )}

          <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            
            {isRegistering && (
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '6px' }}>Display Name</label>
                <div style={{ position: 'relative' }}>
                  <User size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type="text" value={displayName} onChange={e => setDisplayName(e.target.value)}
                    placeholder="John Doe"
                    style={{
                      width: '100%', padding: '10px 12px 10px 36px',
                      background: 'var(--bg-input)', border: '1px solid var(--border)',
                      borderRadius: '8px', color: 'var(--text-primary)', fontSize: '0.875rem',
                      outline: 'none', boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>
            )}

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '6px' }}>Username</label>
              <div style={{ position: 'relative' }}>
                <User size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text" value={username} onChange={e => setUsername(e.target.value)}
                  placeholder="Enter username"
                  required
                  style={{
                    width: '100%', padding: '10px 12px 10px 36px',
                    background: 'var(--bg-input)', border: '1px solid var(--border)',
                    borderRadius: '8px', color: 'var(--text-primary)', fontSize: '0.875rem',
                    outline: 'none', boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '6px' }}>Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••"
                  required
                  style={{
                    width: '100%', padding: '10px 40px 10px 36px',
                    background: 'var(--bg-input)', border: '1px solid var(--border)',
                    borderRadius: '8px', color: 'var(--text-primary)', fontSize: '0.875rem',
                    outline: 'none', boxSizing: 'border-box',
                  }}
                />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit" disabled={loading}
              style={{
                padding: '12px', borderRadius: '10px', border: 'none', cursor: 'pointer',
                fontWeight: 700, fontSize: '0.9rem', marginTop: '4px',
                background: activeRole === 'admin'
                  ? 'linear-gradient(135deg, var(--purple), #6d28d9)'
                  : activeRole === 'analyst'
                  ? 'linear-gradient(135deg, #F59E0B, #D97706)'
                  : activeRole === 'owner'
                  ? 'linear-gradient(135deg, #ef4444, #b91c1c)'
                  : 'linear-gradient(135deg, var(--cyan), #0099CC)',
                color: '#000',
                boxShadow: activeRole === 'admin' ? '0 0 20px rgba(124,58,237,0.3)' : activeRole === 'analyst' ? '0 0 20px rgba(245,158,11,0.3)' : activeRole === 'owner' ? '0 0 20px rgba(239,68,68,0.3)' : '0 0 20px rgba(0,212,255,0.3)',
                opacity: loading ? 0.6 : 1, transition: 'all 0.2s',
              }}
            >
              {loading ? 'Processing...' : isRegistering ? `Register Request for ${activeRole}` : `Login as ${activeRole}`}
            </button>
          </form>

          {/* Back to Home */}
          <div style={{ marginTop: '24px', textAlign: 'center' }}>
            <a href="/" style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textDecoration: 'none', transition: 'color 0.2s' }}
               onMouseEnter={(e) => e.currentTarget.style.color = 'var(--cyan)'}
               onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}>
              &larr; Back to Home
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
