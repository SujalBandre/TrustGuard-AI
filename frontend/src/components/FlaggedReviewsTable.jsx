import React, { useState } from 'react';
import { ChevronDown, ChevronUp, AlertTriangle, Clock, User, Globe, Tag } from 'lucide-react';

const RISK_COLORS = { HIGH: '#EF4444', MEDIUM: '#F59E0B', LOW: '#10B981', CRITICAL: '#DC2626' };

function RiskBadge({ level }) {
  const color = RISK_COLORS[level] || '#F59E0B';
  return (
    <span style={{
      padding: '2px 8px', borderRadius: '100px', fontSize: '0.6rem', fontWeight: 700,
      textTransform: 'uppercase', letterSpacing: '0.08em',
      background: `${color}20`, color, border: `1px solid ${color}44`,
    }}>{level}</span>
  );
}

function TagPill({ label }) {
  return (
    <span style={{
      padding: '1px 7px', borderRadius: '100px', fontSize: '0.58rem', fontWeight: 700,
      background: 'rgba(0,212,255,0.1)', color: 'var(--cyan)',
      border: '1px solid rgba(0,212,255,0.2)', fontFamily: 'monospace',
      whiteSpace: 'nowrap',
    }}>{label}</span>
  );
}

export default function FlaggedReviewsTable({ flaggedData }) {
  const [expanded, setExpanded] = useState(null);
  const [page, setPage] = useState(0);
  const PER_PAGE = 10;

  if (!flaggedData || flaggedData.length === 0) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '32px' }}>
        <div style={{ fontSize: '2rem', marginBottom: '8px' }}>✅</div>
        <p style={{ color: 'var(--text-secondary)' }}>No fake reviews detected. Reviews appear authentic!</p>
      </div>
    );
  }

  const totalPages = Math.ceil(flaggedData.length / PER_PAGE);
  const currentItems = flaggedData.slice(page * PER_PAGE, (page + 1) * PER_PAGE);

  const formatDate = (ts) => {
    if (!ts) return 'Unknown date';
    try { return new Date(ts).toLocaleString('en-IN', { dateStyle:'medium', timeStyle:'short' }); }
    catch { return ts; }
  };

  const getManipulationColor = (prob) => {
    if (typeof prob !== 'number') return '#F59E0B';
    if (prob > 0.8) return '#EF4444';
    if (prob > 0.6) return '#F97316';
    return '#F59E0B';
  };

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ fontWeight: 700, color: 'var(--red)', fontSize: '0.9rem' }}>
          🚩 Flagged Reviews ({flaggedData.length})
        </h3>
        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
          Page {page + 1} of {totalPages}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {currentItems.map((review, idx) => {
          const globalIdx = page * PER_PAGE + idx;
          const isExpanded = expanded === globalIdx;
          const prob = typeof review.manipulation_probability === 'number'
            ? review.prob ?? review.manipulation_probability
            : review.prob;

          return (
            <div key={globalIdx} style={{
              background: 'var(--bg-input)', borderRadius: '10px',
              border: '1px solid rgba(239,68,68,0.2)',
              borderLeft: `3px solid ${RISK_COLORS[review.risk_level] || '#EF4444'}`,
              overflow: 'hidden', transition: 'all 0.2s',
            }}>
              {/* Row Header */}
              <div
                onClick={() => setExpanded(isExpanded ? null : globalIdx)}
                style={{ padding: '12px 14px', cursor: 'pointer', display: 'flex', gap: '12px', alignItems: 'flex-start' }}
              >
                {/* Manipulation % indicator */}
                <div style={{
                  minWidth: '44px', height: '44px', borderRadius: '10px', flexShrink: 0,
                  background: `${getManipulationColor(prob)}22`, display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: getManipulationColor(prob) }}>
                    {prob !== undefined ? `${Math.round(prob * 100)}%` : '?'}
                  </span>
                  <span style={{ fontSize: '0.5rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>fake</span>
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* Metadata row */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '6px', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--cyan)', fontSize: '0.78rem', fontWeight: 600 }}>
                      <User size={12} /> {review.author || 'Anonymous'}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted)', fontSize: '0.72rem' }}>
                      <Clock size={11} /> {formatDate(review.timestamp)}
                    </div>
                    {review.platform && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted)', fontSize: '0.72rem' }}>
                        <Globe size={11} /> {review.platform}
                      </div>
                    )}
                    {review.page && (
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>p.{review.page}</span>
                    )}
                    <RiskBadge level={review.risk_level || (review.prob > 0.85 ? 'HIGH' : 'MEDIUM')} />
                  </div>

                  {/* Review text preview */}
                  <p style={{
                    color: 'var(--text-secondary)', fontSize: '0.82rem', fontStyle: 'italic',
                    display: '-webkit-box', WebkitLineClamp: isExpanded ? 'unset' : 2,
                    WebkitBoxOrient: 'vertical', overflow: 'hidden',
                  }}>
                    "{review.text}"
                  </p>
                </div>

                <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px', flexShrink: 0, marginTop: '2px' }}>
                  {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
              </div>

              {/* Expanded Details */}
              {isExpanded && (
                <div style={{ padding: '0 14px 14px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                  <div style={{ paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {/* Tags */}
                    {review.tags && review.tags.length > 0 && (
                      <div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Tag size={10} /> Detection Tags
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {review.tags.map((t, i) => <TagPill key={i} label={t} />)}
                        </div>
                      </div>
                    )}
                    {/* Evidence */}
                    {review.evidence && (
                      <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '6px', padding: '8px 10px', fontSize: '0.76rem', color: 'var(--text-secondary)', borderLeft: '2px solid var(--amber)' }}>
                        <span style={{ fontWeight: 700, color: 'var(--amber)' }}>Evidence: </span>
                        {review.evidence}
                      </div>
                    )}
                    {/* Rating */}
                    {review.rating && (
                      <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                        ⭐ Rating: <span style={{ color: 'var(--amber)', fontWeight: 600 }}>{review.rating}/5</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '16px' }}>
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
            style={{ padding: '6px 14px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-secondary)', cursor: page === 0 ? 'not-allowed' : 'pointer', fontSize: '0.8rem', opacity: page === 0 ? 0.4 : 1 }}
          >← Prev</button>
          <span style={{ padding: '6px 12px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            {page + 1} / {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1}
            style={{ padding: '6px 14px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-secondary)', cursor: page === totalPages - 1 ? 'not-allowed' : 'pointer', fontSize: '0.8rem', opacity: page === totalPages - 1 ? 0.4 : 1 }}
          >Next →</button>
        </div>
      )}
    </div>
  );
}
