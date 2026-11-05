import React, { useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import { Award, Shield, ThumbsUp, ThumbsDown, TrendingUp, RefreshCw, Star } from 'lucide-react';

export default function SystemReputationManagement({ data }) {
  const [activeTab, setActiveTab] = useState('Overview');

  if (!data) return <div style={{ padding: '20px', color: 'var(--text-muted)' }}>No data available.</div>;

  const fakeRatio = data.reputation?.fake_ratio || {};
  const sentiment = data.reputation?.sentiment_distribution || {};
  const ratings = data.reputation?.ratings_distribution || {};
  
  const totalReviews = fakeRatio.total_reviews || 1;
  const genuinePct = Math.round(((fakeRatio.genuine || 0) / totalReviews) * 100);
  const fakePct = Math.round(((fakeRatio.fake || 0) / totalReviews) * 100);
  
  const reputationScore = data.trust_score || 0;
  const scoreLabel = reputationScore >= 70 ? 'GOOD' : reputationScore >= 40 ? 'MODERATE' : 'POOR';
  const scoreColor = reputationScore >= 70 ? '#10B981' : reputationScore >= 40 ? '#F59E0B' : '#EF4444';

  const pieData = [
    { name: 'Reputation', value: reputationScore },
    { name: 'Remaining', value: 100 - reputationScore }
  ];

  const sentimentBars = [
    { name: 'Positive', value: sentiment.positive || 0, fill: '#10B981' },
    { name: 'Neutral', value: sentiment.neutral || 0, fill: '#F59E0B' },
    { name: 'Negative', value: sentiment.negative || 0, fill: '#EF4444' },
  ];

  const ratingBars = [5,4,3,2,1].map(s => ({ name: `${s}★`, value: ratings[String(s)] || 0 }));

  return (
    <div style={{ animation: 'fadeIn 0.4s ease' }}>
      {/* Custom Header Section for Reputation Management */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <Award size={24} color="#10B981" />
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Reputation Management</h2>
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Platform: {data.platform || 'Unknown'} - {totalReviews} reviews - Brand health monitoring
          </div>
        </div>
        <button style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.8rem' }}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div className="card" style={{ padding: '16px', borderTop: `3px solid ${scoreColor}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>REPUTATION SCORE</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fff', margin: '4px 0' }}>{reputationScore}</div>
              <div style={{ fontSize: '0.75rem', color: scoreColor, fontWeight: 600 }}>{scoreLabel}</div>
            </div>
            <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(16,185,129,0.1)', color: '#10B981' }}>
              <TrendingUp size={20} />
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '16px', borderTop: '3px solid var(--accent-primary)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>GENUINE REVIEWS</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fff', margin: '4px 0', fontFamily: 'var(--font-mono)' }}>{fakeRatio.genuine || 0}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{genuinePct}% authentic</div>
            </div>
            <div style={{ padding: '8px', borderRadius: '8px', background: 'var(--accent-dim)', color: 'var(--accent-primary)' }}>
              <Star size={20} />
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '16px', borderTop: '3px solid #7C3AED' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>POSITIVE SENTIMENT</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fff', margin: '4px 0' }}>{sentiment.positive || 0}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>of genuine reviews</div>
            </div>
            <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(124,58,237,0.1)', color: '#7C3AED' }}>
              <ThumbsUp size={20} />
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '16px', borderTop: '3px solid #EF4444' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>FAKE DETECTED</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fff', margin: '4px 0' }}>{fakeRatio.fake || 0}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{fakePct}% contamination</div>
            </div>
            <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(239,68,68,0.1)', color: '#EF4444' }}>
              <ThumbsDown size={20} />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '20px', borderBottom: '1px solid var(--border)', marginBottom: '24px' }}>
        {['Overview', 'Trust Trend', 'Sentiment', 'Review Summary'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '10px 4px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: 700,
              color: activeTab === tab ? '#10B981' : 'var(--text-muted)',
              borderBottom: activeTab === tab ? '2px solid #10B981' : '2px solid transparent',
              transition: 'all 0.2s',
            }}
          >
            {tab === 'Overview' && <span style={{ marginRight: '6px' }}>📊</span>}
            {tab === 'Trust Trend' && <span style={{ marginRight: '6px' }}>📈</span>}
            {tab === 'Sentiment' && <span style={{ marginRight: '6px' }}>💬</span>}
            {tab === 'Review Summary' && <span style={{ marginRight: '6px' }}>📄</span>}
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'Overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px' }}>
          {/* Brand Health Chart */}
          <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <h3 style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', alignSelf: 'flex-start', textTransform: 'uppercase', letterSpacing: '0.05em' }}>BRAND HEALTH</h3>
            <div style={{ position: 'relative', width: '160px', height: '160px', marginTop: '16px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={75}
                    startAngle={225}
                    endAngle={-45}
                    dataKey="value"
                    stroke="none"
                  >
                    <Cell fill={scoreColor} />
                    <Cell fill="rgba(255,255,255,0.05)" />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '2.5rem', fontWeight: 800, color: scoreColor, lineHeight: 1 }}>{reputationScore}</span>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '4px' }}>REPUTATION</span>
              </div>
            </div>
            <div style={{ marginTop: '16px', padding: '4px 16px', borderRadius: '100px', border: `1px solid ${scoreColor}`, color: scoreColor, fontSize: '0.75rem', fontWeight: 700 }}>
              {scoreLabel}
            </div>
          </div>

          {/* Review Authenticity Bars */}
          <div className="card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '32px' }}>REVIEW AUTHENTICITY</h3>
            
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.85rem' }}>
                <span style={{ color: '#10B981', fontWeight: 600 }}>Genuine</span>
                <span style={{ color: 'var(--text-muted)' }}>{fakeRatio.genuine || 0} ({genuinePct}%)</span>
              </div>
              <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{ width: `${genuinePct}%`, height: '100%', background: '#10B981' }} />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.85rem' }}>
                <span style={{ color: '#EF4444', fontWeight: 600 }}>Fake</span>
                <span style={{ color: 'var(--text-muted)' }}>{fakeRatio.fake || 0} ({fakePct}%)</span>
              </div>
              <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{ width: `${fakePct}%`, height: '100%', background: '#EF4444' }} />
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'Trust Trend' && (
        <div className="card" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '16px' }}>Trust Score Trend</h3>
          <div style={{ height: 280 }}>
            {data.rep_data?.trust_trend && data.rep_data.trust_trend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.rep_data.trust_trend}>
                  <defs>
                    <linearGradient id="colorTrust" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="month" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} />
                  <RechartsTooltip contentStyle={{ background: '#1A1D24', border: '1px solid #333', borderRadius: '8px', color: '#fff' }} />
                  <Area type="monotone" dataKey="trust_score" stroke="#10B981" strokeWidth={3} fillOpacity={1} fill="url(#colorTrust)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                Trend data not available for this product.
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'Sentiment' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div className="card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '16px' }}>Sentiment Distribution</h3>
            <div style={{ height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sentimentBars} barSize={40}>
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                  <RechartsTooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', fontSize: '0.8rem' }} />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {sentimentBars.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '16px' }}>Rating Distribution</h3>
            <div style={{ height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ratingBars} layout="vertical" margin={{ left: 10 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                  <RechartsTooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', fontSize: '0.8rem' }} />
                  <Bar dataKey="value" fill="var(--accent-primary)" radius={[0, 6, 6, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'Review Summary' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div className="card">
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '16px', color: '#10B981' }}>Top Pros</h3>
            {data.reputation?.pros_and_cons?.pros && data.reputation.pros_and_cons.pros.length > 0 ? (
              <ul style={{ listStyleType: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {data.reputation.pros_and_cons.pros.map((pro, i) => (
                  <li key={i} style={{ padding: '10px 14px', background: 'rgba(16,185,129,0.05)', borderRadius: '8px', borderLeft: '3px solid #10B981', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    {pro}
                  </li>
                ))}
              </ul>
            ) : (
              <div style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.85rem' }}>No pros data available.</div>
            )}
          </div>
          <div className="card">
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '16px', color: '#EF4444' }}>Top Cons</h3>
            {data.reputation?.pros_and_cons?.cons && data.reputation.pros_and_cons.cons.length > 0 ? (
              <ul style={{ listStyleType: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {data.reputation.pros_and_cons.cons.map((con, i) => (
                  <li key={i} style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.05)', borderRadius: '8px', borderLeft: '3px solid #EF4444', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    {con}
                  </li>
                ))}
              </ul>
            ) : (
              <div style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.85rem' }}>No cons data available.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
