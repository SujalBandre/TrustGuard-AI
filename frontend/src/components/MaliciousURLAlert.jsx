import React from 'react';
import { AlertTriangle, ShieldOff, XCircle, X } from 'lucide-react';

const THREAT_LABELS = {
  PHISHING: { label: 'Phishing Site', color: '#EF4444', icon: '🎣' },
  TYPOSQUATTING: { label: 'Typosquatting', color: '#F97316', icon: '🔤' },
  FAKE_ECOMMERCE: { label: 'Fake E-Commerce', color: '#EF4444', icon: '🛒' },
  RISKY_TLD: { label: 'High-Risk Domain', color: '#F59E0B', icon: '⚠️' },
  IP_HOST: { label: 'IP Address URL', color: '#EF4444', icon: '🌐' },
  SUBDOMAIN_SPOOFING: { label: 'Subdomain Spoofing', color: '#F97316', icon: '🔗' },
  INSECURE_PROTOCOL: { label: 'Insecure HTTP', color: '#F59E0B', icon: '🔓' },
  INVALID_PROTOCOL: { label: 'Invalid Protocol', color: '#EF4444', icon: '❌' },
  URL_OBFUSCATION: { label: 'URL Obfuscation', color: '#F97316', icon: '🕵️' },
  UNKNOWN_DOMAIN: { label: 'Unknown Domain', color: '#F59E0B', icon: '❓' },
};

export default function MaliciousURLAlert({ urlInfo, url, onDismiss }) {
  if (!urlInfo || urlInfo.status === 'SECURE') return null;

  const isMalicious = urlInfo.status === 'MALICIOUS';
  const threat = THREAT_LABELS[urlInfo.threat_type] || { label: urlInfo.threat_type || 'Unknown Threat', color: '#EF4444', icon: '⚠️' };
  const accentColor = isMalicious ? '#EF4444' : '#F59E0B';

  return (
    <div style={{
      position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)',
      zIndex: 9999, width: '90%', maxWidth: '580px',
      background: isMalicious ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)',
      border: `2px solid ${accentColor}`,
      borderRadius: '16px', padding: '20px 24px',
      backdropFilter: 'blur(20px)',
      boxShadow: `0 0 40px ${accentColor}33`,
      animation: 'slideDown 0.3s ease-out',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
          <div style={{
            width: '48px', height: '48px', borderRadius: '12px', flexShrink: 0,
            background: isMalicious ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '24px',
          }}>
            {threat.icon}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{
                fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em',
                padding: '2px 8px', borderRadius: '100px',
                background: isMalicious ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)',
                color: accentColor,
              }}>
                {isMalicious ? 'MALICIOUS URL DETECTED' : 'SUSPICIOUS URL'}
              </span>
              <span style={{ fontSize: '0.7rem', color: accentColor, fontWeight: 600 }}>{threat.label}</span>
            </div>
            <p style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem', marginBottom: '4px' }}>
              {isMalicious ? '🚨 This URL is potentially dangerous' : '⚠️ Proceed with caution'}
            </p>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '8px' }}>
              {urlInfo.reason}
            </p>
            {url && (
              <div style={{
                background: 'rgba(0,0,0,0.3)', borderRadius: '6px', padding: '6px 10px',
                fontFamily: 'monospace', fontSize: '0.72rem', color: accentColor,
                wordBreak: 'break-all',
              }}>
                {url}
              </div>
            )}
          </div>
        </div>
        {onDismiss && (
          <button onClick={onDismiss} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px' }}>
            <X size={18} />
          </button>
        )}
      </div>
    </div>
  );
}
