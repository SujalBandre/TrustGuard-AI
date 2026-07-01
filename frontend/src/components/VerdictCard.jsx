import React from 'react';
import { ShieldCheck, AlertTriangle, XCircle } from 'lucide-react';

export const VerdictCard = ({ result }) => {
  if (!result) return null;

  const { recommendation } = result;

  let config = {
    color: 'var(--amber)',
    icon: AlertTriangle,
    title: 'PROMOTIONAL BIAS DETECTED',
    desc: 'Pricing manipulation or unusual review patterns detected. Exercise caution.',
    bg: 'rgba(245, 158, 11, 0.1)'
  };

  if (recommendation === 'SAFE TO BUY') {
    config = {
      color: 'var(--green)',
      icon: ShieldCheck,
      title: 'SAFE TO BUY',
      desc: 'High authenticity detected. Sentiment matches reviews and price is stable.',
      bg: 'rgba(16, 185, 129, 0.1)'
    };
  } else if (recommendation === "DON'T BUY") {
    config = {
      color: 'var(--red)',
      icon: XCircle,
      title: "DON'T BUY",
      desc: 'High probability of reputation hijacking or malicious source. Avoid this product.',
      bg: 'rgba(239, 68, 68, 0.1)'
    };
  }

  const Icon = config.icon;

  return (
    <div className="card" style={{ borderColor: config.color, backgroundColor: config.bg, borderWidth: 2, display: 'flex', gap: '1rem', alignItems: 'center', padding: '1.5rem' }}>
      <div style={{ flexShrink: 0 }}>
        <Icon size={48} color={config.color} />
      </div>
      <div>
        <h3 style={{ color: config.color, fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.25rem', letterSpacing: '0.05em' }}>
          {config.title}
        </h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
          {config.desc}
        </p>
      </div>
    </div>
  );
};
