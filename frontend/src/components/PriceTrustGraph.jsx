import React from 'react';
import { 
  ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';

export const PriceTrustGraph = ({ data }) => {
  if (!data || data.length === 0) return null;

  return (
    <div className="card" style={{ height: 350 }}>
      <h3 className="text-sm font-display text-secondary mb-4">📉 Price vs. Trust Correlation</h3>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          
          {/* XAxis: Date */}
          <XAxis 
            dataKey="date" 
            tick={{ fontSize: 10, fill: 'var(--text-muted)' }} 
            axisLine={false} tickLine={false} 
            tickFormatter={(tick) => tick.split('-')[2]} // Just show day
          />
          
          {/* YAxis 1: Price (Left) */}
          <YAxis 
            yAxisId="left"
            tick={{ fontSize: 11, fill: '#60A5FA' }} // Blue
            axisLine={false} tickLine={false}
            tickFormatter={(v) => `$${v}`}
          />
          
          {/* YAxis 2: Trust Score (Right) */}
          <YAxis 
            yAxisId="right" orientation="right"
            domain={[0, 100]}
            tick={{ fontSize: 11, fill: 'var(--green)' }}
            axisLine={false} tickLine={false}
            tickFormatter={(v) => `${v}%`}
          />
          
          <Tooltip 
            contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, color: '#fff' }}
            formatter={(value, name) => {
              if (name === 'price') return [`$${value}`, 'Price'];
              if (name === 'trust') return [`${value}%`, 'Trust Score'];
              return [value, name];
            }}
          />
          <Legend wrapperStyle={{ fontSize: '12px' }} />
          
          <Line 
            yAxisId="left" 
            type="monotone" 
            dataKey="price" 
            stroke="#60A5FA" 
            strokeWidth={3} 
            dot={false}
            name="Price ($)"
          />
          <Line 
            yAxisId="right" 
            type="monotone" 
            dataKey="trust" 
            stroke="var(--green)" 
            strokeWidth={3} 
            dot={false}
            name="Trust Score (%)"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};
