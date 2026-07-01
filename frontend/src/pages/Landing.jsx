import React from 'react';
import { Shield, Camera, Search, LogIn } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Landing({ setAuth }) {
  const navigate = useNavigate();

  const handleGuestLogin = (destination) => {
    // Implicitly login as guest user to access the public tools
    setAuth({ token: 'guest-token', role: 'user', username: 'Guest', redirect: destination });
    navigate(destination);
  };

  return (
    <div style={{
      minHeight: '100vh', width: '100vw', background: 'var(--bg-deepspace)',
      display: 'flex', flexDirection: 'column',
      backgroundImage: 'radial-gradient(ellipse at 20% 50%, rgba(0,212,255,0.06) 0%, transparent 60%), radial-gradient(ellipse at 80% 50%, rgba(124,58,237,0.06) 0%, transparent 60%)',
    }}>
      {/* Top Navigation Bar */}
      <div style={{ 
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
        padding: '24px 48px', width: '100%', boxSizing: 'border-box' 
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Shield size={28} color="var(--cyan)" />
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
            TrustGuard <span style={{ color: 'var(--cyan)' }}>AI</span>
          </h1>
        </div>
        <button
          onClick={() => navigate('/login')}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '10px 20px', borderRadius: '8px', border: '1px solid var(--border)',
            background: 'var(--bg-card)', color: 'var(--text-primary)',
            cursor: 'pointer', fontWeight: 600, transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--cyan)'; e.currentTarget.style.color = 'var(--cyan)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
        >
          <LogIn size={18} /> Staff Login
        </button>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
        <h2 style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '16px', textAlign: 'center' }}>
          Protect Your E-Commerce Reputation
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', marginBottom: '48px', maxWidth: '600px', textAlign: 'center', lineHeight: '1.6' }}>
          Select a tool below to analyze product reviews or verify damage claims using our advanced AI detection engine.
        </p>

        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', justifyContent: 'center' }}>
          
          {/* Review Analyzer Card */}
          <button
            onClick={() => handleGuestLogin('/trustbuy')}
            style={{
              width: '320px', padding: '32px 24px', borderRadius: '16px', 
              border: '1px solid var(--border)', background: 'var(--bg-card)',
              cursor: 'pointer', transition: 'all 0.3s', display: 'flex', flexDirection: 'column',
              alignItems: 'center', gap: '16px', color: 'var(--text-primary)', textAlign: 'center'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--cyan)';
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,212,255,0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border)';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <div style={{
              width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(0,212,255,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--cyan)'
            }}>
              <Search size={32} />
            </div>
            <div style={{ fontWeight: 700, fontSize: '1.25rem' }}>Review Analyzer</div>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
              Detect fake reviews, opinion manipulation, and review bombing with our AI engine.
            </div>
          </button>

          {/* Damage Verifier Card */}
          <button
            onClick={() => handleGuestLogin('/damage-verifier')}
            style={{
              width: '320px', padding: '32px 24px', borderRadius: '16px', 
              border: '1px solid var(--border)', background: 'var(--bg-card)',
              cursor: 'pointer', transition: 'all 0.3s', display: 'flex', flexDirection: 'column',
              alignItems: 'center', gap: '16px', color: 'var(--text-primary)', textAlign: 'center'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--purple)';
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 12px 40px rgba(124,58,237,0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border)';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <div style={{
              width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(124,58,237,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--purple)'
            }}>
              <Camera size={32} />
            </div>
            <div style={{ fontWeight: 700, fontSize: '1.25rem' }}>Damage Verifier</div>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
              Verify fraudulent return claims and damaged product images instantly.
            </div>
          </button>

        </div>
      </div>
    </div>
  );
}
