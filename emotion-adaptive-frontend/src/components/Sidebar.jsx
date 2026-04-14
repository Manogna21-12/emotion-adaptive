import React from 'react';

const Sidebar = ({ emotion, isConnected }) => {
  const getEmotionColor = () => {
    switch (emotion) {
      case 'happy': return '#10b981';
      case 'sad': return '#3b82f6';
      case 'confused': return '#f59e0b';
      case 'angry': return '#ef4444';
      default: return '#64748b';
    }
  };

  return (
    <div style={{ width: '250px', backgroundColor: '#1e293b', color: 'white', padding: '24px', display: 'flex', flexDirection: 'column' }}>
      <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '40px' }}>E-Learn AI</h2>
      
      <div style={{ marginBottom: 'auto' }}>
        <div style={{ padding: '12px', background: 'rgba(255,255,255,0.1)', borderRadius: '8px', marginBottom: '24px' }}>
          <p style={{ fontSize: '14px', color: '#cbd5e1', marginBottom: '8px' }}>Current State</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: getEmotionColor() }} />
            <span style={{ fontWeight: 'bold', textTransform: 'capitalize' }}>{emotion || 'Neutral'}</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: isConnected ? '#10b981' : '#ef4444' }}>
         <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'currentColor' }} />
         {isConnected ? 'Live Sync Active' : 'Disconnected'}
      </div>
    </div>
  );
};

export default Sidebar;
