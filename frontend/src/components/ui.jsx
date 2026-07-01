import React from 'react';

/** Circular Authenticity Meter (SVG arc gauge) */
export function AuthenticityMeter({ score = 72, size = 180 }) {
  const radius   = (size / 2) - 18;
  const cx       = size / 2;
  const cy       = size / 2;
  const startAng = -220;
  const sweepAng = 260;

  const toRad = (deg) => (deg * Math.PI) / 180;
  const arcPath = (startDeg, sweepDeg, r) => {
    const s = toRad(startDeg);
    const e = toRad(startDeg + sweepDeg);
    const x1 = cx + r * Math.cos(s);
    const y1 = cy + r * Math.sin(s);
    const x2 = cx + r * Math.cos(e);
    const y2 = cy + r * Math.sin(e);
    const laf = sweepDeg > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${r} ${r} 0 ${laf} 1 ${x2} ${y2}`;
  };

  const circ        = 2 * Math.PI * radius;
  const trackLength = circ * (sweepAng / 360);
  const fillLength  = trackLength * (score / 100);

  const getColor = (s) => {
    if (s >= 70) return '#10B981';
    if (s >= 40) return '#F59E0B';
    return '#EF4444';
  };

  const color = getColor(score);

  const trackPath = arcPath(startAng, sweepAng, radius);
  const fillPath  = arcPath(startAng, sweepAng, radius);

  return (
    <div className="authenticity-meter" style={{ width: size, height: size }}>
      <svg className="meter-svg" width={size} height={size}>
        {/* Shadow glow gradient */}
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="4" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Track */}
        <path
          d={trackPath}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={10}
          strokeLinecap="round"
        />

        {/* Fill arc — using dasharray trick */}
        <path
          d={fillPath}
          fill="none"
          stroke={color}
          strokeWidth={10}
          strokeLinecap="round"
          strokeDasharray={`${fillLength} ${trackLength}`}
          filter="url(#glow)"
          style={{ transition: 'stroke-dasharray 1.2s cubic-bezier(0.4,0,0.2,1), stroke 0.5s ease' }}
        />
      </svg>

      <div className="meter-label-center">
        <div className="meter-score" style={{ color }}>{score}</div>
        <div className="meter-sublabel">Trust Score</div>
      </div>
    </div>
  );
}

/** Risk Badge component */
export function RiskBadge({ level }) {
  const cls = `badge badge-${level?.toLowerCase() || 'low'}`;
  const dot = { HIGH: '🔴', MEDIUM: '🟡', LOW: '🟢' }[level] || '⚪';
  return <span className={cls}>{dot} {level}</span>;
}

/** Tag chip */
export function TagChip({ label }) {
  return <span className="tag">{label}</span>;
}

/** Progress bar */
export function ProgressBar({ value, color = 'var(--cyan)', label }) {
  return (
    <div>
      {label && (
        <div className="flex justify-between mb-1" style={{ fontSize: '0.75rem' }}>
          <span className="text-secondary">{label}</span>
          <span className="text-cyan font-mono">{value}%</span>
        </div>
      )}
      <div className="progress-bar-track">
        <div
          className="progress-bar-fill"
          style={{ width: `${Math.min(100, value)}%`, background: color }}
        />
      </div>
    </div>
  );
}

/** Stat card */
export function StatCard({ icon: Icon, label, value, sub, color = 'cyan' }) {
  return (
    <div className={`stat-card ${color}`}>
      <div className={`stat-icon ${color}`}>
        <Icon size={16} />
      </div>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

/** Pulse monitor review item */
export function PulseItem({ text, author, tags = [], risk = 'LOW', evidence, ts }) {
  const riskLow = risk?.toLowerCase() || 'low';
  return (
    <div className="pulse-item">
      <div className={`pulse-indicator ${riskLow}`} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs text-muted font-mono">
            {author || 'Anonymous'} · {ts ? new Date(ts).toLocaleTimeString() : 'just now'}
          </span>
          <RiskBadge level={risk} />
        </div>
        <p className="text-sm italic" style={{ color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
          "{(text || '').slice(0, 120)}{(text || '').length > 120 ? '…' : ''}"
        </p>
        {evidence && (
          <p className="text-xs text-muted" style={{ marginBottom: '0.4rem', lineHeight: 1.5 }}>
            🔍 {evidence.slice(0, 140)}
          </p>
        )}
        <div className="flex gap-1" style={{ flexWrap: 'wrap' }}>
          {(tags || []).slice(0, 4).map((t, i) => <TagChip key={i} label={t} />)}
        </div>
      </div>
    </div>
  );
}

/** Empty state */
export function EmptyState({ icon: Icon, message }) {
  return (
    <div className="text-center" style={{ padding: '4rem 2rem', opacity: 0.4 }}>
      <Icon size={56} style={{ marginBottom: '1rem', display: 'block', margin: '0 auto 1rem' }} />
      <p className="text-secondary text-sm">{message}</p>
    </div>
  );
}

/** Loading spinner */
export function Spinner({ size = 24 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--cyan)"
      strokeWidth="2"
      style={{ animation: 'spin 0.8s linear infinite' }}
    >
      <style>{'@keyframes spin { to { transform: rotate(360deg); } }'}</style>
      <circle cx="12" cy="12" r="10" strokeOpacity="0.2" />
      <path d="M12 2 A10 10 0 0 1 22 12" />
    </svg>
  );
}
