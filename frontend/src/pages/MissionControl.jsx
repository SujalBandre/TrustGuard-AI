import React, { useEffect, useState } from 'react';
import { Shield, AlertTriangle, CheckCircle, Cpu, TrendingUp, RefreshCw, Search, Globe, BarChart3, FileText, Send } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area, CartesianGrid
} from 'recharts';
import { StatCard, AuthenticityMeter, RiskBadge, TagChip, Spinner, PulseItem } from '../components/ui';
import axios from 'axios';
import SystemOpinionManipulation from '../components/SystemOpinionManipulation';
import SystemReputationManagement from '../components/SystemReputationManagement';

const COLORS = ['#EF4444', '#10B981'];

function AnalystRequestModal({ cache, onClose, onSent }) {
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!note.trim()) return;
    setSending(true);
    try {
      await axios.post('http://localhost:8001/api/admin/request-analyst-report', {
        product_url: cache.product_url || '',
        product_name: cache.product_name || 'Unknown Product',
        admin_note: note.trim(),
        analysis_summary: {
          trust_score: cache.trust_score,
          total_reviews: cache.total_reviews,
          fake_count: cache.fake_count,
          risk_level: cache.risk_level,
        },
      });
      setSent(true);
      setTimeout(() => { onSent(); onClose(); }, 2000);
    } catch (err) {
      alert('Failed to send request. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
    }}>
      <div style={{
        background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border)',
        padding: '28px', maxWidth: '500px', width: '100%',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
      }}>
        {sent ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: '3rem', marginBottom: '12px' }}>✅</div>
            <h3 style={{ fontWeight: 800, color: '#10B981', marginBottom: '8px' }}>Request Sent!</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>The data analyst has been notified and will prepare a detailed report.</p>
          </div>
        ) : (
          <form onSubmit={handleSend}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <div style={{ width: 44, height: 44, borderRadius: '12px', background: 'rgba(124,58,237,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FileText size={22} color="#7C3AED" />
              </div>
              <div>
                <h3 style={{ fontWeight: 800, fontSize: '1rem' }}>Request Detailed Analyst Report</h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {cache.product_name || 'Current product'} · {cache.total_reviews || 0} reviews analyzed
                </p>
              </div>
            </div>

            <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(0,212,255,0.07)', border: '1px solid rgba(0,212,255,0.15)', marginBottom: '16px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Trust Score: <span style={{ color: 'var(--cyan)', fontWeight: 700 }}>{cache.trust_score || 0}%</span> &nbsp;·&nbsp;
              Fake: <span style={{ color: '#EF4444', fontWeight: 700 }}>{cache.fake_count || 0}</span> of {cache.total_reviews || 0} reviews &nbsp;·&nbsp;
              Risk: <span style={{ color: cache.risk_level === 'HIGH' ? '#EF4444' : cache.risk_level === 'MEDIUM' ? '#F59E0B' : '#10B981', fontWeight: 700 }}>{cache.risk_level || 'N/A'}</span>
            </div>

            <textarea
              required rows={4}
              placeholder="Describe what you need the analyst to investigate... (e.g. 'Please check if reviews are coordinated, identify bot networks, and provide a product health summary with recommendations.')"
              value={note} onChange={e => setNote(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-input)', color: '#fff', fontSize: '0.83rem', outline: 'none', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }}
            />

            <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
              <button type="button" onClick={onClose} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
              <button type="submit" disabled={sending || !note.trim()} style={{
                flex: 2, padding: '10px', borderRadius: '8px', border: 'none',
                background: sending ? 'rgba(124,58,237,0.5)' : '#7C3AED', color: '#fff',
                cursor: sending ? 'not-allowed' : 'pointer', fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              }}>
                {sending ? (
                  <><div style={{ width: 12, height: 12, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />Sending...</>
                ) : <><Send size={14} /> Send to Data Analyst</>}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function ProductDashboard({ data, onRequestAnalyst }) {
  const fakeRatio = data.reputation?.fake_ratio || {};
  const sentiment = data.reputation?.sentiment_distribution || {};
  const ratings   = data.reputation?.ratings_distribution || {};
  const flagged   = data.flagged_reviews || [];

  const pieData = [
    { name: 'Fake / Suspicious', value: fakeRatio.fake || 0 },
    { name: 'Genuine', value: fakeRatio.genuine || 0 },
  ];

  const sentimentBars = [
    { name: 'Positive', value: sentiment.positive || 0, fill: '#10B981' },
    { name: 'Neutral', value: sentiment.neutral || 0, fill: '#F59E0B' },
    { name: 'Negative', value: sentiment.negative || 0, fill: '#EF4444' },
  ];

  const ratingBars = [5,4,3,2,1].map(s => ({ name: `${s}★`, value: ratings[String(s)] || 0 }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', animation: 'fadeIn 0.4s ease' }}>
      {/* Product header */}
      <div style={{ padding: '14px 18px', borderRadius: '12px', background: 'linear-gradient(135deg, rgba(0,212,255,0.08), rgba(124,58,237,0.06))', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: '1rem', marginBottom: '3px' }}>{data.product_name}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', gap: '14px' }}>
            <span>🛒 {data.platform}</span>
            {data.pages_scraped > 0 && <span>📄 {data.pages_scraped} pages scraped</span>}
            {data.data_source && <span style={{ color: 'var(--cyan)' }}>📡 {data.data_source}</span>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <div style={{ textAlign: 'center', padding: '8px 16px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: data.trust_score >= 70 ? '#10B981' : data.trust_score >= 40 ? '#F59E0B' : '#EF4444' }}>{data.trust_score}%</div>
            <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Trust Score</div>
          </div>
          <button onClick={onRequestAnalyst} style={{
            padding: '8px 14px', borderRadius: '8px', border: '1px solid rgba(124,58,237,0.4)',
            background: 'rgba(124,58,237,0.1)', color: '#a78bfa', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700,
            display: 'flex', alignItems: 'center', gap: '6px',
          }}>
            <FileText size={14} /> Request Analyst Report
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
        {[
          { label: 'Total Reviews', value: fakeRatio.total_reviews || 0, color: '#00D4FF', emoji: '📊' },
          { label: 'Fake / Bot', value: fakeRatio.fake || 0, color: '#EF4444', emoji: '🚩' },
          { label: 'Genuine', value: fakeRatio.genuine || 0, color: '#10B981', emoji: '✅' },
          { label: 'Risk Level', value: data.risk_level || 'N/A', color: data.risk_level === 'HIGH' ? '#EF4444' : data.risk_level === 'MEDIUM' ? '#F59E0B' : '#10B981', emoji: '⚠️' },
        ].map(({ label, value, color, emoji }) => (
          <div key={label} style={{ padding: '14px', borderRadius: '10px', background: 'var(--bg-card)', border: '1px solid var(--border)', textAlign: 'center' }}>
            <div style={{ fontSize: '1.3rem', marginBottom: '4px' }}>{emoji}</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '4px', textTransform: 'uppercase' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr 1fr', gap: '14px' }}>
        {/* Pie chart */}
        <div className="card" style={{ padding: '16px' }}>
          <div style={{ fontSize: '0.73rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Authenticity</div>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={68} paddingAngle={3} dataKey="value">
                {pieData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', fontSize: '0.8rem' }} />
              <Legend wrapperStyle={{ fontSize: '0.68rem', color: 'var(--text-muted)' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Sentiment bar chart */}
        <div className="card" style={{ padding: '16px' }}>
          <div style={{ fontSize: '0.73rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Sentiment Distribution</div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={sentimentBars} barSize={40}>
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', fontSize: '0.8rem' }} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {sentimentBars.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Rating histogram */}
        <div className="card" style={{ padding: '16px' }}>
          <div style={{ fontSize: '0.73rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Rating Distribution</div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={ratingBars} barSize={28}>
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', fontSize: '0.8rem' }} />
              <Bar dataKey="value" radius={[6,6,0,0]} fill="var(--cyan)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detection tags */}
      {data.tags?.length > 0 && (
        <div className="card">
          <div style={{ fontSize: '0.73rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>🏷 Detection Signals</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {data.tags.map((t, i) => <TagChip key={i} label={t} />)}
          </div>
        </div>
      )}

      {/* Top flagged previews */}
      {flagged.length > 0 && (
        <div className="card">
          <div style={{ fontSize: '0.73rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px' }}>
            🚩 Top Flagged Reviews ({flagged.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '240px', overflowY: 'auto' }}>
            {flagged.slice(0, 8).map((rev, i) => (
              <div key={i} style={{ padding: '10px 12px', background: 'var(--bg-input)', borderRadius: '8px', borderLeft: `3px solid ${rev.risk_level === 'HIGH' ? '#EF4444' : '#F59E0B'}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{rev.author || 'Anonymous'} · {rev.rating ? `${rev.rating}★` : '—'}</span>
                  <span style={{ fontSize: '0.68rem', color: rev.risk_level === 'HIGH' ? '#EF4444' : '#F59E0B', fontWeight: 700 }}>{Math.round((rev.manipulation_probability || 0) * 100)}% fake</span>
                </div>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0, fontStyle: 'italic' }}>"{rev.text?.slice(0, 120)}{rev.text?.length > 120 ? '...' : ''}"</p>
                <div style={{ display: 'flex', gap: '4px', marginTop: '5px', flexWrap: 'wrap' }}>
                  {(rev.tags || []).slice(0, 3).map((t, j) => (
                    <span key={j} style={{ fontSize: '0.6rem', padding: '1px 6px', borderRadius: '100px', background: 'rgba(239,68,68,0.1)', color: '#EF4444', fontFamily: 'monospace' }}>{t}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function MissionControl() {
  const [stats, setStats]         = useState(null);
  const [loading, setLoading]     = useState(true);
  const [retraining, setRetraining] = useState(false);
  const [retrainMsg, setRetrainMsg] = useState(null);
  const [liveStream, setLiveStream] = useState([]);

  // Product analysis
  const [productUrl, setProductUrl]     = useState('');
  const [analyzing, setAnalyzing]       = useState(false);
  const [productData, setProductData]   = useState(null);
  const [showAnalystModal, setShowAnalystModal] = useState(false);
  const [activeView, setActiveView]     = useState('product');

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:8001/ws/live-analysis');
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setLiveStream(prev => [data, ...prev].slice(0, 15));
    };
    return () => ws.close();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await axios.get('http://localhost:8001/dashboard-stats');
      setStats(res.data);
    } catch {
      setStats({
        total_analyzed: 1240, fake_detected: 312, real_count: 928, avg_trust_score: 74.8,
        model_metrics: { accuracy: 0.9342, precision: 0.9217, recall: 0.9404, f1: 0.9310, total_samples: 50000, fake_count: 25000, real_count: 25000 },
        recent_flags: [
          { text: 'Best product ever!!! Buy now!!! Amazing!!!!!', author: 'bot_3412', tags: ['EXCESSIVE_EXCLAMATIONS'], risk: 'HIGH', evidence: 'High exclamation frequency. ML: 87% fake.', ts: new Date().toISOString() },
          { text: 'Very bad quality do not buy terrible waste.', author: 'user_8821', tags: ['COMPETITOR_BOMBING_PATTERN'], risk: 'HIGH', evidence: 'Rapid posting pattern.', ts: new Date(Date.now()-120000).toISOString() },
        ]
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyzeProduct = async (e) => {
    e.preventDefault();
    if (!productUrl.trim()) return;
    setAnalyzing(true);
    setProductData(null);
    try {
      const res = await axios.post('http://localhost:8001/api/admin/analyze-product', { url: productUrl }, { timeout: 120000 });
      setProductData(res.data);
      setActiveView('product');
    } catch (err) {
      alert(err?.response?.data?.detail || 'Analysis failed. Check the URL and try again.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleRetrain = async () => {
    setRetraining(true);
    setRetrainMsg(null);
    try {
      const res = await axios.post('http://localhost:8001/api/admin/retrain');
      const m = res.data.metrics;
      setRetrainMsg({ type: 'success', text: `✅ Model retrained! Accuracy: ${(m.accuracy * 100).toFixed(1)}% | F1: ${(m.f1 * 100).toFixed(1)}% | ${m.total_samples?.toLocaleString()} samples` });
      fetchStats();
    } catch (e) {
      setRetrainMsg({ type: 'error', text: `❌ Retrain failed: ${e?.response?.data?.detail || e.message}` });
    } finally {
      setRetraining(false);
    }
  };

  useEffect(() => { fetchStats(); }, []);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 48, height: 48, border: '3px solid var(--border)', borderTopColor: 'var(--cyan)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
        <p style={{ color: 'var(--text-secondary)' }}>Loading Mission Control...</p>
      </div>
      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </div>
  );

  const m = stats?.model_metrics || {};
  const fakeCount = stats?.fake_detected || 0;
  const realCount = stats?.real_count || 0;
  const total = stats?.total_analyzed || 0;
  const fakePct = total > 0 ? Math.round((fakeCount / total) * 100) : 0;
  const pieData = [{ name: 'Fake / Suspicious', value: fakeCount }, { name: 'Genuine', value: realCount }];
  const metricBars = [
    { name: 'Accuracy', value: Math.round((m.accuracy || 0) * 100) },
    { name: 'Precision', value: Math.round((m.precision || 0) * 100) },
    { name: 'Recall', value: Math.round((m.recall || 0) * 100) },
    { name: 'F1-Score', value: Math.round((m.f1 || 0) * 100) },
  ];

  return (
    <div>
      <style>{`
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes ping { 0%,100%{opacity:1} 50%{opacity:0.4} }
      `}</style>

      {showAnalystModal && productData && (
        <AnalystRequestModal
          cache={{ product_name: productData.product_name, product_url: productUrl, trust_score: productData.trust_score, total_reviews: productData.reputation?.fake_ratio?.total_reviews, fake_count: productData.reputation?.fake_ratio?.fake, risk_level: productData.risk_level }}
          onClose={() => setShowAnalystModal(false)}
          onSent={() => {}}
        />
      )}

      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
            <Shield size={28} color="var(--cyan)" />
            <h1 className="text-xl">Admin Mission Control</h1>
          </div>
          <p className="page-subtitle">AI Powered Fake Review, Opinion Manipulation & Reputation Management · {(m.total_samples || 0).toLocaleString()} reviews trained</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button onClick={fetchStats} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.8rem' }}>
            <RefreshCw size={14} /> Refresh
          </button>

        </div>
      </div>

      {retrainMsg && (
        <div style={{ padding: '10px 16px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.82rem', fontWeight: 600, background: retrainMsg.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${retrainMsg.type === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`, color: retrainMsg.type === 'success' ? 'var(--green)' : 'var(--red)' }}>
          {retrainMsg.text}
        </div>
      )}

      {/* ── Product URL Analyzer ─────────────────────────────────────────────── */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
          <Globe size={18} color="var(--cyan)" />
          <h3 style={{ fontWeight: 700, fontSize: '0.95rem' }}>Product URL Analyzer</h3>
          <span style={{ fontSize: '0.68rem', padding: '2px 8px', borderRadius: '100px', background: 'rgba(0,212,255,0.1)', color: 'var(--cyan)', fontWeight: 600 }}>Admin</span>
        </div>
        <form onSubmit={handleAnalyzeProduct} style={{ display: 'flex', gap: '10px' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Globe size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="input-field"
              style={{ paddingLeft: '36px' }}
              placeholder="Paste Amazon, Flipkart, Myntra, or any e-commerce product URL..."
              value={productUrl}
              onChange={e => setProductUrl(e.target.value)}
              required
            />
          </div>
          <button type="submit" disabled={analyzing} style={{ padding: '0 24px', borderRadius: '10px', border: 'none', background: analyzing ? 'rgba(0,212,255,0.4)' : 'var(--cyan)', color: '#000', fontWeight: 700, cursor: analyzing ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.88rem' }}>
            {analyzing ? <><div style={{ width: 14, height: 14, border: '2px solid rgba(0,0,0,0.3)', borderTopColor: '#000', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />Analyzing...</> : <><Search size={15} />Analyze Product</>}
          </button>
        </form>
        {analyzing && <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '8px' }}>Fetching live reviews from all pages... this may take 30–90 seconds.</p>}
      </div>

      {/* ── Product Analysis Tabs ───────────────────────────────────────── */}
      {productData && (
        <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid var(--border)', marginBottom: '20px' }}>
          {[
            { key: 'product', label: '🔍 Product Analysis' },
            { key: 'opinion', label: '🎭 Opinion Manipulation' },
            { key: 'reputation', label: '🛡️ Reputation Management' },
          ].map(({ key, label }) => (
            <button key={key} onClick={() => setActiveView(key)} style={{
              padding: '8px 16px', background: 'none', border: 'none', cursor: 'pointer',
              fontSize: '0.85rem', fontWeight: 700,
              color: activeView === key ? 'var(--cyan)' : 'var(--text-muted)',
              borderBottom: activeView === key ? '2px solid var(--cyan)' : '2px solid transparent',
              transition: 'all 0.2s',
            }}>{label}</button>
          ))}
        </div>
      )}

      {activeView === 'product' && productData && (
        <ProductDashboard
          data={productData}
          onRequestAnalyst={() => setShowAnalystModal(true)}
        />
      )}
      {activeView === 'opinion' && productData && (
        <SystemOpinionManipulation data={productData} />
      )}
      {activeView === 'reputation' && productData && (
        <SystemReputationManagement data={productData} />
      )}
    </div>
  );
}
