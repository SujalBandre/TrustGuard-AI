import React, { useState, useRef, useEffect } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle, Download, Clock, ExternalLink } from 'lucide-react';
import {
  RiskBadge, TagChip, ProgressBar, Spinner, AuthenticityMeter, StatCard
} from '../components/ui';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid
} from 'recharts';
import { AlertTriangle, Cpu, Shield } from 'lucide-react';
import axios from 'axios';

const SAMPLE_CSV = `text_,rating,author,timestamp
Best product ever!!! Buy it now!!! AMAZING!!!!!,5,user_bot_1,2024-01-15T10:01:00
Best product ever!!! Buy it now!!! AMAZING!!!!!,5,user_bot_2,2024-01-15T10:02:00
Terrible. Broke immediately. Complete waste.,1,anon_342,2024-01-15T10:03:00
Great quality, fast shipping. Really happy with it.,5,sarah_k,2024-01-15T10:10:00
I got this for free to review but it is really good!,5,free_rev,2024-01-15T10:15:00
Not worth the price. Disappointed overall.,2,mike_r,2024-01-15T10:25:00
Excellent build quality. Worked out of the box.,4,priya_m,2024-01-15T11:00:00
WORST PRODUCT EVER!!!!! DO NOT BUY THIS TRASH!!!!,1,troll_99,2024-01-15T11:01:00
WORST PRODUCT EVER!!!!! DO NOT BUY THIS TRASH!!!!,1,troll_98,2024-01-15T11:01:30
Works as expected. Nothing special.,3,normal_user,2024-01-15T12:00:00`;

export default function BatchAnalysis() {
  const [dragging, setDragging]   = useState(false);
  const [file,     setFile]       = useState(null);
  const [loading,  setLoading]    = useState(false);
  const [result,   setResult]     = useState(null);
  const [error,    setError]      = useState(null);
  const [tab,      setTab]        = useState('summary');
  const [mainTab,  setMainTab]    = useState('upload'); // 'upload' | 'history'
  const [history,  setHistory]    = useState([]);
  const [histLoading, setHistLoading] = useState(false);
  const fileRef = useRef();

  const fetchHistory = async () => {
    setHistLoading(true);
    try {
      const res = await axios.get('http://localhost:8001/api/admin/batch-history');
      setHistory(res.data.history || []);
    } catch {
      setHistory([]);
    } finally {
      setHistLoading(false);
    }
  };

  useEffect(() => { fetchHistory(); }, []);

  const processFile = async (f) => {
    setFile(f);
    setResult(null);
    setError(null);
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('file', f);
      const res = await axios.post('/upload-csv', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Upload failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f?.name.endsWith('.csv')) processFile(f);
  };

  const downloadSample = () => {
    const blob = new Blob([SAMPLE_CSV], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a'); 
    a.href = url; a.download = 'sample_reviews.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const exportResults = () => {
    if (!result) return;
    const json = JSON.stringify(result, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'trustguard_report.json'; a.click();
    URL.revokeObjectURL(url);
  };

  const flagDist = result?.flagged_reviews
    ? [
        { name: 'Fake/Suspicious', count: result.fake_count },
        { name: 'Genuine', count: result.real_count },
      ]
    : [];

  const riskColor = { HIGH: 'var(--red)', MEDIUM: 'var(--amber)', LOW: 'var(--green)' };

  return (
    <div>
      <div className="page-header">
        <div className="flex items-center gap-3 mb-2">
          <Upload size={28} color="var(--cyan)" />
          <h1>Batch Analysis</h1>
        </div>
        <p className="page-subtitle">Upload a CSV of reviews — get a complete manipulation audit report · view historical product analyses</p>
      </div>

      {/* Main tab switcher */}
      <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid var(--border)', marginBottom: '20px' }}>
        {[
          { key: 'upload', label: '📤 Upload & Analyze' },
          { key: 'history', label: `🕒 Historical Analysis (${history.length})` },
        ].map(({ key, label }) => (
          <button key={key} onClick={() => { setMainTab(key); if (key === 'history') fetchHistory(); }} style={{
            padding: '8px 16px', background: 'none', border: 'none', cursor: 'pointer',
            fontSize: '0.85rem', fontWeight: 700,
            color: mainTab === key ? 'var(--cyan)' : 'var(--text-muted)',
            borderBottom: mainTab === key ? '2px solid var(--cyan)' : '2px solid transparent',
            transition: 'all 0.2s',
          }}>{label}</button>
        ))}
      </div>

      {/* ── Historical Analysis Tab ─────────────────────────────────────────── */}
      {mainTab === 'history' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontWeight: 700, fontSize: '0.9rem' }}>Previously Analyzed Products</h3>
            <button onClick={fetchHistory} style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.78rem' }}>
              🔄 Refresh
            </button>
          </div>
          {histLoading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Loading history...</div>
          ) : history.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              No products analyzed yet. Use the Admin URL Analyzer in Mission Control to populate history.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {history.map((entry, i) => {
                const riskC = entry.risk_level === 'HIGH' ? '#EF4444' : entry.risk_level === 'MEDIUM' ? '#F59E0B' : '#10B981';
                return (
                  <div key={i} style={{ padding: '12px 16px', background: 'var(--bg-input)', borderRadius: '10px', borderLeft: `3px solid ${riskC}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ flex: 1, minWidth: '200px' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: '2px' }}>{entry.product_name || 'Unknown Product'}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                        🛒 {entry.platform} &nbsp;·&nbsp; 📅 {new Date(entry.ts).toLocaleString()}
                      </div>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {(entry.tags || []).slice(0, 3).map((t, j) => (
                          <span key={j} style={{ fontSize: '0.58rem', padding: '1px 6px', borderRadius: '100px', background: 'rgba(0,212,255,0.08)', color: 'var(--cyan)', fontFamily: 'monospace' }}>{t}</span>
                        ))}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '1.2rem', fontWeight: 800, color: riskC }}>{entry.trust_score}%</div>
                        <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>Trust</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#EF4444' }}>{entry.fake_count}</div>
                        <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>Fake</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-secondary)' }}>{entry.total_reviews}</div>
                        <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>Total</div>
                      </div>
                      <a href={entry.product_url} target="_blank" rel="noopener noreferrer" style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.75rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <ExternalLink size={12} /> View
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {mainTab === 'upload' && (
      <>
      {/* Upload Zone */}
      <div className="card mb-4">
        <div
          className={`upload-zone ${dragging ? 'dragging' : ''}`}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
        >
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            style={{ display: 'none' }}
            onChange={e => e.target.files[0] && processFile(e.target.files[0])}
          />
          <Upload size={40} color="var(--cyan)" style={{ marginBottom: '1rem' }} />
          <h3 className="font-display" style={{ color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
            {file ? file.name : 'Drop your CSV here or click to browse'}
          </h3>
          <p className="text-sm text-muted">
            Expected columns: <code style={{ color: 'var(--cyan)' }}>text_</code> (required),&nbsp;
            <code style={{ color: 'var(--cyan)' }}>rating</code>, <code style={{ color: 'var(--cyan)' }}>author</code>,&nbsp;
            <code style={{ color: 'var(--cyan)' }}>timestamp</code>
          </p>
        </div>

        <div className="flex gap-3 mt-4">
          <button className="btn btn-secondary btn-sm" onClick={downloadSample}>
            <Download size={14} /> Download Sample CSV
          </button>
          {result && (
            <button className="btn btn-secondary btn-sm" onClick={exportResults}>
              <Download size={14} /> Export JSON Report
            </button>
          )}
        </div>
      </div>

      {loading && (
        <div className="card flex items-center justify-between" style={{ justifyContent: 'center', padding: '3rem', gap: '1rem' }}>
          <Spinner size={36} />
          <span className="text-secondary">Processing reviews…</span>
        </div>
      )}

      {error && (
        <div className="card mb-4" style={{ borderColor: 'rgba(239,68,68,0.4)', background: 'var(--red-dim)' }}>
          <div className="flex gap-2 items-center">
            <AlertCircle size={20} color="var(--red)" />
            <span style={{ color: 'var(--red)', fontSize: '0.875rem' }}>{error}</span>
          </div>
        </div>
      )}

      {result && (
        <>
          {/* Summary Cards */}
          <div className="stats-grid mb-4">
            <StatCard icon={FileText}      label="Total Reviews"  value={result.total_reviews}   color="cyan"   />
            <StatCard icon={AlertTriangle} label="Fake Detected"  value={result.fake_count}       color="red"    />
            <StatCard icon={CheckCircle}   label="Genuine"        value={result.real_count}       color="green"  />
            <StatCard icon={Shield}        label="Trust Score"    value={`${result.trust_score}%`} color="purple" />
          </div>

          {/* Tabs */}
          <div className="card">
            <div className="flex gap-3 mb-4" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
              {['summary', 'flagged', 'temporal', 'behavioral'].map(t => (
                <button
                  key={t}
                  className={`btn btn-sm ${tab === t ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setTab(t)}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>

            {tab === 'summary' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '1.5rem', alignItems: 'center' }}>
                <div>
                  <h3 className="text-sm font-display text-secondary mb-4">Fake vs Genuine Distribution</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={flagDist} barSize={60}>
                      <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10 }} />
                      <Bar dataKey="count" radius={[8,8,0,0]}>
                        {flagDist.map((_, i) => (
                          <rect key={i} fill={i === 0 ? 'var(--red)' : 'var(--green)'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>

                  <div className="mt-4">
                    <ProgressBar
                      value={result.fake_percentage}
                      label={`Fake percentage: ${result.fake_percentage}%`}
                      color={riskColor[result.risk_level]}
                    />
                  </div>

                  <div className="mt-4 flex gap-2" style={{ flexWrap: 'wrap' }}>
                    {result.tags?.map((t, i) => <TagChip key={i} label={t} />)}
                  </div>

                  <div className="mt-4 text-sm text-secondary" style={{ lineHeight: 1.7, background: 'var(--bg-input)', padding: '0.75rem 1rem', borderRadius: 8, borderLeft: '3px solid var(--cyan)' }}>
                    {result.recommendation}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                  <AuthenticityMeter score={Math.round(result.trust_score)} size={180} />
                  <RiskBadge level={result.risk_level} />
                </div>
              </div>
            )}

            {tab === 'flagged' && (
              <div>
                <h3 className="text-sm font-display text-secondary mb-3">
                  🚩 Flagged Reviews ({result.flagged_reviews?.length || 0})
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '450px', overflowY: 'auto' }}>
                  {(result.flagged_reviews || []).map((rev, i) => (
                    <div
                      key={i}
                      style={{
                        padding: '0.75rem 1rem',
                        background: 'var(--bg-input)',
                        borderRadius: 10,
                        borderLeft: `3px solid ${riskColor[rev.risk_level] || 'var(--red)'}`,
                      }}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-muted font-mono">
                          {rev.author || 'Unknown'} · {rev.rating ? `${rev.rating}★` : '—'} · {rev.timestamp || '—'}
                        </span>
                        <div className="flex gap-2 items-center">
                          <span className="font-mono text-xs text-amber">{(rev.manipulation_probability * 100).toFixed(0)}% fake</span>
                          <RiskBadge level={rev.risk_level} />
                        </div>
                      </div>
                      <p className="text-sm italic text-secondary mb-2">"{rev.text?.slice(0, 150)}…"</p>
                      <p className="text-xs text-muted mb-2">🔍 {rev.evidence}</p>
                      <div className="flex gap-1" style={{ flexWrap: 'wrap' }}>
                        {rev.tags?.map((t, j) => <TagChip key={j} label={t} />)}
                      </div>
                    </div>
                  ))}
                  {!result.flagged_reviews?.length && (
                    <p className="text-secondary text-center" style={{ padding: '2rem' }}>
                      ✅ No reviews flagged as fake.
                    </p>
                  )}
                </div>
              </div>
            )}

            {tab === 'temporal' && (
              <div>
                <h3 className="text-sm font-display text-secondary mb-3">⏱ Temporal / Velocity Analysis</h3>
                {result.temporal_analysis?.burst_detected !== undefined ? (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    {[
                      { label: 'Burst Detected', value: result.temporal_analysis.burst_detected ? '⚠️ YES' : '✅ NO' },
                      { label: 'Velocity Score', value: `${(result.temporal_analysis.velocity_score * 100).toFixed(0)}%` },
                      { label: 'Avg Interval', value: `${result.temporal_analysis.mean_interval_m ?? '—'} min` },
                      { label: 'Burst Windows', value: result.temporal_analysis.burst_windows ?? 0 },
                    ].map(({ label, value }) => (
                      <div key={label} style={{ background: 'var(--bg-input)', borderRadius: 10, padding: '1rem' }}>
                        <div className="text-xs text-muted mb-1">{label}</div>
                        <div className="text-xl font-display" style={{ color: 'var(--cyan)' }}>{value}</div>
                      </div>
                    ))}
                    <div style={{ gridColumn: '1/-1', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {result.temporal_analysis.tags?.map((t, i) => <TagChip key={i} label={t} />)}
                    </div>
                  </div>
                ) : (
                  <p className="text-secondary text-sm">No timestamps in uploaded CSV — add a <code>timestamp</code> column for temporal detection.</p>
                )}
              </div>
            )}

            {tab === 'behavioral' && (
              <div>
                <h3 className="text-sm font-display text-secondary mb-3">🤖 Behavioral / Bot Analysis</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  {[
                    { label: 'Bot Probability', value: `${((result.behavioral_analysis?.bot_prob || 0) * 100).toFixed(0)}%` },
                    { label: 'Detected Bots', value: result.behavioral_analysis?.detected_bots ?? 0 },
                  ].map(({ label, value }) => (
                    <div key={label} style={{ background: 'var(--bg-input)', borderRadius: 10, padding: '1rem' }}>
                      <div className="text-xs text-muted mb-1">{label}</div>
                      <div className="text-xl font-display" style={{ color: 'var(--amber)' }}>{value}</div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
                  {result.behavioral_analysis?.tags?.map((t, i) => <TagChip key={i} label={t} />)}
                </div>
              </div>
            )}
          </div>
        </>
      )}
      </>
      )}
    </div>
  );
}
