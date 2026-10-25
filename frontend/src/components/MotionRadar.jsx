import React, { useState, useEffect } from 'react';
import { ShieldCheck, Clock, Radio } from 'lucide-react';

export default function MotionRadar({ latestEvent, selectedRoom }) {
  const [elapsedSec, setElapsedSec] = useState(0);

  const isDetected = latestEvent && 
    latestEvent.room_id === selectedRoom && 
    latestEvent.event === 'motion_detected';

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSec(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (latestEvent) {
      setElapsedSec(0);
    }
  }, [latestEvent]);

  const lastEventTime = latestEvent ? new Date(latestEvent.timestamp).toLocaleTimeString() : 'N/A';

  return (
    <div className="pastel-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Radio size={18} color="#0284c7" />
          Live PIR Sensor Status
        </h3>
        <span className={`badge ${isDetected ? 'badge-amber' : 'badge-mint'}`}>
          {isDetected ? 'MOTION DETECTED' : 'ROOM CLEAR'}
        </span>
      </div>

      {/* Graphic Animated Pastel Radar Container */}
      <div style={{
        position: 'relative',
        height: '190px',
        background: isDetected ? 'radial-gradient(circle, #fffbeb 0%, #fef3c7 100%)' : 'radial-gradient(circle, #f0fdf4 0%, #d1fae5 100%)',
        borderRadius: '16px',
        border: isDetected ? '1px solid #fde68a' : '1px solid #a7f3d0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        transition: 'background 0.3s ease, border-color 0.3s ease'
      }}>
        {/* Animated Radar SVG */}
        <svg width="160" height="160" viewBox="0 0 160 160" style={{ position: 'absolute' }}>
          {/* Concentric circles */}
          <circle cx="80" cy="80" r="70" stroke={isDetected ? "rgba(245, 158, 11, 0.25)" : "rgba(16, 185, 129, 0.25)"} strokeWidth="1.5" fill="none" />
          <circle cx="80" cy="80" r="48" stroke={isDetected ? "rgba(245, 158, 11, 0.35)" : "rgba(16, 185, 129, 0.35)"} strokeWidth="1.5" fill="none" />
          <circle cx="80" cy="80" r="26" stroke={isDetected ? "rgba(245, 158, 11, 0.45)" : "rgba(16, 185, 129, 0.45)"} strokeWidth="1.5" fill="none" />
          
          {/* Axis Crosshairs */}
          <line x1="80" y1="10" x2="80" y2="150" stroke={isDetected ? "rgba(245, 158, 11, 0.2)" : "rgba(16, 185, 129, 0.2)"} strokeWidth="1" />
          <line x1="10" y1="80" x2="150" y2="80" stroke={isDetected ? "rgba(245, 158, 11, 0.2)" : "rgba(16, 185, 129, 0.2)"} strokeWidth="1" />

          {/* Sweeping Radar Beam */}
          <g className="animated-sweep">
            <line x1="80" y1="80" x2="150" y2="80" stroke={isDetected ? "#f59e0b" : "#10b981"} strokeWidth="2.5" strokeLinecap="round" opacity="0.8" />
          </g>

          {/* Animated Center Ripple Dot */}
          <circle
            cx="80"
            cy="80"
            fill={isDetected ? "#f59e0b" : "#10b981"}
            className={isDetected ? "animated-pulse-ring" : ""}
          />
          <circle cx="80" cy="80" r="8" fill={isDetected ? "#d97706" : "#059669"} />
        </svg>

        {/* Text Status Label */}
        <div style={{ zIndex: 2, textAlign: 'center', pointerEvents: 'none' }}>
          <div style={{
            fontSize: '1.35rem',
            fontWeight: 700,
            color: isDetected ? '#b45309' : '#047857',
            letterSpacing: '-0.01em'
          }}>
            {isDetected ? 'MOTION DETECTED' : 'ROOM OCCUPANCY CLEAR'}
          </div>
          <div style={{ fontSize: '0.78rem', color: isDetected ? '#d97706' : '#059669', marginTop: '0.15rem', fontWeight: 500 }}>
            SR501 PIR Sensor &bull; ESP32 Live
          </div>
        </div>
      </div>

      {/* Pastel Meta Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '0.75rem',
        fontSize: '0.78rem'
      }}>
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '0.6rem 0.8rem', borderRadius: '12px' }}>
          <div style={{ color: '#64748b', fontSize: '0.72rem', fontWeight: 500 }}>Last Sensor Signal</div>
          <div style={{ fontWeight: 700, color: '#0f172a', fontFamily: 'var(--font-mono)', marginTop: '0.1rem' }}>
            {lastEventTime}
          </div>
        </div>
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '0.6rem 0.8rem', borderRadius: '12px' }}>
          <div style={{ color: '#64748b', fontSize: '0.72rem', fontWeight: 500 }}>Time Elapsed</div>
          <div style={{ fontWeight: 700, color: '#0284c7', fontFamily: 'var(--font-mono)', marginTop: '0.1rem' }}>
            {elapsedSec}s ago
          </div>
        </div>
      </div>
    </div>
  );
}
