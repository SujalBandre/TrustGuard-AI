import React from 'react';

export const ReputationSummary = ({ reputation }) => {
  if (!reputation) return null;
  const { pros_and_cons, sentiment_distribution: dist } = reputation;

  const totalSent = (dist.positive + dist.neutral + dist.negative) || 1; // avoid /0
  const pPct = (dist.positive / totalSent) * 100;
  const nPct = (dist.neutral / totalSent) * 100;
  const negPct = (dist.negative / totalSent) * 100;

  return (
    <div className="card mt-6">
      <h3 className="text-sm font-display text-secondary mb-4">🏆 Reputation & Opinion Management</h3>
      
      <div className="mb-6">
         <div className="flex justify-between text-xs text-gray-400 mb-1 font-bold tracking-widest">
            <span>POSITIVE ({Math.round(pPct)}%)</span>
            <span>NEUTRAL ({Math.round(nPct)}%)</span>
            <span>NEGATIVE ({Math.round(negPct)}%)</span>
         </div>
         <div className="w-full h-3 rounded-full flex overflow-hidden border border-white/10">
            <div style={{ width: `${pPct}%` }} className="h-full bg-emerald-500/80" />
            <div style={{ width: `${nPct}%` }} className="h-full bg-gray-500/50" />
            <div style={{ width: `${negPct}%` }} className="h-full bg-red-500/80" />
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         {/* Pros */}
         <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
            <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-3">Verified Pros</h4>
            <ul className="space-y-2">
               {pros_and_cons.pros.length > 0 ? pros_and_cons.pros.map((p, i) => (
                 <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                    <span className="text-emerald-500 mt-0.5">✓</span>
                    <span className="italic">{p}</span>
                 </li>
               )) : <li className="text-xs text-gray-500">No strong positive features cleanly extracted.</li>}
            </ul>
         </div>

         {/* Cons */}
         <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/20">
            <h4 className="text-xs font-bold text-red-500 uppercase tracking-widest mb-3">Verified Cons</h4>
            <ul className="space-y-2">
               {pros_and_cons.cons.length > 0 ? pros_and_cons.cons.map((c, i) => (
                 <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                    <span className="text-red-500 mt-0.5">✕</span>
                    <span className="italic">{c}</span>
                 </li>
               )) : <li className="text-xs text-gray-500">No strong negative features cleanly extracted.</li>}
            </ul>
         </div>
      </div>
    </div>
  );
};
