import React, { useEffect, useState } from 'react';
import { Shield, AlertTriangle, CheckCircle, Cpu, TrendingUp, RefreshCw, Search, Globe, BarChart3, FileText, Send, Download } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area, CartesianGrid
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { StatCard, AuthenticityMeter, RiskBadge, TagChip, Spinner, PulseItem } from '../components/ui';
import axios from 'axios';
import SystemOpinionManipulation from '../components/SystemOpinionManipulation';
import SystemReputationManagement from '../components/SystemReputationManagement';
import { generateAuditReportPdf } from '../lib/pdfGenerator';

const COLORS = ['#E53E3E', '#38A169']; // Red for Fake, Green for Genuine

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
      backdropFilter: 'blur(8px)'
    }}>
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="card"
        style={{
          padding: '28px', maxWidth: '500px', width: '100%',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        }}
      >
        {sent ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: '3rem', marginBottom: '12px' }}>✅</div>
            <h3 style={{ fontWeight: 800, color: 'var(--green)', marginBottom: '8px' }}>Request Sent!</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>The data analyst has been notified and will prepare a detailed report.</p>
          </motion.div>
        ) : (
          <form onSubmit={handleSend}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
              <div style={{ width: 48, height: 48, borderRadius: '14px', background: 'var(--purple-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FileText size={24} color="var(--purple)" />
              </div>
              <div>
                <h3 style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--text-primary)' }}>Request Analyst Report</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  {cache.product_name || 'Current product'} · {cache.total_reviews || 0} reviews
                </p>
              </div>
            </div>

            <div style={{ padding: '12px 16px', borderRadius: '10px', background: 'var(--bg-surface-2)', border: '1px solid var(--border)', marginBottom: '20px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Trust Score: <span style={{ color: 'var(--accent-primary)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{cache.trust_score || 0}%</span> &nbsp;·&nbsp;
              Fake: <span style={{ color: 'var(--accent-danger)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{cache.fake_count || 0}</span> of {cache.total_reviews || 0} &nbsp;·&nbsp;
              Risk: <span style={{ color: cache.risk_level === 'HIGH' ? 'var(--accent-danger)' : cache.risk_level === 'MEDIUM' ? 'var(--accent-warning)' : 'var(--accent-success)', fontWeight: 700 }}>{cache.risk_level || 'N/A'}</span>
            </div>

            <textarea
              required rows={4}
              placeholder="Describe what you need the analyst to investigate..."
              value={note} onChange={e => setNote(e.target.value)}
              className="input-field"
              style={{ marginBottom: '20px' }}
            />

            <div style={{ display: 'flex', gap: '12px' }}>
              <button type="button" onClick={onClose} className="btn btn-secondary" style={{ flex: 1 }}>Cancel</button>
              <button type="submit" disabled={sending || !note.trim()} className="btn btn-primary" style={{ flex: 2 }}>
                {sending ? (
                  <><div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />Sending...</>
                ) : <><Send size={16} /> Send to Data Analyst</>}
              </button>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
}

function ProductDashboard({ data, productUrl, onRequestAnalyst }) {
  const fakeRatio = data.reputation?.fake_ratio || {};
  const sentiment = data.reputation?.sentiment_distribution || {};
  const ratings   = data.reputation?.ratings_distribution || {};
  const flagged   = data.flagged_reviews || [];

  const pieData = [
    { name: 'Fake / Suspicious', value: fakeRatio.fake || 0 },
    { name: 'Genuine', value: fakeRatio.genuine || 0 },
  ];

  const sentimentBars = [
    { name: 'Positive', value: sentiment.positive || 0, fill: 'var(--accent-success)' },
    { name: 'Neutral', value: sentiment.neutral || 0, fill: 'var(--accent-primary)' },
    { name: 'Negative', value: sentiment.negative || 0, fill: 'var(--accent-danger)' },
  ];

  const ratingBars = [5,4,3,2,1].map(s => ({ name: `${s}★`, value: ratings[String(s)] || 0 }));

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };
  
  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Product header */}
      <motion.div variants={itemVariants} className="card" style={{ padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: '1.15rem', marginBottom: '6px', color: 'var(--text-primary)' }}>{data.product_name}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', gap: '16px', fontFamily: 'var(--font-mono)' }}>
            <span>🛒 {data.platform}</span>
            {data.pages_scraped > 0 && <span>📄 {data.pages_scraped} pages scraped</span>}
            {data.data_source && <span style={{ color: 'var(--accent-primary)' }}>📡 {data.data_source}</span>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ textAlign: 'center', padding: '10px 20px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '1.8rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: data.trust_score >= 70 ? 'var(--accent-success)' : data.trust_score >= 40 ? 'var(--accent-warning)' : 'var(--accent-danger)' }}>{data.trust_score}%</div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'var(--font-mono)' }}>Trust Score</div>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => generateAuditReportPdf(data, productUrl)}
            className="btn btn-secondary"
            style={{ padding: '10px 16px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}
            title="Download full forensic PDF audit report (Product Analysis, Opinion Manipulation, Reputation Management)"
          >
            <Download size={16} /> Download PDF Report
          </motion.button>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={onRequestAnalyst} className="btn btn-primary" style={{ padding: '10px 16px', fontSize: '0.85rem', background: 'var(--accent-primary)' }}>
            <FileText size={16} /> Request Analyst Report
          </motion.button>
        </div>
      </motion.div>

      {/* Stats row */}
      <motion.div variants={itemVariants} className="stats-grid">
        {[
          { label: 'Total Reviews', value: fakeRatio.total_reviews || 0, color: 'var(--text-primary)', emoji: '📊' },
          { label: 'Fake / Bot', value: fakeRatio.fake || 0, color: 'var(--accent-danger)', emoji: '🚩' },
          { label: 'Genuine', value: fakeRatio.genuine || 0, color: 'var(--accent-success)', emoji: '✅' },
          { label: 'Risk Level', value: data.risk_level || 'N/A', color: data.risk_level === 'HIGH' ? 'var(--accent-danger)' : data.risk_level === 'MEDIUM' ? 'var(--accent-warning)' : 'var(--accent-success)', emoji: '⚠️' },
        ].map(({ label, value, color, emoji }) => (
          <div key={label} className="stat-card" style={{ textAlign: 'center', background: 'var(--bg-surface)' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>{emoji}</div>
            <div style={{ fontSize: '2rem', fontWeight: 700, color, fontFamily: 'var(--font-mono)', lineHeight: 1 }}>{value}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '8px', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'var(--font-mono)' }}>{label}</div>
          </div>
        ))}
      </motion.div>

      {/* Charts row */}
      <motion.div variants={itemVariants} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
        {/* Pie chart */}
        <div className="card">
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px', fontFamily: 'var(--font-mono)' }}>Authenticity</div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value" stroke="none">
                {pieData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
              </Pie>
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Sentiment bar chart */}
        <div className="card">
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px', fontFamily: 'var(--font-mono)' }}>Sentiment Distribution</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={sentimentBars} barSize={40}>
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {sentimentBars.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Rating histogram */}
        <div className="card">
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px', fontFamily: 'var(--font-mono)' }}>Rating Distribution</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={ratingBars} barSize={32}>
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
              <Bar dataKey="value" radius={[6,6,0,0]} fill="var(--accent-primary)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Detection tags */}
      {data.tags?.length > 0 && (
        <motion.div variants={itemVariants} className="card">
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '16px', fontFamily: 'var(--font-mono)' }}>🏷 Detection Signals</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {data.tags.map((t, i) => <span key={i} className="tag">{t}</span>)}
          </div>
        </motion.div>
      )}

      {/* Top flagged previews */}
      {flagged.length > 0 && (
        <motion.div variants={itemVariants} className="card">
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '16px', fontFamily: 'var(--font-mono)' }}>
            🚩 Top Flagged Reviews ({flagged.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '300px', overflowY: 'auto', paddingRight: '8px' }}>
            {flagged.slice(0, 8).map((rev, i) => (
              <div key={i} style={{ padding: '14px 16px', background: 'var(--bg-input)', borderRadius: '12px', borderLeft: `4px solid ${rev.risk_level === 'HIGH' ? 'var(--red)' : 'var(--amber)'}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{rev.author || 'Anonymous'} · {rev.rating ? `${rev.rating}★` : '—'}</span>
                  <span style={{ fontSize: '0.75rem', color: rev.risk_level === 'HIGH' ? 'var(--red)' : 'var(--amber)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{Math.round((rev.manipulation_probability || 0) * 100)}% fake</span>
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0, fontStyle: 'italic', lineHeight: '1.5' }}>"{rev.text?.slice(0, 150)}{rev.text?.length > 150 ? '...' : ''}"</p>
                <div style={{ display: 'flex', gap: '6px', marginTop: '10px', flexWrap: 'wrap' }}>
                  {(rev.tags || []).slice(0, 3).map((t, j) => (
                    <span key={j} style={{ fontSize: '0.65rem', padding: '2px 8px', borderRadius: '100px', background: 'var(--red-dim)', color: 'var(--red)', fontFamily: 'var(--font-mono)' }}>{t}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
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
        <div style={{ width: 48, height: 48, border: '3px solid var(--border)', borderTopColor: 'var(--purple)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
        <p style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>Loading Mission Control...</p>
      </div>
    </div>
  );

  const m = stats?.model_metrics || {};

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
      <AnimatePresence>
        {showAnalystModal && productData && (
          <AnalystRequestModal
            cache={{ product_name: productData.product_name, product_url: productUrl, trust_score: productData.trust_score, total_reviews: productData.reputation?.fake_ratio?.total_reviews, fake_count: productData.reputation?.fake_ratio?.fake, risk_level: productData.risk_level }}
            onClose={() => setShowAnalystModal(false)}
            onSent={() => {}}
          />
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <Shield size={32} color="var(--text-primary)" />
            <h1 className="text-2xl">Admin Mission Control</h1>
          </div>
          <p className="page-subtitle">AI Powered Fake Review &amp; Reputation Management · <span style={{ fontFamily: 'var(--font-mono)' }}>{(m.total_samples || 0).toLocaleString()}</span> reviews trained</p>
        </div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button onClick={fetchStats} className="btn btn-secondary btn-sm">
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {retrainMsg && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ padding: '12px 20px', borderRadius: '12px', marginBottom: '24px', fontSize: '0.9rem', fontWeight: 600, background: retrainMsg.type === 'success' ? 'var(--green-dim)' : 'var(--red-dim)', border: `1px solid ${retrainMsg.type === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`, color: retrainMsg.type === 'success' ? 'var(--green)' : 'var(--red)' }}>
          {retrainMsg.text}
        </motion.div>
      )}

      {/* ── Product URL Analyzer ─────────────────────────────────────────────── */}
      <div className="card" style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <Globe size={20} color="var(--text-primary)" />
          <h3 style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--text-primary)' }}>Product URL Analyzer</h3>
          <span style={{ 
            marginLeft: '8px', 
            padding: '3px 10px', 
            borderRadius: '100px', 
            fontSize: '0.72rem', 
            fontWeight: 700, 
            background: 'var(--accent-dim)', 
            color: 'var(--accent-primary)', 
            border: '1px solid var(--border-purple)' 
          }}>Admin</span>
        </div>
        <form onSubmit={handleAnalyzeProduct} style={{ display: 'flex', gap: '16px' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Globe size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="input-field"
              style={{ paddingLeft: '44px' }}
              placeholder="Paste Amazon, Flipkart, Myntra, or any e-commerce product URL..."
              value={productUrl}
              onChange={e => setProductUrl(e.target.value)}
              required
            />
          </div>
          <button type="submit" disabled={analyzing} className="btn btn-primary" style={{ padding: '0 32px' }}>
            {analyzing ? <><div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />Analyzing...</> : <><Search size={16} />Analyze Product</>}
          </button>
        </form>
        {analyzing && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '12px', fontFamily: 'var(--font-mono)' }}>Fetching live reviews from all pages... this may take 30–90 seconds.</motion.p>}
      </div>

      {/* ── Product Analysis Tabs ───────────────────────────────────────── */}
      {productData && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', borderBottom: '1px solid var(--border)', marginBottom: '24px' }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {[
              { key: 'product', label: '🔍 Product Analysis' },
              { key: 'opinion', label: '🎭 Opinion Manipulation' },
              { key: 'reputation', label: '🛡️ Reputation Management' },
            ].map(({ key, label }) => (
              <button key={key} onClick={() => setActiveView(key)} style={{
                padding: '12px 20px', background: 'none', border: 'none', cursor: 'pointer',
                fontSize: '0.9rem', fontWeight: 600,
                color: activeView === key ? 'var(--accent-primary)' : 'var(--text-muted)',
                borderBottom: activeView === key ? '2px solid var(--accent-primary)' : '2px solid transparent',
                transition: 'all 0.2s',
              }}>{label}</button>
            ))}
          </div>

          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => generateAuditReportPdf(productData, productUrl)}
            className="btn btn-secondary btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', padding: '6px 14px', marginBottom: '8px' }}
            title="Download full forensic PDF audit report (Product Analysis, Opinion Manipulation, Reputation Management)"
          >
            <Download size={14} /> Download PDF Report
          </motion.button>
        </motion.div>
      )}

      {activeView === 'product' && productData && (
        <ProductDashboard
          data={productData}
          productUrl={productUrl}
          onRequestAnalyst={() => setShowAnalystModal(true)}
        />
      )}
      {activeView === 'opinion' && productData && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}><SystemOpinionManipulation data={productData} /></motion.div>
      )}
      {activeView === 'reputation' && productData && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}><SystemReputationManagement data={productData} /></motion.div>
      )}
    </motion.div>
  );
}
