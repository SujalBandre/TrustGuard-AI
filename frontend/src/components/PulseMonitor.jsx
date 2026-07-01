import React from 'react';

export const PulseMonitor = ({ status }) => {
  // status: 'idle' | 'scanning' | 'safe' | 'danger'
  
  const colors = {
    idle:     { bg: '#334155', shadow: 'rgba(51, 65, 85, 0.4)' },
    scanning: { bg: 'var(--amber)', shadow: 'rgba(245, 158, 11, 0.6)' },
    safe:     { bg: 'var(--green)', shadow: 'rgba(16, 185, 129, 0.6)' },
    danger:   { bg: 'var(--red)', shadow: 'rgba(239, 68, 68, 0.6)' }
  };

  const current = colors[status] || colors.idle;

  return (
    <div className="flex items-center gap-4 px-4 py-3 rounded-xl border" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border)' }}>
      <div style={{ position: 'relative', width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {status === 'scanning' && (
          <div 
            style={{
              position: 'absolute', width: '100%', height: '100%', borderRadius: '50%',
              backgroundColor: current.bg, opacity: 0.5, animation: 'ping 1.2s cubic-bezier(0, 0, 0.2, 1) infinite'
            }}
          />
        )}
        <div 
          style={{ 
            width: 12, height: 12, borderRadius: '50%', 
            backgroundColor: current.bg, 
            boxShadow: `0 0 15px ${current.shadow}`,
            animation: status === 'safe' || status === 'danger' ? 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' : 'none'
          }} 
        />
      </div>
      <div>
        <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 800 }}>
          System Pulse
        </p>
        <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', textTransform: 'capitalize' }}>
          {status}
        </p>
      </div>
    </div>
  );
};
