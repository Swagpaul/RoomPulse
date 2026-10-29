import React, { useState, useEffect } from 'react';
import { Radio, Cpu } from 'lucide-react';

export default function MotionRadar({ 
  latestEvent, 
  selectedRoom, 
  assignedSensor, 
  primarySensor,
  onAssignSensor,
  onOpenSensorManager 
}) {
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
    if (latestEvent && latestEvent.room_id === selectedRoom) {
      setElapsedSec(0);
    }
  }, [latestEvent, selectedRoom]);

  const lastEventTime = (latestEvent && latestEvent.room_id === selectedRoom)
    ? new Date(latestEvent.timestamp).toLocaleTimeString() 
    : 'N/A';

  return (
    <div className="pastel-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Radio size={18} color="#0284c7" />
          Live PIR Sensor Status
        </h3>
        <span className={`badge ${!assignedSensor ? 'badge-amber' : (isDetected ? 'badge-amber' : 'badge-mint')}`}>
          {!assignedSensor ? 'SENSOR NOT HERE' : (isDetected ? 'MOTION DETECTED' : 'ROOM CLEAR')}
        </span>
      </div>

      {/* Graphic Animated Pastel Radar Container */}
      <div style={{
        position: 'relative',
        height: '180px',
        background: !assignedSensor 
          ? 'radial-gradient(circle, #f8fafc 0%, #f1f5f9 100%)' 
          : (isDetected ? 'radial-gradient(circle, #fffbeb 0%, #fef3c7 100%)' : 'radial-gradient(circle, #f0fdf4 0%, #d1fae5 100%)'),
        borderRadius: '16px',
        border: !assignedSensor 
          ? '1px solid #e2e8f0' 
          : (isDetected ? '1px solid #fde68a' : '1px solid #a7f3d0'),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        transition: 'background 0.3s ease, border-color 0.3s ease'
      }}>
        {/* Animated Radar SVG */}
        <svg width="150" height="150" viewBox="0 0 160 160" style={{ position: 'absolute' }}>
          <circle cx="80" cy="80" r="70" stroke={!assignedSensor ? "rgba(148, 163, 184, 0.2)" : (isDetected ? "rgba(245, 158, 11, 0.25)" : "rgba(16, 185, 129, 0.25)")} strokeWidth="1.5" fill="none" />
          <circle cx="80" cy="80" r="48" stroke={!assignedSensor ? "rgba(148, 163, 184, 0.25)" : (isDetected ? "rgba(245, 158, 11, 0.35)" : "rgba(16, 185, 129, 0.35)")} strokeWidth="1.5" fill="none" />
          <circle cx="80" cy="80" r="26" stroke={!assignedSensor ? "rgba(148, 163, 184, 0.3)" : (isDetected ? "rgba(245, 158, 11, 0.45)" : "rgba(16, 185, 129, 0.45)")} strokeWidth="1.5" fill="none" />
          
          <line x1="80" y1="10" x2="80" y2="150" stroke={!assignedSensor ? "rgba(148, 163, 184, 0.2)" : (isDetected ? "rgba(245, 158, 11, 0.2)" : "rgba(16, 185, 129, 0.2)")} strokeWidth="1" />
          <line x1="10" y1="80" x2="150" y2="80" stroke={!assignedSensor ? "rgba(148, 163, 184, 0.2)" : (isDetected ? "rgba(245, 158, 11, 0.2)" : "rgba(16, 185, 129, 0.2)")} strokeWidth="1" />

          {/* Sweeping Radar Beam (only if assigned to this room) */}
          {assignedSensor && (
            <g className="animated-sweep">
              <line x1="80" y1="80" x2="150" y2="80" stroke={isDetected ? "#f59e0b" : "#10b981"} strokeWidth="2.5" strokeLinecap="round" opacity="0.8" />
            </g>
          )}

          {/* Center Dot */}
          <circle
            cx="80"
            cy="80"
            fill={!assignedSensor ? "#94a3b8" : (isDetected ? "#f59e0b" : "#10b981")}
            className={assignedSensor && isDetected ? "animated-pulse-ring" : ""}
          />
          <circle cx="80" cy="80" r="8" fill={!assignedSensor ? "#64748b" : (isDetected ? "#d97706" : "#059669")} />
        </svg>

        {/* Text Status Label */}
        <div style={{ zIndex: 2, textAlign: 'center', pointerEvents: 'none', padding: '0 1rem' }}>
          <div style={{
            fontSize: '1.2rem',
            fontWeight: 700,
            color: !assignedSensor ? '#64748b' : (isDetected ? '#b45309' : '#047857'),
            letterSpacing: '-0.01em'
          }}>
            {!assignedSensor ? 'NO SENSOR IN THIS ROOM' : (isDetected ? 'MOTION DETECTED' : 'ROOM CLEAR')}
          </div>
          <div style={{ fontSize: '0.75rem', color: !assignedSensor ? '#94a3b8' : (isDetected ? '#d97706' : '#059669'), marginTop: '0.15rem', fontWeight: 500 }}>
            {assignedSensor 
              ? 'ESP32 PIR Setup · Live Telemetry' 
              : (primarySensor?.room_id ? `Hardware is currently placed in ${primarySensor.room_id}` : 'Hardware is currently in Standby')}
          </div>
        </div>
      </div>

      {/* Hardware Sensor Placement Bar */}
      <div style={{
        background: assignedSensor ? '#f0fdf4' : '#fffbeb',
        border: '1px solid ' + (assignedSensor ? '#bbf7d0' : '#fde68a'),
        borderRadius: '12px',
        padding: '0.65rem 0.85rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '0.78rem',
        gap: '0.5rem',
        flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Cpu size={15} color={assignedSensor ? '#059669' : '#d97706'} />
          <div>
            <span style={{ color: '#64748b', fontSize: '0.7rem' }}>Physical Placement:</span>{' '}
            <strong style={{ color: assignedSensor ? '#065f46' : '#92400e' }}>
              {assignedSensor ? `Placed in ${selectedRoom}` : (primarySensor?.room_id ? `Placed in ${primarySensor.room_id}` : 'In Standby')}
            </strong>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          {!assignedSensor && primarySensor && (
            <button
              onClick={() => onAssignSensor(primarySensor.sensor_id, selectedRoom)}
              style={{
                background: '#0284c7',
                border: 'none',
                borderRadius: '7px',
                padding: '0.25rem 0.65rem',
                fontSize: '0.74rem',
                fontWeight: 600,
                color: '#ffffff',
                cursor: 'pointer'
              }}
              title={`Relocate the ESP32 sensor setup to ${selectedRoom}`}
            >
              Move Sensor Here
            </button>
          )}

          <button
            onClick={onOpenSensorManager}
            style={{
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '7px',
              padding: '0.25rem 0.55rem',
              fontSize: '0.72rem',
              fontWeight: 600,
              color: '#0284c7',
              cursor: 'pointer'
            }}
          >
            Manage Placement
          </button>
        </div>
      </div>

      {/* Pastel Meta Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '0.75rem',
        fontSize: '0.78rem'
      }}>
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '0.55rem 0.75rem', borderRadius: '12px' }}>
          <div style={{ color: '#64748b', fontSize: '0.7rem', fontWeight: 500 }}>Last Sensor Signal</div>
          <div style={{ fontWeight: 700, color: '#0f172a', fontFamily: 'var(--font-mono)', marginTop: '0.1rem' }}>
            {lastEventTime}
          </div>
        </div>
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '0.55rem 0.75rem', borderRadius: '12px' }}>
          <div style={{ color: '#64748b', fontSize: '0.7rem', fontWeight: 500 }}>Elapsed</div>
          <div style={{ fontWeight: 700, color: '#0284c7', fontFamily: 'var(--font-mono)', marginTop: '0.1rem' }}>
            {elapsedSec}s ago
          </div>
        </div>
      </div>
    </div>
  );
}
