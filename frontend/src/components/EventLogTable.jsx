import React from 'react';
import { Terminal } from 'lucide-react';

export default function EventLogTable({ events }) {
  const recentEvents = events ? events.slice(0, 15) : [];

  return (
    <div className="pastel-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Terminal size={18} color="#0284c7" />
          Live Event Ingestion Stream
        </h3>
        <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
          Showing latest {recentEvents.length} motion telemetry events
        </span>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #f1f5f9', color: '#64748b' }}>
              <th style={{ padding: '0.6rem 0.8rem', fontWeight: 600 }}>Server Timestamp (UTC ISO)</th>
              <th style={{ padding: '0.6rem 0.8rem', fontWeight: 600 }}>Event Type</th>
              <th style={{ padding: '0.6rem 0.8rem', fontWeight: 600 }}>Duration</th>
              <th style={{ padding: '0.6rem 0.8rem', fontWeight: 600 }}>Device Uptime</th>
            </tr>
          </thead>
          <tbody>
            {recentEvents.length === 0 ? (
              <tr key="empty-row">
                <td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
                  No events recorded yet.
                </td>
              </tr>
            ) : (
              recentEvents.map((evt) => {
                const isDetected = evt.event === 'motion_detected';
                return (
                  <tr
                    key={evt.id || `${evt.timestamp}-${evt.event}`}
                    style={{
                      borderBottom: '1px solid #f8fafc',
                      transition: 'background 0.15s ease'
                    }}
                  >
                    <td style={{ padding: '0.65rem 0.8rem', fontFamily: 'var(--font-mono)', color: '#0f172a' }}>
                      {evt.timestamp}
                    </td>
                    <td style={{ padding: '0.65rem 0.8rem' }}>
                      <span className={`badge ${isDetected ? 'badge-amber' : 'badge-mint'}`}>
                        {evt.event}
                      </span>
                    </td>
                    <td style={{ padding: '0.65rem 0.8rem', fontFamily: 'var(--font-mono)', color: evt.duration_ms ? '#047857' : '#94a3b8', fontWeight: 600 }}>
                      {evt.duration_ms ? `${evt.duration_ms} ms` : '-'}
                    </td>
                    <td style={{ padding: '0.65rem 0.8rem', fontFamily: 'var(--font-mono)', color: '#64748b' }}>
                      {evt.device_timestamp_ms ? `${evt.device_timestamp_ms} ms` : 'N/A'}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
