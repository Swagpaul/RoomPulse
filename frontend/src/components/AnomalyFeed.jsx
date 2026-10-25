import React from 'react';
import { AlertOctagon, Info } from 'lucide-react';

export default function AnomalyFeed({ anomalies }) {
  return (
    <div className="pastel-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertOctagon size={18} color="#e11d48" />
          Z-Score Anomaly Feed
        </h3>
        <span className="badge badge-rose">
          {anomalies ? anomalies.length : 0} FLAGGED
        </span>
      </div>

      {(!anomalies || anomalies.length === 0) ? (
        <div style={{
          padding: '2rem',
          textAlign: 'center',
          color: '#64748b',
          fontSize: '0.85rem',
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '14px'
        }}>
          <Info size={24} color="#94a3b8" style={{ marginBottom: '0.5rem' }} />
          <div style={{ fontWeight: 600, color: '#0f172a' }}>No anomalies detected</div>
          <div style={{ fontSize: '0.75rem', marginTop: '0.2rem', color: '#94a3b8' }}>
            All room motion is within standard baseline deviation ($Z \le 2.5$).
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', maxHeight: '330px', overflowY: 'auto' }}>
          {anomalies.map((anom) => {
            const timeStr = new Date(anom.timestamp).toLocaleString();
            return (
              <div
                key={anom.id}
                style={{
                  background: '#fff1f2',
                  border: '1px solid #fecdd3',
                  borderRadius: '14px',
                  padding: '0.85rem 1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.4rem',
                  boxShadow: '0 2px 6px rgba(244, 63, 94, 0.06)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.78rem', color: '#be123c', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                    Z-SCORE: {anom.z_score}
                  </span>
                  <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                    {timeStr}
                  </span>
                </div>
                <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#9f1239' }}>
                  {anom.reason}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#881337', display: 'flex', gap: '1rem', marginTop: '0.1rem' }}>
                  <span>Actual: <strong>{anom.actual} counts</strong></span>
                  <span>Expected: <strong>[{anom.expected_range[0]} - {anom.expected_range[1]}]</strong></span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
