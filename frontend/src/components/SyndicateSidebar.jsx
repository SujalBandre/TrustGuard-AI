import React from 'react';

const SyndicateSidebar = ({ syndicates = [] }) => {
  return (
    <div className="w-80 h-full border-l border-white/10 bg-black/20 backdrop-blur-xl p-6 flex flex-col">
      <div className="flex items-center gap-2 mb-6">
        <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_10px_red] animate-pulse" />
        <h3 className="text-sm font-bold text-gray-300 uppercase tracking-widest">Active Syndicates</h3>
      </div>

      <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar">
        {syndicates.map((user, index) => (
          <div 
            key={index} 
            className="p-4 rounded-xl bg-white/5 border border-white/5 hover:border-red-500/50 transition-all cursor-pointer group"
          >
            <div className="flex justify-between items-start mb-2">
              <span className="font-mono text-xs text-red-400">ID: {user.id.substring(0, 10)}...</span>
              <span className="text-[10px] bg-red-500/20 text-red-500 px-2 py-0.5 rounded uppercase font-black tracking-tighter">
                {user.threatLevel}
              </span>
            </div>
            
            <p className="text-xs text-gray-400 mb-3">
              Linked to <span className="text-white font-bold">{user.productCount}</span> suspicious bursts.
            </p>

            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-red-600" 
                  style={{ width: `${user.influenceScore}%` }}
                />
              </div>
              <span className="text-[10px] text-gray-500 font-mono">{user.influenceScore}% INF</span>
            </div>
          </div>
        ))}
        {syndicates.length === 0 && (
          <div className="text-sm text-gray-500 p-4 font-mono">No active syndicates detected in this shard.</div>
        )}
      </div>

      <button className="mt-auto w-full py-3 bg-red-600/10 text-red-500 border border-red-500/20 rounded-xl font-bold text-xs hover:bg-red-600 hover:text-white transition-all">
        EXPORT BLACKLIST (CSV)
      </button>
    </div>
  );
};

export default SyndicateSidebar;
