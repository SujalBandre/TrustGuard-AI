/**
 * TrustGuard-AI | Damage Claim Verifier Page
 * ===========================================
 * Sixth module — YOLOv8-based damage image classifier.
 * Classifies uploaded product images as: fake_damage | real_damage | normal
 *
 * Matches the existing Glassmorphism dark cybersecurity design language.
 * Calls: POST /api/damage-detector/predict
 */

import React, { useState, useRef, useCallback } from 'react';
import {
  Camera, Upload, AlertTriangle, CheckCircle, XCircle, ZoomIn,
  X, Shield, Cpu, Info, BarChart2, Package, Layers
} from 'lucide-react';

const API_BASE = 'http://localhost:8001';

/* ─── Prediction badge config ──────────────────────────────────────────────── */
const PREDICTION_CONFIG = {
  fake_damage: {
    color:  '#EF4444',
    bg:     'rgba(239,68,68,0.12)',
    border: 'rgba(239,68,68,0.35)',
    glow:   'rgba(239,68,68,0.4)',
    icon:   XCircle,
    emoji:  '🚨',
    label:  'Fake Damage',
    risk:   'HIGH',
    riskClass: 'high',
    message: 'This image shows signs of digital manipulation. The damage appears to be artificially inserted to support a fraudulent return or refund claim. High risk of review fraud.',
  },
  real_damage: {
    color:  '#10B981',
    bg:     'rgba(16,185,129,0.12)',
    border: 'rgba(16,185,129,0.35)',
    glow:   'rgba(16,185,129,0.4)',
    icon:   CheckCircle,
    emoji:  '✅',
    label:  'Real Damage',
    risk:   'LOW',
    riskClass: 'low',
    message: 'The damage in this image appears genuine and authentic. No signs of digital manipulation detected. This looks like legitimate product damage.',
  },
  normal: {
    color:  '#94A3B8',
    bg:     'rgba(148,163,184,0.10)',
    border: 'rgba(148,163,184,0.25)',
    glow:   'rgba(148,163,184,0.2)',
    icon:   Package,
    emoji:  '📦',
    label:  'No Damage Detected',
    risk:   'NONE',
    riskClass: 'low',
    message: 'No damage class was detected above the confidence threshold. The image may show an undamaged product, or the image quality may be insufficient for a confident classification.',
  },
};

/* ─── Confidence Arc SVG ──────────────────────────────────────────────────── */
function ConfidenceArc({ confidence, color }) {
  const pct  = Math.round(confidence * 100);
  const r    = 60;
  const circ = 2 * Math.PI * r;
  const off  = circ - (pct / 100) * circ;

  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width={160} height={160} viewBox="0 0 160 160">
        <circle cx={80} cy={80} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={12} />
        <circle
          cx={80} cy={80} r={r} fill="none"
          stroke={color} strokeWidth={12}
          strokeDasharray={circ} strokeDashoffset={off}
          strokeLinecap="round"
          transform="rotate(-90 80 80)"
          style={{
            transition: 'stroke-dashoffset 1.4s cubic-bezier(0.4,0,0.2,1)',
            filter: `drop-shadow(0 0 8px ${color})`,
          }}
        />
        <text x={80} y={74} textAnchor="middle" fill={color} fontSize={26} fontWeight={800} fontFamily="Space Grotesk, sans-serif">
          {pct}%
        </text>
        <text x={80} y={94} textAnchor="middle" fill="var(--text-muted)" fontSize={9} fontFamily="Inter, sans-serif" letterSpacing={1.5}>
          CONFIDENCE
        </text>
      </svg>
    </div>
  );
}

/* ─── Score Bar ───────────────────────────────────────────────────────────── */
function ScoreBar({ label, value, color }) {
  const pct = Math.round(value * 100);
  return (
    <div style={{ marginBottom: '14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
        <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{label}</span>
        <span style={{ fontSize: '0.82rem', fontWeight: 800, color }}>{pct}%</span>
      </div>
      <div style={{ height: '8px', background: 'rgba(255,255,255,0.06)', borderRadius: '10px', overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${pct}%`, background: color,
          borderRadius: '10px',
          transition: 'width 1.4s cubic-bezier(0.4,0,0.2,1)',
          boxShadow: `0 0 10px ${color}55`,
        }} />
      </div>
    </div>
  );
}

/* ─── Results Panel ───────────────────────────────────────────────────────── */
function ResultsPanel({ result, filename }) {
  const cfg        = PREDICTION_CONFIG[result.prediction] || PREDICTION_CONFIG.normal;
  const confidence = result.confidence || 0;
  const details    = result.details    || {};
  const detections = details.detections || [];
  const classSummary = details.class_summary || {};
  const IconComp   = cfg.icon;

  return (
    <div style={{ animation: 'fadeIn 0.5s ease' }}>

      {/* ── Verdict Banner ── */}
      <div style={{
        padding: '28px 32px', borderRadius: '16px',
        border: `2px solid ${cfg.border}`, background: cfg.bg,
        display: 'flex', alignItems: 'center', gap: '24px',
        marginBottom: '20px', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '3px',
          background: `linear-gradient(90deg, transparent, ${cfg.color}, transparent)`,
        }} />
        <div style={{ fontSize: '3.5rem', lineHeight: 1, flexShrink: 0 }}>{cfg.emoji}</div>
        <div style={{ flex: 1 }}>
          <div style={{
            fontSize: '0.65rem', fontWeight: 700, color: cfg.color,
            textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: '6px',
          }}>
            🔬 YOLOv8 Damage Detector · Verdict
          </div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 900, color: cfg.color, margin: 0, marginBottom: '10px' }}>
            {cfg.label}
          </h2>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.65, maxWidth: '600px' }}>
            {cfg.message}
          </div>
        </div>
        <div style={{ textAlign: 'center', flexShrink: 0 }}>
          <ConfidenceArc confidence={confidence} color={cfg.color} />
        </div>
      </div>

      {/* ── File Info Strip ── */}
      <div style={{
        padding: '10px 16px', borderRadius: '8px', fontSize: '0.75rem',
        background: 'rgba(0,212,255,0.06)', border: '1px solid rgba(0,212,255,0.15)',
        color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '10px',
        marginBottom: '20px', flexWrap: 'wrap',
      }}>
        <Camera size={14} color="var(--cyan)" />
        <span style={{ color: 'var(--cyan)', fontWeight: 600 }}>File:</span>
        <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>{filename}</span>
        <span style={{ color: 'rgba(255,255,255,0.2)' }}>·</span>
        <span style={{
          padding: '2px 10px', borderRadius: '100px', fontWeight: 700,
          fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.1em',
          background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
        }}>
          {cfg.risk} RISK
        </span>
        <span style={{ color: 'rgba(255,255,255,0.2)' }}>·</span>
        <span>{details.total_detections ?? 0} detection{(details.total_detections ?? 0) !== 1 ? 's' : ''}</span>
      </div>

      {/* ── Detail Grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>

        {/* Class Confidence Bars */}
        <div className="card" style={{ padding: '24px' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BarChart2 size={13} /> Class Confidence Breakdown
          </div>
          {Object.keys(classSummary).length > 0 ? (
            Object.entries(classSummary).map(([cls, data]) => {
              const clsCfg = PREDICTION_CONFIG[cls] || {};
              return (
                <ScoreBar
                  key={cls}
                  label={`${cls === 'fake_damage' ? '🔴' : '🟢'} ${cls}`}
                  value={data.max_confidence}
                  color={clsCfg.color || '#94A3B8'}
                />
              );
            })
          ) : (
            <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
              <Package size={28} style={{ margin: '0 auto 10px', display: 'block', opacity: 0.4 }} />
              No classes detected above threshold ({Math.round((details.confidence_threshold || 0.25) * 100)}%)
            </div>
          )}
          <div style={{
            marginTop: '16px', padding: '10px 14px', borderRadius: '8px',
            background: 'rgba(0,212,255,0.06)', border: '1px solid rgba(0,212,255,0.15)',
            fontSize: '0.73rem', color: 'var(--text-muted)',
          }}>
            <span style={{ color: 'var(--cyan)', fontWeight: 700 }}>Threshold:</span>{' '}
            ≥{Math.round((details.confidence_threshold || 0.25) * 100)}% to register a detection
          </div>
        </div>

        {/* Risk + Stats */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div className="card" style={{ padding: '20px', flex: 1 }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Shield size={13} /> Verdict Summary
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { label: 'Prediction',  value: cfg.label,                          color: cfg.color },
                { label: 'Confidence',  value: `${Math.round(confidence * 100)}%`,  color: cfg.color },
                { label: 'Risk Level',  value: cfg.risk,                            color: cfg.color },
                { label: 'Detections', value: String(details.total_detections ?? 0), color: 'var(--cyan)' },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>{label}</span>
                  <span style={{ fontSize: '0.82rem', fontWeight: 800, color }}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card" style={{ padding: '20px' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '10px',
              padding: '10px 18px', borderRadius: '100px',
              background: cfg.bg, border: `1px solid ${cfg.border}`,
              fontSize: '0.82rem', fontWeight: 800, color: cfg.color,
            }}>
              <span style={{
                width: 10, height: 10, borderRadius: '50%', background: cfg.color,
                boxShadow: `0 0 10px ${cfg.color}`,
                animation: cfg.risk === 'HIGH' ? 'pulse 1.5s ease-in-out infinite' : 'none',
              }} />
              {cfg.risk} RISK
            </div>
          </div>
        </div>
      </div>

      {/* ── Bounding Box Detections Table ── */}
      {detections.length > 0 && (
        <div className="card" style={{ padding: '24px' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Layers size={13} /> Bounding Box Detections ({detections.length})
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
              <thead>
                <tr>
                  {['#', 'Class', 'Confidence', 'X1', 'Y1', 'X2', 'Y2', 'W × H'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--text-muted)', fontWeight: 700, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.08em', borderBottom: '1px solid var(--border)' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {detections.map((det, i) => {
                  const dCfg = PREDICTION_CONFIG[det.class] || {};
                  return (
                    <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '8px 12px', color: 'var(--text-muted)' }}>{i + 1}</td>
                      <td style={{ padding: '8px 12px' }}>
                        <span style={{
                          padding: '3px 10px', borderRadius: '100px', fontSize: '0.65rem', fontWeight: 700,
                          background: dCfg.bg || 'rgba(255,255,255,0.06)', color: dCfg.color || '#94A3B8',
                          border: `1px solid ${dCfg.border || 'rgba(255,255,255,0.1)'}`,
                          fontFamily: 'JetBrains Mono, monospace',
                        }}>
                          {det.class}
                        </span>
                      </td>
                      <td style={{ padding: '8px 12px', fontWeight: 800, color: dCfg.color || '#94A3B8' }}>
                        {Math.round(det.confidence * 100)}%
                      </td>
                      <td style={{ padding: '8px 12px', fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-secondary)' }}>{det.bbox?.x1 ?? '—'}</td>
                      <td style={{ padding: '8px 12px', fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-secondary)' }}>{det.bbox?.y1 ?? '—'}</td>
                      <td style={{ padding: '8px 12px', fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-secondary)' }}>{det.bbox?.x2 ?? '—'}</td>
                      <td style={{ padding: '8px 12px', fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-secondary)' }}>{det.bbox?.y2 ?? '—'}</td>
                      <td style={{ padding: '8px 12px', fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-muted)' }}>
                        {det.bbox ? `${det.bbox.width} × ${det.bbox.height}` : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Main Export ─────────────────────────────────────────────────────────── */
export default function DamageClaimVerifier() {
  const [dragOver,   setDragOver]   = useState(false);
  const [imageFile,  setImageFile]  = useState(null);
  const [imageUrl,   setImageUrl]   = useState(null);
  const [verifying,  setVerifying]  = useState(false);
  const [result,     setResult]     = useState(null);
  const [error,      setError]      = useState(null);
  const [lightbox,   setLightbox]   = useState(false);
  const fileRef = useRef();

  const loadFile = useCallback((file) => {
    if (!file || !file.type.startsWith('image/')) return;
    setImageFile(file);
    setImageUrl(URL.createObjectURL(file));
    setResult(null);
    setError(null);
  }, []);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    loadFile(e.dataTransfer.files[0]);
  };

  const reset = () => {
    setImageFile(null);
    setImageUrl(null);
    setResult(null);
    setError(null);
    setVerifying(false);
  };

  const runVerification = async () => {
    if (!imageFile) return;
    setVerifying(true);
    setResult(null);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', imageFile);

      const res = await fetch(`${API_BASE}/api/damage-detector/predict`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        // 503 = model not trained, surface clearly
        const msg = data?.detail || `Server error (HTTP ${res.status})`;
        setError(msg);
        return;
      }

      setResult(data);
    } catch (err) {
      setError(err?.message || 'Verification failed. Is the backend running?');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div>
      <style>{`
        @keyframes fadeIn    { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes scanline  { 0% { transform: translateY(-100%); opacity: 0.7; } 100% { transform: translateY(500%); opacity: 0; } }
        @keyframes pulse     { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }
        @keyframes spin      { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes glow-dd   { 0%, 100% { box-shadow: 0 0 20px rgba(239,68,68,0.3); } 50% { box-shadow: 0 0 40px rgba(239,68,68,0.6); } }
        .dd-upload-zone {
          border: 2px dashed rgba(239,68,68,0.35);
          border-radius: 16px;
          text-align: center;
          transition: all 0.3s cubic-bezier(0.4,0,0.2,1);
          cursor: pointer;
        }
        .dd-upload-zone:hover, .dd-upload-zone.dragging {
          border-color: rgba(239,68,68,0.7);
          background: rgba(239,68,68,0.05);
        }
        .w-full { width: 100%; }
      `}</style>

      {/* Lightbox */}
      {lightbox && imageUrl && (
        <div onClick={() => setLightbox(false)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)',
          zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out',
        }}>
          <img src={imageUrl} alt="Preview" style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: '12px', objectFit: 'contain' }} />
          <button onClick={() => setLightbox(false)} style={{
            position: 'absolute', top: '24px', right: '24px',
            background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%',
            width: 44, height: 44, cursor: 'pointer', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <X size={20} />
          </button>
        </div>
      )}

      {/* ── Page Header ── */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
          <div style={{
            width: 44, height: 44, borderRadius: '14px',
            background: 'rgba(239,68,68,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: 'glow-dd 3s ease-in-out infinite',
          }}>
            <Camera size={24} color="#EF4444" />
          </div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 900 }}>Damage Claim Verifier</h1>
          <span style={{
            padding: '4px 12px', borderRadius: '100px', fontSize: '0.62rem', fontWeight: 700,
            background: 'rgba(239,68,68,0.12)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.3)',
          }}>
            🔬 YOLOv8 Powered
          </span>
        </div>
        <p className="page-subtitle">
          Upload a product image submitted as part of a return or refund claim.
          The system will classify it as{' '}
          <strong style={{ color: '#EF4444' }}>Fake Damage</strong>,{' '}
          <strong style={{ color: '#10B981' }}>Real Damage</strong>, or{' '}
          <strong style={{ color: '#94A3B8' }}>No Damage</strong>{' '}
          using a custom-trained <strong style={{ color: '#EF4444' }}>YOLOv8</strong> detection model.
        </p>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
        <div style={{ width: '100%', maxWidth: '600px' }}>

        {/* ── Upload Panel ── */}
        <div className="card" style={{ padding: '24px' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Upload size={13} /> Upload Claim Image
          </div>

          {!imageUrl ? (
            <div
              className={`dd-upload-zone ${dragOver ? 'dragging' : ''}`}
              style={{ padding: '3rem 2rem' }}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
            >
              <input
                ref={fileRef} type="file" accept="image/*"
                style={{ display: 'none' }}
                onChange={(e) => e.target.files[0] && loadFile(e.target.files[0])}
              />
              <div style={{
                width: 68, height: 68, borderRadius: '20px',
                background: 'rgba(239,68,68,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 20px',
              }}>
                <Camera size={32} color="#EF4444" />
              </div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
                Drop damage claim image here
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
                Supports JPG, PNG, WEBP · Max 20 MB
              </p>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                {['🔴 fake_damage', '🟢 real_damage', '📦 normal'].map(tag => (
                  <span key={tag} style={{
                    padding: '4px 12px', borderRadius: '100px', fontSize: '0.65rem', fontWeight: 600,
                    background: 'rgba(255,255,255,0.04)', color: 'var(--text-muted)',
                    border: '1px solid var(--border)',
                  }}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border)', marginBottom: '14px' }}>
              <img
                src={imageUrl} alt={imageFile?.name}
                style={{ width: '100%', maxHeight: '260px', objectFit: 'cover', display: 'block' }}
              />
              {verifying && (
                <div style={{
                  position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
                }}>
                  <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, height: '4px',
                    background: 'linear-gradient(90deg, transparent, #EF4444, #10B981, #EF4444, transparent)',
                    animation: 'scanline 1.2s ease-in-out infinite',
                    boxShadow: '0 0 16px #EF4444',
                  }} />
                  <div style={{ textAlign: 'center', zIndex: 10 }}>
                    <div style={{
                      width: 40, height: 40,
                      border: '3px solid rgba(239,68,68,0.3)', borderTopColor: '#EF4444',
                      borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 10px',
                    }} />
                    <div style={{ fontSize: '0.82rem', color: '#fff', fontWeight: 700 }}>Running YOLOv8…</div>
                  </div>
                </div>
              )}
              <div style={{ position: 'absolute', top: '10px', right: '10px', display: 'flex', gap: '6px' }}>
                <button onClick={() => setLightbox(true)} style={{
                  width: 32, height: 32, borderRadius: '8px', background: 'rgba(0,0,0,0.65)',
                  border: '1px solid rgba(255,255,255,0.15)', cursor: 'pointer', color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <ZoomIn size={15} />
                </button>
                <button onClick={reset} style={{
                  width: 32, height: 32, borderRadius: '8px', background: 'rgba(239,68,68,0.55)',
                  border: '1px solid rgba(239,68,68,0.4)', cursor: 'pointer', color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <X size={15} />
                </button>
              </div>
            </div>
          )}

          {imageUrl && (
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '16px', display: 'flex', gap: '8px', alignItems: 'center' }}>
              <Camera size={12} />
              <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>{imageFile?.name}</span>
              <span style={{ color: 'rgba(255,255,255,0.2)' }}>·</span>
              <span>{(imageFile?.size / 1024).toFixed(1)} KB</span>
            </div>
          )}

          <button
            id="verify-claim-btn"
            className="btn w-full"
            style={{
              justifyContent: 'center',
              background: 'linear-gradient(135deg, #EF4444, #B91C1C)',
              color: '#fff',
              boxShadow: '0 0 24px rgba(239,68,68,0.35)',
              border: 'none',
            }}
            disabled={!imageUrl || verifying}
            onClick={runVerification}
          >
            {verifying
              ? <><div style={{ width: 15, height: 15, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /> Verifying…</>
              : <><Cpu size={16} /> Verify Claim</>}
          </button>
        </div>

        </div>
      </div>

      {/* ── Error State ── */}
      {error && (
        <div style={{
          padding: '18px', borderRadius: '12px', marginBottom: '20px',
          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)',
          display: 'flex', alignItems: 'flex-start', gap: '12px',
        }}>
          <AlertTriangle size={18} color="#EF4444" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#EF4444', marginBottom: '4px' }}>Verification Failed</div>
            <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', lineHeight: 1.6 }}>
              {error}
            </div>
            {error.includes('Model not ready') || error.includes('model_not_trained') || error.includes('503') ? (
              <div style={{ marginTop: '8px', fontSize: '0.75rem', color: '#F59E0B' }}>
                💡 The YOLOv8 model hasn't been trained yet. Run:{' '}
                <code style={{ fontFamily: 'JetBrains Mono, monospace', background: 'rgba(245,158,11,0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                  python -m backend.damage_detector.train
                </code>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* ── Loading Skeleton ── */}
      {verifying && !result && (
        <div className="card" style={{ padding: '48px', textAlign: 'center' }}>
          <div style={{
            width: 56, height: 56,
            border: '4px solid rgba(239,68,68,0.2)', borderTopColor: '#EF4444',
            borderRadius: '50%', animation: 'spin 0.9s linear infinite', margin: '0 auto 20px',
          }} />
          <h3 style={{ fontWeight: 800, marginBottom: '8px', fontSize: '1.1rem' }}>YOLOv8 is analysing…</h3>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
            Upload → Preprocess → Detection → Verdict
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {['Image upload', 'YOLO inference', 'Bbox extraction', 'Verdict'].map(step => (
              <span key={step} style={{
                padding: '5px 12px', borderRadius: '100px', fontSize: '0.67rem', fontWeight: 600,
                background: 'rgba(239,68,68,0.10)', color: '#EF4444',
                border: '1px solid rgba(239,68,68,0.25)', animation: 'pulse 1.5s ease-in-out infinite',
              }}>
                {step}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Results ── */}
      {result && !verifying && (
        <ResultsPanel result={result} filename={imageFile?.name || 'image.jpg'} />
      )}

      {/* ── Empty State ── */}
      {!imageUrl && !verifying && !result && (
        <div className="card" style={{ padding: '56px', textAlign: 'center' }}>
          <div style={{
            width: 80, height: 80, borderRadius: '24px',
            background: 'rgba(239,68,68,0.10)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px',
          }}>
            <Camera size={40} color="#EF4444" />
          </div>
          <h3 style={{ fontWeight: 800, marginBottom: '10px', fontSize: '1.1rem' }}>No image uploaded yet</h3>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', maxWidth: '420px', margin: '0 auto 24px', lineHeight: 1.7 }}>
            Upload a product damage image to run the YOLOv8 Damage Claim Verifier
            and detect whether the damage is genuine or fabricated.
          </p>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
            {['🔬 YOLOv8 detection', '🔴 fake_damage class', '🟢 real_damage class', '📦 normal (no damage)', '📐 Bounding boxes'].map(feat => (
              <span key={feat} style={{
                padding: '5px 12px', borderRadius: '100px', fontSize: '0.7rem', fontWeight: 600,
                background: 'rgba(255,255,255,0.04)', color: 'var(--text-secondary)',
                border: '1px solid var(--border)',
              }}>
                {feat}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
