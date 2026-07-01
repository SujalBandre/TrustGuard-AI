import React, { useState, useEffect } from 'react';
import { Shield, CheckCircle, XCircle, AlertCircle, Clock, User, Check, X } from 'lucide-react';

export default function VerificationDashboard({ auth }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const resp = await fetch('http://localhost:8001/api/auth/requests', {
        headers: { 'Authorization': `Bearer ${auth?.token}` }
      });
      if (resp.ok) {
        const data = await resp.json();
        setRequests(data);
      } else {
        const err = await resp.json();
        setError(err.detail || 'Failed to fetch requests');
      }
    } catch (e) {
      setError('Cannot connect to backend.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [auth]);

  const handleAction = async (id, action) => {
    try {
      setMsg('');
      setError('');
      const resp = await fetch(`http://localhost:8001/api/auth/requests/${id}/${action}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${auth?.token}` }
      });
      if (resp.ok) {
        setMsg(`Request ${action}d successfully`);
        fetchRequests(); // refresh list
      } else {
        const err = await resp.json();
        setError(err.detail || `Failed to ${action}`);
      }
    } catch (e) {
      setError(`Cannot connect to backend to ${action}.`);
    }
  };

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <Shield size={28} color="#ef4444" />
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>Account Verification</h2>
      </div>

      <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
        Review and approve or reject new account registrations.
      </p>

      {error && (
        <div style={{
          background: 'var(--red-dim)', border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: '8px', padding: '12px 16px', marginBottom: '24px',
          display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--red)', fontSize: '0.85rem',
        }}>
          <AlertCircle size={18} /> {error}
        </div>
      )}

      {msg && (
        <div style={{
          background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)',
          borderRadius: '8px', padding: '12px 16px', marginBottom: '24px',
          display: 'flex', alignItems: 'center', gap: '8px', color: '#10B981', fontSize: '0.85rem',
        }}>
          <CheckCircle size={18} /> {msg}
        </div>
      )}

      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: '16px', padding: '24px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
      }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            <Clock size={24} style={{ animation: 'spin 2s linear infinite', marginBottom: '12px' }} />
            <div>Loading requests...</div>
          </div>
        ) : requests.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            <CheckCircle size={32} color="#10B981" style={{ marginBottom: '12px', opacity: 0.5 }} />
            <div>No pending account requests.</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '12px', color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>ID</th>
                  <th style={{ padding: '12px', color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Username</th>
                  <th style={{ padding: '12px', color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Display Name</th>
                  <th style={{ padding: '12px', color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Role</th>
                  <th style={{ padding: '12px', color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.map(req => (
                  <tr key={req.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '16px 12px', color: 'var(--text-muted)' }}>#{req.id}</td>
                    <td style={{ padding: '16px 12px', fontWeight: 600 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <User size={14} color="var(--cyan)" /> {req.username}
                      </div>
                    </td>
                    <td style={{ padding: '16px 12px', color: 'var(--text-primary)' }}>{req.display_name}</td>
                    <td style={{ padding: '16px 12px' }}>
                      <span style={{
                        padding: '4px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700,
                        background: req.role === 'admin' ? 'rgba(124,58,237,0.15)' : 'rgba(245,158,11,0.15)',
                        color: req.role === 'admin' ? '#a78bfa' : '#F59E0B'
                      }}>
                        {req.role.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: '16px 12px' }}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => handleAction(req.id, 'approve')}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px',
                            borderRadius: '6px', border: '1px solid rgba(16,185,129,0.3)',
                            background: 'rgba(16,185,129,0.1)', color: '#10B981',
                            cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, transition: 'all 0.2s'
                          }}
                        >
                          <Check size={14} /> Approve
                        </button>
                        <button
                          onClick={() => handleAction(req.id, 'reject')}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px',
                            borderRadius: '6px', border: '1px solid rgba(239,68,68,0.3)',
                            background: 'rgba(239,68,68,0.1)', color: '#ef4444',
                            cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, transition: 'all 0.2s'
                          }}
                        >
                          <X size={14} /> Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
