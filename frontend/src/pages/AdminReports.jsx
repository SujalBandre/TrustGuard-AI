import React, { useState, useEffect } from 'react';
import { Flag, FileText, RefreshCw, CheckCircle, Eye, Clock, User } from 'lucide-react';
import axios from 'axios';

function TabBtn({ active, onClick, children }) {
  return (
    <button onClick={onClick} style={{
      padding: '8px 16px', background: 'none', border: 'none', cursor: 'pointer',
      fontSize: '0.85rem', fontWeight: 700,
      color: active ? 'var(--accent-primary)' : 'var(--text-muted)',
      borderBottom: active ? '2px solid var(--accent-primary)' : '2px solid transparent',
      transition: 'all 0.2s',
    }}>{children}</button>
  );
}

function StatusBadge({ status }) {
  const cfg = {
    pending:   { color: '#F59E0B', bg: 'rgba(245,158,11,0.1)',  label: '⏳ Pending' },
    reviewed:  { color: '#10B981', bg: 'rgba(16,185,129,0.1)',  label: '✅ Reviewed' },
    completed: { color: '#10B981', bg: 'rgba(16,185,129,0.1)',  label: '✅ Completed' },
  };
  const c = cfg[status] || cfg.pending;
  return (
    <span style={{ padding: '3px 10px', borderRadius: '100px', fontSize: '0.68rem', fontWeight: 700, background: c.bg, color: c.color, border: `1px solid ${c.color}44` }}>
      {c.label}
    </span>
  );
}

function UserReportsTab() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  const fetch = async () => {
    setLoading(true);
    try {
      const res = await axios.get('http://localhost:8001/api/admin/user-reports');
      setReports(res.data.reports || []);
    } catch {
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  const markReviewed = async (id) => {
    try {
      await axios.post(`http://localhost:8001/api/admin/user-reports/${id}/review`);
      fetch();
    } catch {}
  };

  useEffect(() => { fetch(); }, []);

  if (loading) return <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>Loading reports...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{reports.length} total · {reports.filter(r => r.status === 'pending').length} pending review</div>
        <button onClick={fetch} style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--accent-primary)', background: 'transparent', color: 'var(--accent-primary)', cursor: 'pointer', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      {reports.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          No user reports yet. Users can report suspicious products from their analysis panel.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {reports.map((r, i) => (
            <div key={i} style={{ padding: '14px 16px', background: 'var(--bg-surface-2)', borderRadius: '10px', borderLeft: `3px solid ${r.status === 'pending' ? 'var(--accent-warning)' : 'var(--accent-success)'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                    <User size={14} color="var(--text-muted)" />
                    <span style={{ fontWeight: 700, fontSize: '0.875rem' }}>{r.user_name || 'Anonymous'}</span>
                    {r.user_email && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{r.user_email}</span>}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    🔗 {r.product_url?.slice(0, 60)}{r.product_url?.length > 60 ? '...' : ''}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <StatusBadge status={r.status} />
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                    <Clock size={10} style={{ marginRight: '3px', verticalAlign: 'middle' }} />
                    {new Date(r.ts).toLocaleString()}
                  </span>
                </div>
              </div>
 
              <div style={{ padding: '8px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)', fontStyle: 'italic', marginBottom: '10px' }}>
                "{r.message}"
              </div>
 
              {r.status === 'pending' && (
                <button onClick={() => markReviewed(r.id)} style={{ padding: '5px 12px', borderRadius: '6px', border: '1px solid var(--accent-success)', background: 'transparent', color: 'var(--accent-success)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <CheckCircle size={12} /> Mark Reviewed
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AnalystReportsTab() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  const fetch = async () => {
    setLoading(true);
    try {
      const res = await axios.get('http://localhost:8001/api/admin/analyst-reports');
      setReports(res.data.reports || []);
    } catch {
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetch(); }, []);

  if (loading) return <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>Loading reports...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{reports.length} analyst reports received · {reports.filter(r => !r.read_by_admin).length} unread</div>
        <button onClick={fetch} style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--accent-primary)', background: 'transparent', color: 'var(--accent-primary)', cursor: 'pointer', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      {reports.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          No analyst reports yet. Request one from the Product Analysis dashboard.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {reports.map((r, i) => (
            <div key={i} style={{ borderRadius: '12px', border: `1px solid ${!r.read_by_admin ? 'rgba(124,58,237,0.3)' : 'var(--border)'}`, background: !r.read_by_admin ? 'rgba(124,58,237,0.03)' : 'var(--bg-surface-2)', overflow: 'hidden' }}>
              <div style={{ padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', cursor: 'pointer' }} onClick={() => setExpanded(expanded === i ? null : i)}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                    {!r.read_by_admin && <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-primary)', flexShrink: 0 }} />}
                    <span style={{ fontWeight: 700, fontSize: '0.875rem' }}>{r.product_name}</span>
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    Analyst: <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{r.analyst_name}</span> · {new Date(r.ts).toLocaleString()}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {!r.read_by_admin && <span style={{ fontSize: '0.68rem', padding: '2px 8px', borderRadius: '100px', background: 'rgba(124,58,237,0.12)', color: 'var(--accent-primary)', fontWeight: 700 }}>NEW</span>}
                  <Eye size={14} color="var(--text-muted)" />
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{expanded === i ? '▲ Collapse' : '▼ Read Report'}</span>
                </div>
              </div>

              {expanded === i && (
                <div style={{ padding: '16px', borderTop: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'monospace', marginBottom: '12px' }}>
                    🔗 {r.product_url}
                  </div>
                  <div style={{ padding: '14px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.7, whiteSpace: 'pre-wrap', border: '1px solid var(--border)' }}>
                    {r.report_content}
                  </div>
                  <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                    <button onClick={() => {
                      const blob = new Blob([r.report_content], { type: 'text/plain' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url; a.download = `analyst_report_${r.id}.txt`; a.click();
                    }} style={{ padding: '6px 14px', borderRadius: '6px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}>
                      📥 Download Report
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PendingRequestsTab() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetch = async () => {
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

  useEffect(() => { fetch(); }, []);

  if (loading) return <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>Loading...</div>;

  return (
    <div>
      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
        {requests.filter(r => r.status === 'pending').length} pending · {requests.filter(r => r.status === 'completed').length} completed
      </div>
      {requests.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>No report requests from admin yet.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {requests.map((r, i) => (
            <div key={i} style={{ padding: '14px 16px', background: 'var(--bg-surface-2)', borderRadius: '10px', borderLeft: `3px solid ${r.status === 'pending' ? 'var(--accent-warning)' : 'var(--accent-success)'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', flexWrap: 'wrap', gap: '4px' }}>
                <span style={{ fontWeight: 700, fontSize: '0.875rem' }}>{r.product_name}</span>
                <StatusBadge status={r.status} />
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '6px', fontFamily: 'var(--font-mono)' }}>🔗 {r.product_url?.slice(0,60)}...</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontStyle: 'italic', marginBottom: '6px' }}>"{r.admin_note}"</div>
              {r.analysis_summary && Object.keys(r.analysis_summary).length > 0 && (
                <div style={{ display: 'flex', gap: '12px', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  <span>Trust: <b style={{ color: 'var(--accent-primary)' }}>{r.analysis_summary.trust_score}%</b></span>
                  <span>Fake: <b style={{ color: 'var(--accent-danger)' }}>{r.analysis_summary.fake_count}</b></span>
                  <span>Total: <b>{r.analysis_summary.total_reviews}</b></span>
                  <span>Risk: <b style={{ color: r.analysis_summary.risk_level === 'HIGH' ? 'var(--accent-danger)' : 'var(--accent-warning)' }}>{r.analysis_summary.risk_level}</b></span>
                </div>
              )}
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '6px' }}>📅 {new Date(r.ts).toLocaleString()}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminReports() {
  const [tab, setTab] = useState('user-reports');

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
          <FileText size={28} color="var(--text-primary)" />
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Reports & Requests</h1>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
          Manage user-flagged products, analyst report requests, and received analyst reports.
        </p>
      </div>

      <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid var(--border)', marginBottom: '24px' }}>
        <TabBtn active={tab === 'user-reports'} onClick={() => setTab('user-reports')}>🚩 User Reports</TabBtn>
        <TabBtn active={tab === 'analyst-reports'} onClick={() => setTab('analyst-reports')}>📋 Analyst Reports</TabBtn>
        <TabBtn active={tab === 'requests'} onClick={() => setTab('requests')}>📤 Sent Requests</TabBtn>
      </div>

      <div className="card">
        {tab === 'user-reports'    && <UserReportsTab />}
        {tab === 'analyst-reports' && <AnalystReportsTab />}
        {tab === 'requests'        && <PendingRequestsTab />}
      </div>
    </div>
  );
}
