import React, { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, BarChart, Bar, XAxis, YAxis } from 'recharts';
import { AlertTriangle, Target, Bot, TrendingDown, RefreshCw, User } from 'lucide-react';

export default function SystemOpinionManipulation({ data }) {
  const [activeTab, setActiveTab] = useState('Flagged Reviews');

  if (!data) return <div style={{ padding: '20px', color: 'var(--text-muted)' }}>No data available.</div>;

  const flagged = data.flagged_reviews || [];
  const fakeRatio = data.reputation?.fake_ratio || {};
  const totalAnalyzed = fakeRatio.total_reviews || flagged.length || 0;
  const fakeDetected = fakeRatio.fake || flagged.length || 0;
  const fakePct = totalAnalyzed > 0 ? ((fakeDetected / totalAnalyzed) * 100).toFixed(1) : 0;
  
  const highRiskCount = flagged.filter(r => r.risk_level === 'HIGH').length;
  
  const riskDist = [
    { name: 'HIGH', value: highRiskCount, color: '#EF4444' },
    { name: 'OTHER', value: flagged.length - highRiskCount, color: 'rgba(255,255,255,0.05)' }
  ];

  const topPhrases = data.top_phrases || [
    { word: 'love', count: 65 },
    { word: 'product', count: 48 },
    { word: 'easy', count: 32 },
    { word: 'using', count: 18 }
  ];

  return (
    <div style={{ animation: 'fadeIn 0.4s ease' }}>
      {/* Custom Header Section for Opinion Manipulation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <AlertTriangle size={24} color="#EF4444" />
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Opinion Manipulation</h2>
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            {data.product_name || 'Product'} (Dataset Analysis) - {data.platform || 'Unknown'} - {totalAnalyzed} reviews analyzed
          </div>
        </div>
        <button style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.8rem' }}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div className="card" style={{ padding: '16px', borderTop: '3px solid #00D4FF' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>TOTAL ANALYZED</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fff', margin: '4px 0' }}>{totalAnalyzed}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>All scraped reviews</div>
            </div>
            <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(0,212,255,0.1)', color: '#00D4FF' }}>
              <Target size={20} />
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '16px', borderTop: '3px solid #EF4444' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>FAKE DETECTED</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fff', margin: '4px 0' }}>{fakeDetected}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{fakePct}% of total</div>
            </div>
            <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(239,68,68,0.1)', color: '#EF4444' }}>
              <AlertTriangle size={20} />
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '16px', borderTop: '3px solid #F59E0B' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>BOT REVIEWS</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fff', margin: '4px 0' }}>{fakeDetected}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Same-author abuse</div>
            </div>
            <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(245,158,11,0.1)', color: '#F59E0B' }}>
              <Bot size={20} />
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '16px', borderTop: '3px solid #7C3AED' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>HIGH RISK</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fff', margin: '4px 0' }}>{highRiskCount}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Requires immediate action</div>
            </div>
            <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(124,58,237,0.1)', color: '#7C3AED' }}>
              <TrendingDown size={20} />
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px', marginBottom: '24px' }}>
        <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <h3 style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', alignSelf: 'flex-start', textTransform: 'uppercase', letterSpacing: '0.05em' }}>RISK DISTRIBUTION</h3>
          <div style={{ position: 'relative', width: '160px', height: '160px', marginTop: '16px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={riskDist}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  dataKey="value"
                  stroke="none"
                >
                  {riskDist.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '12px' }}>
            <div style={{ width: 12, height: 12, background: '#EF4444', borderRadius: '2px' }} />
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>HIGH</span>
          </div>
        </div>

        <div className="card" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px' }}>TOP SUSPICIOUS PHRASES</h3>
          <div style={{ height: '220px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topPhrases} layout="vertical" margin={{ left: 20 }}>
                <XAxis type="number" hide />
                <YAxis dataKey="word" type="category" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                <RechartsTooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ background: '#1A1D24', border: '1px solid #333', borderRadius: '8px', color: '#fff' }} />
                <Bar dataKey="count" fill="#EF4444" radius={[0, 4, 4, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '20px', borderBottom: '1px solid var(--border)', marginBottom: '24px' }}>
        {[
          { id: 'Flagged Reviews', label: `Flagged Reviews (${flagged.length})`, icon: '🚩' },
          { id: 'Phrase Analysis', label: 'Phrase Analysis', icon: '🔑' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '10px 4px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: 700,
              color: activeTab === tab.id ? '#EF4444' : 'var(--text-muted)',
              borderBottom: activeTab === tab.id ? '2px solid #EF4444' : '2px solid transparent',
              transition: 'all 0.2s',
            }}
          >
            <span style={{ marginRight: '6px' }}>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'Flagged Reviews' && (
        <div className="card" style={{ padding: '0' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#EF4444', fontSize: '0.85rem', fontWeight: 700 }}>
              🚩 Flagged Reviews ({flagged.length})
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Page 1 of {Math.max(1, Math.ceil(flagged.length / 10))}</div>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', maxHeight: '500px', overflowY: 'auto' }}>
            {flagged.length > 0 ? flagged.map((rev, i) => {
              const probPct = Math.round((rev.manipulation_probability || 0.8) * 100);
              return (
                <div key={i} style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                  {/* Probability Box */}
                  <div style={{ 
                    minWidth: '60px', 
                    padding: '8px', 
                    borderRadius: '8px', 
                    border: '1px solid #EF4444', 
                    background: 'rgba(239,68,68,0.1)', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <span style={{ color: '#EF4444', fontWeight: 800, fontSize: '0.9rem' }}>{probPct}%</span>
                    <span style={{ color: '#EF4444', fontSize: '0.55rem', fontWeight: 700, letterSpacing: '0.05em' }}>FAKE</span>
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', flexWrap: 'wrap' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#00D4FF', fontSize: '0.8rem', fontWeight: 600 }}>
                        <User size={14} /> {rev.author || 'Anonymous'}
                      </span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                        🕒 {rev.ts ? new Date(rev.ts).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'Unknown date'}
                      </span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                        🛒 {data.platform || 'Amazon'} {rev.page ? `p.${rev.page}` : ''}
                      </span>
                      <span style={{ 
                        padding: '2px 8px', 
                        borderRadius: '100px', 
                        background: rev.risk_level === 'HIGH' ? '#EF4444' : '#F59E0B', 
                        color: '#fff', 
                        fontSize: '0.65rem', 
                        fontWeight: 700 
                      }}>
                        {rev.risk_level || 'HIGH'}
                      </span>
                    </div>
                    
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', fontStyle: 'italic', lineHeight: 1.5 }}>
                      "{rev.text}"
                    </p>
                    
                    {rev.tags && rev.tags.length > 0 && (
                      <div style={{ display: 'flex', gap: '6px', marginTop: '10px', flexWrap: 'wrap' }}>
                        {rev.tags.map((tag, j) => (
                          <span key={j} style={{ fontSize: '0.65rem', padding: '2px 8px', borderRadius: '100px', background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            }) : (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>No flagged reviews available.</div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'Phrase Analysis' && (
        <div className="card" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '16px', color: '#00D4FF' }}>🔑 Phrase Analysis Breakdown</h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
            Analysis of the most common suspicious phrases found in the dataset, often indicating bot activity, review farms, or coordinated opinion manipulation campaigns.
          </p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {topPhrases && topPhrases.length > 0 ? topPhrases.map((phrase, i) => (
              <div key={i} style={{ 
                padding: '16px', 
                background: 'var(--bg-input)', 
                borderRadius: '8px', 
                borderLeft: '3px solid #EF4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff', marginBottom: '4px' }}>"{phrase.word}"</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Detected <strong style={{color: '#EF4444'}}>{phrase.count}</strong> times in suspicious patterns</div>
                </div>
                <div style={{ width: '40%', height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ 
                    width: `${Math.min(100, (phrase.count / (topPhrases[0]?.count || 1)) * 100)}%`, 
                    height: '100%', 
                    background: '#EF4444' 
                  }} />
                </div>
              </div>
            )) : (
              <div style={{ color: 'var(--text-muted)', fontStyle: 'italic', padding: '20px', textAlign: 'center' }}>No phrase data available.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
