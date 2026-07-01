import React, { useState, useEffect } from 'react';
import { BarChart2, FileText, CheckCircle, Clock, Send, RefreshCw, AlertTriangle, UploadCloud } from 'lucide-react';
import axios from 'axios';

function StatusBadge({ status }) {
  const cfg = {
    pending:   { color: '#F59E0B', bg: 'rgba(245,158,11,0.1)',  label: '⏳ Pending' },
    completed: { color: '#10B981', bg: 'rgba(16,185,129,0.1)',  label: '✅ Completed' },
  };
  const c = cfg[status] || cfg.pending;
  return (
    <span style={{ padding: '3px 10px', borderRadius: '100px', fontSize: '0.68rem', fontWeight: 700, background: c.bg, color: c.color, border: `1px solid ${c.color}44` }}>
      {c.label}
    </span>
  );
}

export default function AnalystPanel() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [tab, setTab]           = useState('inbox');
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(null);

  // For report submission
  const [selectedReq, setSelectedReq] = useState(null);
  const [reportContent, setReportContent] = useState('');
  const [analystName, setAnalystName]   = useState('');

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await axios.get('http://localhost:8001/api/analyst/pending-requests');
      setRequests(res.data.all || []);
    } catch {
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRequests(); }, []);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      setReportContent(evt.target.result);
    };
    reader.readAsText(file);
    // Reset input so the same file can be uploaded again if needed
    e.target.value = null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedReq || !reportContent.trim()) return;
    setSubmitting(true);
    try {
      await axios.post('http://localhost:8001/api/analyst/submit-report', {
        request_id:     selectedReq.id,
        product_url:    selectedReq.product_url,
        product_name:   selectedReq.product_name,
        analyst_name:   analystName || 'Data Analyst',
        report_content: reportContent.trim(),
      });
      setSubmitSuccess(`Report submitted for "${selectedReq.product_name}". Admin has been notified.`);
      setSelectedReq(null);
      setReportContent('');
      fetchRequests();
      setTimeout(() => setSubmitSuccess(null), 4000);
    } catch (err) {
      alert(err?.response?.data?.detail || 'Submission failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const pending   = requests.filter(r => r.status === 'pending');
  const completed = requests.filter(r => r.status === 'completed');

  return (
    <div>
      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>

      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
          <BarChart2 size={28} color="var(--amber)" />
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Data Analyst Panel</h1>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
          View report requests from admin, write detailed product analysis reports, and submit them back.
        </p>
      </div>

      {/* Success banner */}
      {submitSuccess && (
        <div style={{ padding: '12px 16px', borderRadius: '8px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', color: '#10B981', fontSize: '0.83rem', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle size={16} /> {submitSuccess}
        </div>
      )}

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' }}>
        {[
          { label: 'Pending Requests', value: pending.length, color: '#F59E0B', emoji: '⏳' },
          { label: 'Completed', value: completed.length, color: '#10B981', emoji: '✅' },
          { label: 'Total Requests', value: requests.length, color: '#00D4FF', emoji: '📋' },
        ].map(({ label, value, color, emoji }) => (
          <div key={label} style={{ padding: '18px', borderRadius: '12px', background: 'var(--bg-card)', border: '1px solid var(--border)', textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '4px' }}>{emoji}</div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid var(--border)', marginBottom: '20px' }}>
        {[
          { key: 'inbox', label: `📥 Inbox (${pending.length} pending)` },
          { key: 'write', label: '✍️ Write Report' },
          { key: 'history', label: `📂 Completed (${completed.length})` },
        ].map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key)} style={{
            padding: '8px 16px', background: 'none', border: 'none', cursor: 'pointer',
            fontSize: '0.85rem', fontWeight: 700,
            color: tab === key ? 'var(--amber)' : 'var(--text-muted)',
            borderBottom: tab === key ? '2px solid var(--amber)' : '2px solid transparent',
            transition: 'all 0.2s',
          }}>{label}</button>
        ))}
      </div>

      {/* ── Inbox ─────────────────────────────────────────────────────────────── */}
      {tab === 'inbox' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
            <button onClick={fetchRequests} style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <RefreshCw size={12} /> Refresh
            </button>
          </div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>Loading...</div>
          ) : pending.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px' }}>
              <div style={{ fontSize: '3rem', marginBottom: '12px' }}>📬</div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No pending report requests. Check back later.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {pending.map((r, i) => (
                <div key={i} style={{ padding: '16px 18px', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid rgba(245,158,11,0.25)', borderLeft: '4px solid #F59E0B' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px', flexWrap: 'wrap', gap: '6px' }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '0.95rem', marginBottom: '3px' }}>{r.product_name}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                        🔗 <a href={r.product_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--cyan)', textDecoration: 'none' }}>{r.product_url?.slice(0, 60)}...</a>
                      </div>
                    </div>
                    <StatusBadge status={r.status} />
                  </div>

                  <div style={{ padding: '10px 12px', background: 'rgba(245,158,11,0.06)', borderRadius: '8px', borderLeft: '2px solid #F59E0B', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '10px', fontStyle: 'italic' }}>
                    📋 Admin Note: "{r.admin_note}"
                  </div>

                  {r.analysis_summary && Object.keys(r.analysis_summary).length > 0 && (
                    <div style={{ display: 'flex', gap: '16px', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '12px', padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px' }}>
                      <span>Trust Score: <b style={{ color: 'var(--cyan)' }}>{r.analysis_summary.trust_score}%</b></span>
                      <span>Fake: <b style={{ color: '#EF4444' }}>{r.analysis_summary.fake_count}</b></span>
                      <span>Total: <b>{r.analysis_summary.total_reviews}</b></span>
                      <span>Risk: <b style={{ color: r.analysis_summary.risk_level === 'HIGH' ? '#EF4444' : '#F59E0B' }}>{r.analysis_summary.risk_level}</b></span>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => { setSelectedReq(r); setTab('write'); setReportContent(''); }}
                      style={{ padding: '7px 16px', borderRadius: '8px', border: 'none', background: '#F59E0B', color: '#000', fontWeight: 700, cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      ✍️ Write Report
                    </button>
                  </div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                    <Clock size={10} style={{ marginRight: '3px', verticalAlign: 'middle' }} />
                    Requested: {new Date(r.ts).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Write Report ───────────────────────────────────────────────────────── */}
      {tab === 'write' && (
        <form onSubmit={handleSubmit} className="card" style={{ padding: '24px' }}>
          <h3 style={{ fontWeight: 800, fontSize: '1rem', marginBottom: '16px' }}>Write Detailed Report</h3>

          {/* Request selector */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Select Report Request</label>
            <select
              value={selectedReq?.id || ''}
              onChange={e => {
                const req = requests.find(r => r.id === parseInt(e.target.value));
                setSelectedReq(req || null);
              }}
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-input)', color: '#fff', fontSize: '0.83rem', outline: 'none' }}
            >
              <option value="">-- Select a product request --</option>
              {pending.map(r => (
                <option key={r.id} value={r.id}>{r.product_name} (ID #{r.id})</option>
              ))}
            </select>
          </div>

          {selectedReq && (
            <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.25)', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              <div style={{ fontWeight: 700, marginBottom: '4px' }}>{selectedReq.product_name}</div>
              <div style={{ color: 'var(--text-muted)', fontFamily: 'monospace', marginBottom: '4px' }}>🔗 {selectedReq.product_url?.slice(0, 60)}...</div>
              <div style={{ fontStyle: 'italic' }}>Admin note: "{selectedReq.admin_note}"</div>
            </div>
          )}

          <div style={{ marginBottom: '14px' }}>
            <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Your Name</label>
            <input
              type="text" placeholder="Data Analyst Name"
              value={analystName} onChange={e => setAnalystName(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-input)', color: '#fff', fontSize: '0.83rem', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '8px' }}>
              <div>
                <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Detailed Report</label>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  Include: executive summary, review pattern analysis, bot network findings, sentiment analysis, and recommendations.
                </div>
              </div>
              <div>
                <label style={{ cursor: 'pointer', padding: '6px 12px', background: 'rgba(245,158,11,0.1)', color: '#F59E0B', border: '1px solid #F59E0B44', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s' }} className="upload-btn-hover">
                  <UploadCloud size={14} /> Upload Report File
                  <input type="file" accept=".txt,.md,.csv" onChange={handleFileUpload} style={{ display: 'none' }} />
                </label>
              </div>
            </div>
            <textarea
              required rows={18}
              placeholder={`PRODUCT ANALYSIS REPORT
═══════════════════════════════════════

Product: [Product Name]
Platform: [Amazon / Flipkart / Myntra]
Analysis Date: ${new Date().toLocaleDateString()}

EXECUTIVE SUMMARY
────────────────────────────
[Brief overview of findings]

REVIEW PATTERN ANALYSIS
────────────────────────────
• Total Reviews Analyzed: 
• Flagged as Fake/Bot: 
• Fake Percentage: 
• Trust Score: 

KEY FINDINGS
────────────────────────────
1. [Finding 1]
2. [Finding 2]
3. [Finding 3]

BOT / SYNDICATE ACTIVITY
────────────────────────────
[Description of any coordinated or bot-driven review patterns]

SENTIMENT ANALYSIS
────────────────────────────
• Positive: 
• Neutral: 
• Negative: 
• Key topics customers mention:

RECOMMENDATIONS
────────────────────────────
1. [Recommendation 1]
2. [Recommendation 2]

CONCLUSION
────────────────────────────
[Final verdict on product reputation health]`}
              value={reportContent} onChange={e => setReportContent(e.target.value)}
              style={{ width: '100%', padding: '12px 14px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-input)', color: '#fff', fontSize: '0.82rem', outline: 'none', resize: 'vertical', fontFamily: "'Roboto Mono', monospace", lineHeight: 1.6, boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="button" onClick={() => setTab('inbox')} style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
            <button type="submit" disabled={submitting || !selectedReq || !reportContent.trim()} style={{
              flex: 1, padding: '10px', borderRadius: '8px', border: 'none',
              background: submitting ? 'rgba(245,158,11,0.4)' : '#F59E0B', color: '#000',
              cursor: submitting ? 'not-allowed' : 'pointer', fontWeight: 800, fontSize: '0.9rem',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            }}>
              {submitting ? (
                <><div style={{ width: 14, height: 14, border: '2px solid rgba(0,0,0,0.3)', borderTopColor: '#000', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />Submitting...</>
              ) : <><Send size={16} /> Submit Report to Admin</>}
            </button>
          </div>
        </form>
      )}

      {/* ── Completed Reports ─────────────────────────────────────────────────── */}
      {tab === 'history' && (
        <div>
          {completed.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>No completed reports yet.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {completed.map((r, i) => (
                <div key={i} style={{ padding: '12px 16px', background: 'var(--bg-input)', borderRadius: '10px', borderLeft: '3px solid #10B981', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: '2px' }}>{r.product_name}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>📅 {new Date(r.ts).toLocaleString()}</div>
                  </div>
                  <StatusBadge status={r.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
