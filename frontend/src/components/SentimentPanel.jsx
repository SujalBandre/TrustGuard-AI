import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

const COLORS = { positive: '#10B981', neutral: '#F59E0B', negative: '#EF4444' };

export default function SentimentPanel({ sentiment }) {
  if (!sentiment) return null;
  const { positive = 0, neutral = 0, negative = 0 } = sentiment;
  const total = positive + neutral + negative || 1;

  const data = [
    { name: 'Positive', value: positive, color: COLORS.positive },
    { name: 'Neutral',  value: neutral,  color: COLORS.neutral  },
    { name: 'Negative', value: negative, color: COLORS.negative  },
  ].filter(d => d.value > 0);

  const dominantSentiment = positive > negative ? 'positive' : negative > positive ? 'negative' : 'neutral';

  return (
    <div className="card">
      <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '16px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
        💬 Sentiment Analysis
      </h3>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', alignItems: 'center' }}>
        {/* Pie Chart */}
        <ResponsiveContainer width="100%" height={160}>
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3} dataKey="value">
              {data.map((entry, i) => <Cell key={i} fill={entry.color} />)}
            </Pie>
            <Tooltip
              contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', fontSize: '0.8rem' }}
              formatter={(v) => [`${v} (${Math.round(v/total*100)}%)`, '']}
            />
          </PieChart>
        </ResponsiveContainer>

        {/* Stats */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {[
            { key: 'positive', label: 'Positive', count: positive, icon: <TrendingUp size={14} />, color: COLORS.positive },
            { key: 'neutral',  label: 'Neutral',  count: neutral,  icon: <Minus size={14} />,     color: COLORS.neutral  },
            { key: 'negative', label: 'Negative', count: negative, icon: <TrendingDown size={14} />, color: COLORS.negative },
          ].map(({ key, label, count, icon, color }) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color }}>
                {icon}
                <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{label}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '60px', height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${Math.round(count/total*100)}%`, height: '100%', background: color, borderRadius: '4px', transition: 'width 0.8s ease' }} />
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', minWidth: '30px', textAlign: 'right' }}>{count}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{
        marginTop: '12px', padding: '8px 12px', borderRadius: '8px', textAlign: 'center',
        background: dominantSentiment === 'positive' ? 'rgba(16,185,129,0.1)' : dominantSentiment === 'negative' ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)',
        fontSize: '0.78rem', fontWeight: 600,
        color: dominantSentiment === 'positive' ? '#10B981' : dominantSentiment === 'negative' ? '#EF4444' : '#F59E0B',
      }}>
        Dominant Sentiment: {dominantSentiment.toUpperCase()} ({Math.round(sentiment[dominantSentiment]/total*100)}%)
      </div>
    </div>
  );
}
