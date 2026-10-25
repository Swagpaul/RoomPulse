import React from 'react';
import { Activity, Wifi, Zap, Sparkles } from 'lucide-react';

export default function Navbar({ selectedRoom, setSelectedRoom, isConnected, onTriggerSim }) {
  return (
    <header style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '1rem 2rem',
      background: '#ffffff',
      borderBottom: '1px solid #e2e8f0',
      boxShadow: '0 2px 10px rgba(148, 163, 184, 0.1)',
      position: 'sticky',
      top: 0,
      zIndex: 100
    }}>
      {/* Brand & Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
        <div style={{
          width: '42px',
          height: '42px',
          borderRadius: '14px',
          background: 'linear-gradient(135deg, #e0f2fe, #bae6fd)',
          border: '1px solid #7dd3fc',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(2, 132, 199, 0.15)'
        }}>
          <Activity size={22} color="#0284c7" />
        </div>
        <div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
            RoomPulse <span style={{ fontSize: '0.78rem', color: '#0284c7', background: '#e0f2fe', padding: '0.15rem 0.5rem', borderRadius: '999px', fontWeight: 600 }}>Cloud</span>
          </h1>
          <p style={{ fontSize: '0.75rem', color: '#64748b' }}>
            Privacy-Preserving Occupancy & Anomaly Intelligence
          </p>
        </div>
      </div>

      {/* Right Action Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
        {/* Room Selector Pills */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          background: '#f1f5f9',
          padding: '0.25rem',
          borderRadius: '12px',
          border: '1px solid #e2e8f0'
        }}>
          <button
            onClick={() => setSelectedRoom('room238')}
            style={{
              padding: '0.4rem 0.9rem',
              borderRadius: '9px',
              fontSize: '0.82rem',
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.18s ease',
              background: selectedRoom === 'room238' ? '#ffffff' : 'transparent',
              color: selectedRoom === 'room238' ? '#0369a1' : '#64748b',
              boxShadow: selectedRoom === 'room238' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none'
            }}
          >
            Room 238 (IoT Core)
          </button>
          <button
            onClick={() => setSelectedRoom('room301')}
            style={{
              padding: '0.4rem 0.9rem',
              borderRadius: '9px',
              fontSize: '0.82rem',
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.18s ease',
              background: selectedRoom === 'room301' ? '#ffffff' : 'transparent',
              color: selectedRoom === 'room301' ? '#0369a1' : '#64748b',
              boxShadow: selectedRoom === 'room301' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none'
            }}
          >
            Room 301 (Demo)
          </button>
        </div>

        {/* WebSocket Connection Pill */}
        <div className={`badge ${isConnected ? 'badge-mint' : 'badge-rose'}`}>
          <Wifi size={13} />
          {isConnected ? 'Live WebSockets Connected' : 'Disconnected'}
        </div>

        {/* Trigger Simulation Button */}
        <button className="btn btn-primary" onClick={onTriggerSim}>
          <Zap size={14} />
          Simulate Motion Event
        </button>
      </div>
    </header>
  );
}
