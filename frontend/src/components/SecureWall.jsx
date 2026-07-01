import React from 'react';
import { ShieldAlert } from 'lucide-react';

export const SecureWall = ({ isVisible, url, onDismiss }) => {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-xl" style={{ backgroundColor: 'rgba(50, 0, 0, 0.8)' }}>
      <div 
        className="max-w-md p-8 text-center bg-black border-2 rounded-2xl"
        style={{ 
          borderColor: 'var(--red)', 
          boxShadow: '0 0 60px rgba(239, 68, 68, 0.4)' 
        }}
      >
        <div className="flex justify-center mb-4">
          <ShieldAlert size={64} className="text-red-500 animate-pulse" color="var(--red)" />
        </div>
        
        <h2 className="mb-2 text-2xl uppercase tracking-tighter" style={{ color: 'var(--red)', fontFamily: 'var(--font-display)', fontWeight: 800 }}>
          Security Threat Detected
        </h2>
        
        <p className="mb-6 text-sm text-secondary">
          The link <br/>
          <span className="font-mono mt-1 mb-2 inline-block px-2 py-1 rounded" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--red)' }}>
            {url}
          </span>
          <br/>
          has been flagged as malicious, typosquatting, or a phishing attempt.
        </p>
        
        <button 
          onClick={onDismiss}
          className="btn"
          style={{ width: '100%', backgroundColor: 'var(--red)', color: '#000', fontWeight: 'bold' }}
        >
          Return to Safety
        </button>
      </div>
    </div>
  );
};
