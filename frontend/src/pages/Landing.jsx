import React from 'react';
import { Shield, Camera, Search, LogIn, ArrowRight, Sun, Moon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import AetherFlowHero from '../components/ui/aether-flow-hero';

export default function Landing({ setAuth, theme, toggleTheme }) {
  const navigate = useNavigate();

  const handleGuestLogin = (destination) => {
    setAuth({ token: 'guest-token', role: 'user', username: 'Guest', redirect: destination });
    navigate(destination);
  };

  return (
    <div style={{ minHeight: '100vh', width: '100vw', background: 'var(--bg-base)', display: 'flex', flexDirection: 'column' }}>
      
      {/* Fixed Top Navigation Bar */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '20px 48px', width: '100%', boxSizing: 'border-box',
          borderBottom: '1px solid var(--border)',
          background: 'rgba(10, 10, 10, 0.7)',
          backdropFilter: 'blur(24px)',
          position: 'fixed', top: 0, zIndex: 50,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: '10px',
            background: 'linear-gradient(135deg, #C0392B, #8E44AD)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 20px rgba(124,58,237,0.3)',
          }}>
            <Shield size={24} color="#ffffff" />
          </div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
            TrustGuard <span style={{ color: '#C0392B' }}>AI</span>
          </h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/login')}
            className="btn btn-secondary"
            style={{ padding: '8px 20px', fontSize: '0.9rem' }}
          >
            <LogIn size={16} /> Staff Login
          </motion.button>
        </div>
      </motion.div>

      {/* Hero — Full-screen Particle Canvas */}
      <AetherFlowHero
        theme={theme}
        badgeText="Live Protection Active"
        title={
          <>
            Real-Time Operations &amp; <br />
            <span style={{
              background: theme === 'dark'
                ? 'linear-gradient(135deg, #FFFFFF, #A3A3A3)'
                : 'linear-gradient(135deg, #111111, #6B6B6B)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              Reputation Security
            </span>
          </>
        }
        subtitle="Detect fake reviews, opinion manipulation, and verify damage claims using our advanced AI detection engine."
      >
        {/* CTA Cards */}
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', justifyContent: 'center' }}>

          {/* Review Analyzer */}
          <motion.button
            whileHover={{ y: -6, boxShadow: 'var(--accent-glow)', borderColor: 'var(--border-strong)' }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleGuestLogin('/trustbuy')}
            className="card"
            style={{
              width: '320px', padding: '32px 24px',
              cursor: 'pointer', display: 'flex', flexDirection: 'column',
              alignItems: 'flex-start', gap: '14px', color: 'var(--text-primary)', textAlign: 'left',
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              backdropFilter: 'blur(16px)',
            }}
          >
            <div style={{
              width: '52px', height: '52px', borderRadius: '14px', background: 'var(--accent-dim)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-primary)',
            }}>
              <Search size={26} />
            </div>
            <div style={{ fontWeight: 700, fontSize: '1.15rem', color: 'var(--text-primary)' }}>Review Analyzer</div>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.6', flex: 1 }}>
              Instantly detect fake reviews and review bombing campaigns with AI precision.
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent-primary)', fontSize: '0.85rem', fontWeight: 600 }}>
              Launch Tool <ArrowRight size={14} />
            </div>
          </motion.button>

          {/* Damage Verifier */}
          <motion.button
            whileHover={{ y: -6, boxShadow: 'var(--accent-glow)', borderColor: 'var(--border-strong)' }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleGuestLogin('/damage-verifier')}
            className="card"
            style={{
              width: '320px', padding: '32px 24px',
              cursor: 'pointer', display: 'flex', flexDirection: 'column',
              alignItems: 'flex-start', gap: '14px', color: 'var(--text-primary)', textAlign: 'left',
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              backdropFilter: 'blur(16px)',
            }}
          >
            <div style={{
              width: '52px', height: '52px', borderRadius: '14px', background: 'var(--accent-dim)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-primary)',
            }}>
              <Camera size={26} />
            </div>
            <div style={{ fontWeight: 700, fontSize: '1.15rem', color: 'var(--text-primary)' }}>Damage Verifier</div>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.6', flex: 1 }}>
              Verify fraudulent return claims and validate product damage images with CV models.
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent-primary)', fontSize: '0.85rem', fontWeight: 600 }}>
              Launch Tool <ArrowRight size={14} />
            </div>
          </motion.button>

        </div>
      </AetherFlowHero>
    </div>
  );
}
