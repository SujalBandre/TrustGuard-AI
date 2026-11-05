import React, { useState } from 'react';
import { Search, Link, FileText, Globe, Flag, X, Send, CheckCircle, AlertTriangle, Star, TrendingUp } from 'lucide-react';
import FlaggedReviewsTable from '../components/FlaggedReviewsTable';
import SentimentPanel from '../components/SentimentPanel';
import MaliciousURLAlert from '../components/MaliciousURLAlert';
import axios from 'axios';

const ECOMMERCE_PLATFORMS = ['amazon', 'flipkart', 'myntra', 'meesho', 'snapdeal', 'ajio', 'ebay', 'walmart', 'target', 'bestbuy'];

function detectPlatform(url) {
  if (!url) return null;
  const lower = url.toLowerCase();
  return ECOMMERCE_PLATFORMS.find(p => lower.includes(p)) || null;
}

function TrustMeter({ score }) {
  const color = score >= 70 ? '#10B981' : score >= 40 ? '#F59E0B' : '#EF4444';
  const circumference = 2 * Math.PI * 54;
  const offset = circumference - (score / 100) * circumference;
  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width="140" height="140" viewBox="0 0 140 140">
        <circle cx="70" cy="70" r="54" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
        <circle cx="70" cy="70" r="54" fill="none" stroke={color} strokeWidth="10"
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
          transform="rotate(-90 70 70)" style={{ transition: 'stroke-dashoffset 1.2s ease, stroke 0.5s ease' }} />
        <text x="70" y="64" textAnchor="middle" fill={color} fontSize="24" fontWeight="800" fontFamily="Space Grotesk, sans-serif">{score}%</text>
        <text x="70" y="80" textAnchor="middle" fill="var(--text-muted)" fontSize="8" fontFamily="Inter, sans-serif" letterSpacing="1">TRUST SCORE</text>
      </svg>
    </div>
  );
}

function SentimentOverview({ sentiment, proscons }) {
  if (!sentiment) return null;
  const total = (sentiment.positive || 0) + (sentiment.neutral || 0) + (sentiment.negative || 0);
  const bars = [
    { label: 'Positive', value: sentiment.positive || 0, color: '#10B981', emoji: '😊' },
    { label: 'Neutral', value: sentiment.neutral || 0, color: '#F59E0B', emoji: '😐' },
    { label: 'Negative', value: sentiment.negative || 0, color: '#EF4444', emoji: '😞' },
  ];
  const dominant = bars.reduce((a, b) => a.value > b.value ? a : b);

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
        <div>
          <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
            💬 Product Sentiment
          </h3>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            Based on {total} genuine reviews
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: dominant.color }}>{dominant.emoji}</div>
          <div style={{ fontSize: '0.68rem', color: dominant.color, fontWeight: 700 }}>{dominant.label.toUpperCase()}</div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {bars.map(({ label, value, color, emoji }) => {
          const pct = total > 0 ? Math.round((value / total) * 100) : 0;
          return (
            <div key={label}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontSize: '0.78rem', color, fontWeight: 600 }}>{emoji} {label}</span>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{value} ({pct}%)</span>
              </div>
              <div style={{ height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '6px', overflow: 'hidden' }}>
                <div style={{
                  width: `${pct}%`, height: '100%', background: color, borderRadius: '6px',
                  transition: 'width 1s ease',
                }} />
              </div>
            </div>
          );
        })}
      </div>

      {proscons && (
        <div style={{ marginTop: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <div>
            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#10B981', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>👍 What Customers Love</div>
            {(proscons.pros || []).slice(0, 3).map((pro, i) => (
              <div key={i} style={{ padding: '5px 8px', background: 'rgba(16,185,129,0.07)', borderRadius: '5px', borderLeft: '2px solid #10B981', fontSize: '0.73rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>{pro}</div>
            ))}
          </div>
          <div>
            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#EF4444', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>👎 Common Complaints</div>
            {(proscons.cons || []).slice(0, 3).map((con, i) => (
              <div key={i} style={{ padding: '5px 8px', background: 'rgba(239,68,68,0.07)', borderRadius: '5px', borderLeft: '2px solid #EF4444', fontSize: '0.73rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>{con}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function RatingDistribution({ ratings }) {
  if (!ratings) return null;
  const total = Object.values(ratings).reduce((a, b) => a + b, 0);
  return (
    <div className="card">
      <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '14px' }}>
        ⭐ Rating Distribution
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {[5,4,3,2,1].map(star => {
          const count = ratings[String(star)] || 0;
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
          const color = star >= 4 ? '#10B981' : star === 3 ? '#F59E0B' : '#EF4444';
          return (
            <div key={star} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', width: '20px', textAlign: 'right' }}>{star}★</span>
              <div style={{ flex: 1, height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: '4px', transition: 'width 1s ease' }} />
              </div>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', width: '30px' }}>{count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ReportModal({ productUrl, onClose, onSubmit }) {
  const [message, setMessage] = useState('');
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    setSending(true);
    try {
      await axios.post('http://localhost:8001/api/user/report', {
        product_url: productUrl,
        message: message.trim(),
        user_name: userName || 'Anonymous',
        user_email: userEmail || '',
      });
      setSent(true);
      setTimeout(() => { onSubmit(); onClose(); }, 2000);
    } catch (err) {
      alert('Failed to send report. Please try again.');
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
        padding: '28px', maxWidth: '480px', width: '100%', position: 'relative',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
      }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
          <X size={18} />
        </button>

        {sent ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <CheckCircle size={48} color="var(--accent-success)" style={{ marginBottom: '12px' }} />
            <h3 style={{ fontWeight: 800, marginBottom: '8px', color: 'var(--accent-success)' }}>Report Submitted!</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              Your report has been sent to our admin team. Thank you for helping keep reviews trustworthy.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <div style={{ width: 40, height: 40, borderRadius: '10px', background: 'rgba(229,62,62,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Flag size={20} color="var(--accent-danger)" />
              </div>
              <div>
                <h3 style={{ fontWeight: 800, fontSize: '1rem' }}>Report Suspicious Reviews</h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Report sent to TrustGuard admin team</p>
              </div>
            </div>
 
            <div style={{ padding: '8px 12px', borderRadius: '8px', background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.15)', marginBottom: '16px', fontSize: '0.75rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
              🔗 {productUrl?.slice(0, 60)}{productUrl?.length > 60 ? '...' : ''}
            </div>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              <input
                type="text" placeholder="Your name (optional)"
                value={userName} onChange={e => setUserName(e.target.value)}
                style={{ flex: 1, padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-input)', color: '#fff', fontSize: '0.83rem', outline: 'none' }}
              />
              <input
                type="email" placeholder="Email (optional)"
                value={userEmail} onChange={e => setUserEmail(e.target.value)}
                style={{ flex: 1, padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-input)', color: '#fff', fontSize: '0.83rem', outline: 'none' }}
              />
            </div>

            <textarea
              required rows={4}
              placeholder="Describe what you noticed about the suspicious reviews... (e.g. 'All 5-star reviews posted within 2 days', 'Same text copied multiple times', etc.)"
              value={message} onChange={e => setMessage(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-input)', color: '#fff', fontSize: '0.83rem', outline: 'none', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }}
            />

            <button type="submit" disabled={sending || !message.trim()} style={{
              marginTop: '12px', width: '100%', padding: '12px', borderRadius: '10px',
              background: sending ? 'rgba(239,68,68,0.5)' : '#EF4444', border: 'none',
              color: '#fff', fontWeight: 700, cursor: sending ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            }}>
              {sending ? (
                <><div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />Sending...</>
              ) : (
                <><Send size={14} /> Send Report to Admin</>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function TrustBuyAnalyzer() {
  const [mode, setMode]             = useState('URL');
  const [inputVal, setInputVal]     = useState('');
  const [status, setStatus]         = useState('idle');
  const [result, setResult]         = useState(null);
  const [urlAlert, setUrlAlert]     = useState(null);
  const [detectedPlatform, setDetectedPlatform] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);

  const handleScan = async () => {
    if (!inputVal.trim()) return;
    setStatus('scanning');
    setResult(null);
    setUrlAlert(null);

    try {
      const payload = mode === 'URL' ? { url: inputVal } : { raw_text: inputVal };
      const res = await axios.post('http://localhost:8001/api/analyze', payload, { timeout: 120000 });
      const data = res.data;

      if (data.malicious_url_info && data.malicious_url_info.status !== 'SECURE') {
        setUrlAlert(data.malicious_url_info);
      }
      if (data.url_status === 'MALICIOUS') {
        setStatus('danger');
        setResult(data);
        return;
      }
      setStatus('complete');
      setResult(data);
    } catch (err) {
      console.error(err);
      setStatus('idle');
      alert(err?.response?.data?.detail || 'Analysis failed. Backend may be busy — try again.');
    }
  };

  const onUrlChange = (val) => {
    setInputVal(val);
    setDetectedPlatform(detectPlatform(val));
  };

  return (
    <div>
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      {urlAlert && <MaliciousURLAlert urlInfo={urlAlert} url={inputVal} onDismiss={() => setUrlAlert(null)} />}
      {showReportModal && <ReportModal productUrl={inputVal} onClose={() => setShowReportModal(false)} onSubmit={() => {}} />}

      {/* Header */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
            <Search size={28} color="var(--text-primary)" />
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Review Analyzer</h1>
          </div>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
          Paste any e-commerce product URL — get sentiment analysis, fake review detection, and bot identification.
        </p>
      </div>

      <>

          {/* Input Card */}
          <div className="card" style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
              <button
                onClick={() => { setMode('URL'); setInputVal(''); setResult(null); setStatus('idle'); setUrlAlert(null); }}
                style={{
                  padding: '8px 16px', borderRadius: '8px', border: `1px solid ${mode==='URL' ? 'var(--accent-primary)' : 'var(--border)'}`,
                  background: mode==='URL' ? 'var(--accent-dim)' : 'var(--bg-surface-2)', color: mode==='URL' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px',
                }}>
                <Link size={14} /> E-Commerce URL
              </button>
              <button
                onClick={() => { setMode('TEXT'); setInputVal(''); setResult(null); setStatus('idle'); setUrlAlert(null); }}
                style={{
                  padding: '8px 16px', borderRadius: '8px', border: `1px solid ${mode==='TEXT' ? 'var(--accent-primary)' : 'var(--border)'}`,
                  background: mode==='TEXT' ? 'var(--accent-dim)' : 'var(--bg-surface-2)', color: mode==='TEXT' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px',
                }}>
                <FileText size={14} /> Raw Review Text
              </button>
            </div>

            <div style={{ display: 'flex', gap: '10px', flexDirection: 'column' }}>
              {mode === 'URL' ? (
                <div style={{ position: 'relative' }}>
                  <Globe size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', zIndex: 1 }} />
                  <input
                    type="text" className="input-field" style={{ paddingLeft: '36px' }}
                    placeholder="https://amazon.in/dp/B08...  |  https://flipkart.com/product/..."
                    value={inputVal} onChange={e => onUrlChange(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleScan()}
                  />
                  {detectedPlatform && (
                    <span style={{
                      position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                      fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: '100px',
                      background: 'var(--bg-surface-2)', color: 'var(--accent-primary)',
                    }}>✓ {detectedPlatform.toUpperCase()}</span>
                  )}
                </div>
              ) : (
                <textarea
                  className="input-field" rows={4}
                  placeholder="Paste a single review here to check if it's fake or bot-generated..."
                  value={inputVal} onChange={e => setInputVal(e.target.value)}
                />
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button
                  className="btn btn-primary" onClick={handleScan}
                  disabled={status === 'scanning' || !inputVal.trim()}
                  style={{ minWidth: '180px', justifyContent: 'center' }}
                >
                  {status === 'scanning' ? (
                    <>
                      <div style={{ width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#ffffff', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
                      Scanning All Pages...
                    </>
                  ) : '🔍 Scan for Truth'}
                </button>
                {result && mode === 'URL' && (
                  <button
                    onClick={() => setShowReportModal(true)}
                    style={{
                      padding: '10px 16px', borderRadius: '8px', border: '1px solid rgba(229,62,62,0.4)',
                      background: 'rgba(229,62,62,0.08)', color: 'var(--accent-danger)',
                      cursor: 'pointer', fontSize: '0.83rem', fontWeight: 600,
                      display: 'flex', alignItems: 'center', gap: '6px',
                    }}>
                    <Flag size={14} /> Report to Admin
                  </button>
                )}
                {status === 'scanning' && (
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Fetching live data & analyzing... may take 30–90s
                  </span>
                )}
              </div>

              {mode === 'URL' && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', alignSelf: 'center' }}>Supported:</span>
                  {ECOMMERCE_PLATFORMS.map(p => (
                    <span key={p} style={{ padding: '2px 8px', borderRadius: '100px', fontSize: '0.65rem', fontWeight: 600, background: 'var(--bg-surface-2)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>{p}</span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Results */}
          {result && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', animation: 'fadeIn 0.4s ease' }}>

              {/* Malicious block */}
              {result.url_status === 'MALICIOUS' && (
                <div style={{ padding: '24px', borderRadius: '14px', border: '2px solid var(--red)', background: 'rgba(239,68,68,0.1)', textAlign: 'center' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '8px' }}>🚨</div>
                  <h2 style={{ color: 'var(--red)', fontWeight: 800, marginBottom: '8px' }}>Malicious URL Blocked</h2>
                  <p style={{ color: 'var(--text-secondary)' }}>{result.malicious_url_info?.reason}</p>
                  <p style={{ color: 'var(--red)', fontWeight: 600, marginTop: '8px' }}>⚠️ DO NOT VISIT THIS SITE</p>
                </div>
              )}

              {result.url_status !== 'MALICIOUS' && (
                <>
                  {/* Product Info */}
                  {result.product_name && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--bg-card)', borderRadius: '10px', border: '1px solid var(--border)' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '2px' }}>{result.product_name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', gap: '12px', alignItems: 'center' }}>
                          <span>🛒 {result.platform}</span>
                          {result.base_price > 0 && <span>💰 ₹{result.base_price}</span>}
                          {result.pages_scraped > 0 && <span>📄 {result.pages_scraped} pages scraped</span>}
                          {result.data_source && <span style={{ color: 'var(--cyan)', fontSize: '0.68rem', fontWeight: 600 }}>📡 {result.data_source}</span>}
                        </div>
                      </div>
                      {result.url_status && result.url_status !== 'MALICIOUS' && (
                        <span style={{
                          padding: '4px 10px', borderRadius: '100px', fontSize: '0.68rem', fontWeight: 700,
                          background: result.url_status === 'SECURE' ? 'var(--green-dim)' : 'rgba(245,158,11,0.15)',
                          color: result.url_status === 'SECURE' ? 'var(--green)' : 'var(--amber)',
                        }}>
                          {result.url_status === 'SECURE' ? '🔒 SECURE' : '⚠️ SUSPICIOUS'}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Trust Score + Quick Stats */}
                  <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: '16px' }}>
                    <div style={{ padding: '20px', borderRadius: '12px', background: 'var(--bg-card)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                      <TrustMeter score={result.trust_score} />
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                        {result.risk_level === 'HIGH' ? '🔴 HIGH RISK' : result.risk_level === 'MEDIUM' ? '🟡 MEDIUM RISK' : '🟢 LOW RISK'}
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                      {[
                        { label: 'Fake / Bot Reviews', value: result.reputation?.fake_ratio?.fake || 0, color: 'var(--accent-danger)', emoji: '🚩', sub: 'flagged by AI' },
                        { label: 'Genuine Reviews', value: result.reputation?.fake_ratio?.genuine || 0, color: 'var(--accent-success)', emoji: '✅', sub: 'verified authentic' },
                        { label: 'Total Analyzed', value: result.reputation?.fake_ratio?.total_reviews || 0, color: 'var(--accent-primary)', emoji: '📊', sub: 'reviews processed' },
                        { label: 'NLP Risk Score', value: `${Math.round((result.nlp_score || 0) * 100)}%`, color: result.nlp_score > 0.5 ? 'var(--accent-danger)' : 'var(--accent-success)', emoji: '🤖', sub: 'manipulation probability' },
                      ].map(({ label, value, color, emoji, sub }) => (
                        <div key={label} style={{ padding: '14px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-card)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <span style={{ fontSize: '1.2rem' }}>{emoji}</span>
                            <div style={{ fontSize: '1.6rem', fontWeight: 800, color, fontFamily: 'var(--font-mono)' }}>{value}</div>
                          </div>
                          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '2px' }}>{label}</div>
                          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{sub}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Detection Tags */}
                  {result.tags?.length > 0 && (
                    <div className="card">
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>🏷 Detection Signals</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {result.tags.map((t, i) => (
                          <span key={i} style={{ padding: '3px 10px', borderRadius: '100px', fontSize: '0.65rem', fontWeight: 700, background: 'rgba(0,212,255,0.1)', color: 'var(--cyan)', border: '1px solid rgba(0,212,255,0.2)', fontFamily: 'monospace' }}>{t}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Sentiment + Rating in 2-col */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <SentimentOverview
                      sentiment={result.reputation?.sentiment_distribution}
                      proscons={result.reputation?.pros_and_cons}
                    />
                    <RatingDistribution ratings={result.reputation?.ratings_distribution} />
                  </div>

                  {/* Flagged Reviews Table */}
                  <FlaggedReviewsTable flaggedData={result.flagged_reviews || []} />

                  {/* All Reviews List */}
                  {result.all_reviews && result.all_reviews.length > 0 && (
                    <div className="card" style={{ marginTop: '20px' }}>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff', marginBottom: '16px' }}>
                        All Processed Reviews ({result.all_reviews.length})
                      </h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '500px', overflowY: 'auto', paddingRight: '8px' }}>
                        {result.all_reviews.map((r, i) => (
                          <div key={i} style={{
                            padding: '16px', borderRadius: '8px',
                            background: 'rgba(255,255,255,0.02)',
                            borderLeft: r.is_fake ? '3px solid #EF4444' : '3px solid #10B981',
                            borderTop: '1px solid var(--border)',
                            borderRight: '1px solid var(--border)',
                            borderBottom: '1px solid var(--border)',
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontWeight: 700, color: '#fff', fontSize: '0.85rem' }}>{r.author || 'Anonymous User'}</span>
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>• {r.timestamp?.slice(0, 10)}</span>
                              </div>
                              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#F59E0B' }}>★ {r.rating}</span>
                                {r.is_fake ? (
                                  <span style={{ fontSize: '0.65rem', background: 'rgba(239,68,68,0.15)', color: '#EF4444', padding: '2px 8px', borderRadius: '100px', fontWeight: 700 }}>AI Flagged</span>
                                ) : (
                                  <span style={{ fontSize: '0.65rem', background: 'rgba(16,185,129,0.15)', color: '#10B981', padding: '2px 8px', borderRadius: '100px', fontWeight: 700 }}>Genuine</span>
                                )}
                              </div>
                            </div>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.83rem', lineHeight: '1.4' }}>
                              {r.text}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
      </>
    </div>
  );
}
