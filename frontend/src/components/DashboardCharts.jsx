import React from 'react';
import {
  PieChart, Pie, Cell, Tooltip as PieTooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as BarTooltip, ResponsiveContainer
} from 'recharts';

export const DashboardCharts = ({ reputation }) => {
  if (!reputation || !reputation.fake_ratio || !reputation.ratings_distribution) {
    return null;
  }

  const { fake_ratio, ratings_distribution } = reputation;

  // Pie Chart Data
  const pieData = [
    { name: 'Genuine Reviews', value: fake_ratio.genuine },
    { name: 'Fake Reviews', value: fake_ratio.fake },
  ];
  const PIE_COLORS = ['#10b981', '#ef4444']; // Emerald (Genuine), Red (Fake)

  // Bar Chart Data
  const barData = [
    { star: '1 Star', count: ratings_distribution["1"] || 0 },
    { star: '2 Star', count: ratings_distribution["2"] || 0 },
    { star: '3 Star', count: ratings_distribution["3"] || 0 },
    { star: '4 Star', count: ratings_distribution["4"] || 0 },
    { star: '5 Star', count: ratings_distribution["5"] || 0 },
  ];

  const getBarColor = (index) => {
    if (index === 0) return '#ef4444'; // 1 star red
    if (index === 1) return '#f97316'; // 2 star orange
    if (index === 2) return '#eab308'; // 3 star yellow
    if (index === 3) return '#84cc16'; // 4 star light green
    return '#10b981'; // 5 star emerald
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
      
      {/* Target 1: Fake vs Genuine Pie Chart */}
      <div className="card flex flex-col h-full bg-slate-900 border border-white/5 shadow-2xl">
        <h3 className="text-sm font-display text-secondary mb-4 uppercase tracking-wider">Detection Ratio</h3>
        <div style={{ width: '100%', height: 260 }}>
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={pieData}
                innerRadius={65}
                outerRadius={100}
                paddingAngle={4}
                dataKey="value"
                stroke="none"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                ))}
              </Pie>
              <PieTooltip 
                 contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                 itemStyle={{ color: '#fff' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex justify-center gap-6 mt-2 text-sm">
          <div className="flex items-center gap-2">
             <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
             <span className="text-gray-300">Genuine ({fake_ratio.genuine})</span>
          </div>
          <div className="flex items-center gap-2">
             <div className="w-3 h-3 rounded-full bg-red-500"></div>
             <span className="text-gray-300">Fake ({fake_ratio.fake})</span>
          </div>
        </div>
      </div>

      {/* Target 2: Ratings Distribution Bar Chart */}
      <div className="card flex flex-col h-full bg-slate-900 border border-white/5 shadow-2xl">
        <h3 className="text-sm font-display text-secondary mb-4 uppercase tracking-wider">Ratings Distribution</h3>
        <div style={{ width: '100%', height: 260 }}>
          <ResponsiveContainer>
            <BarChart data={barData} margin={{ top: 20, right: 30, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
              <XAxis dataKey="star" stroke="#94a3b8" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <BarTooltip 
                 cursor={{ fill: '#334155', opacity: 0.4 }} 
                 contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} 
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {barData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getBarColor(index)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
}
