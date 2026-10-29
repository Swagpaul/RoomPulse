import React from 'react';
import { Activity, Wifi, Zap, Cpu } from 'lucide-react';

export default function Navbar({ 
  selectedRoom, 
  setSelectedRoom, 
  isConnected, 
  onTriggerSim,
  rooms = ['room238', 'room301'],
  sensors = [],
  onOpenSensorManager
}) {
  const primarySensor = sensors[0] || null;
  const currentPlacement = primarySensor?.room_id || null;

  return (
    <header style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0.85rem 2rem',
      background: '#ffffff',
      borderBottom: '1px solid #e2e8f0',
      boxShadow: '0 2px 10px rgba(148, 163, 184, 0.1)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      flexWrap: 'wrap',
      gap: '1rem'
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

      {/* Center / Right Action Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        
        {/* Dynamic Room Selector Pills */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          background: '#f1f5f9',
          padding: '0.25rem',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          gap: '0.2rem'
        }}>
          {rooms.map(room => {
            const isSelected = selectedRoom === room;
            const hasSensor = currentPlacement === room;
            const label = room === 'room238' 
              ? 'Room 238' 
              : room === 'room301' 
                ? 'Room 301' 
                : room.toUpperCase();

            return (
              <button
                key={room}
                onClick={() => setSelectedRoom(room)}
                style={{
                  padding: '0.38rem 0.85rem',
                  borderRadius: '9px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.18s ease',
                  background: isSelected ? '#ffffff' : 'transparent',
                  color: isSelected ? '#0369a1' : '#64748b',
                  boxShadow: isSelected ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}
              >
                <span style={{ 
                  width: '7px', 
                  height: '7px', 
                  borderRadius: '50%', 
                  background: hasSensor ? '#10b981' : '#cbd5e1' 
                }} />
                {label}
              </button>
            );
          })}
        </div>

        {/* Physical IoT Device Placement Button */}
        <button
          onClick={onOpenSensorManager}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.55rem',
            padding: '0.45rem 0.95rem',
            borderRadius: '12px',
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            cursor: 'pointer',
            fontSize: '0.82rem',
            fontWeight: 600,
            color: '#0f172a',
            transition: 'all 0.18s ease'
          }}
          title="Click to relocate or de-assign your physical ESP32 sensor device"
        >
          <Cpu size={15} color="#0284c7" />
          <span>Device Location:</span>
          <span style={{
            fontSize: '0.76rem',
            background: currentPlacement ? '#d1fae5' : '#fef3c7',
            color: currentPlacement ? '#047857' : '#b45309',
            padding: '0.12rem 0.55rem',
            borderRadius: '999px',
            fontWeight: 700
          }}>
            {currentPlacement ? `📍 ${currentPlacement}` : '⚠️ Standby'}
          </span>
        </button>

        {/* WebSocket Connection Pill */}
        <div className={`badge ${isConnected ? 'badge-mint' : 'badge-rose'}`}>
          <Wifi size={13} />
          {isConnected ? 'Live WS' : 'Disconnected'}
        </div>

        {/* Trigger Simulation Button */}
        <button className="btn btn-primary" onClick={onTriggerSim} style={{ fontSize: '0.82rem', padding: '0.45rem 0.9rem' }}>
          <Zap size={14} />
          Simulate Pulse
        </button>
      </div>
    </header>
  );
}
