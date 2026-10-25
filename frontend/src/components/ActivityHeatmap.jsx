import React from 'react';
import { Grid } from 'lucide-react';

export default function ActivityHeatmap({ hourlyData }) {
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const maxCount = hourlyData ? Math.max(...hourlyData.map(h => h.count), 1) : 1;

  // Soft Pastel Intensity Palette
  const getCellStyles = (count) => {
    if (count === 0) return { bg: '#f1f5f9', color: '#94a3b8', border: '#e2e8f0' };
    const ratio = count / maxCount;
    if (ratio < 0.25) return { bg: '#e0f2fe', color: '#0369a1', border: '#bae6fd' }; // Soft Sky
    if (ratio < 0.6) return { bg: '#e0e7ff', color: '#4338ca', border: '#c7d2fe' };  // Soft Lavender
    if (ratio < 0.85) return { bg: '#fef3c7', color: '#b45309', border: '#fde68a' }; // Soft Amber
    return { bg: '#ffe4e6', color: '#be123c', border: '#fecdd3' };                    // Soft Rose
  };

  return (
    <div className="pastel-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Grid size={18} color="#0284c7" />
          24-Hour Activity Density Heatmap
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: '#64748b' }}>
          <span>Low</span>
          <div style={{ width: '12px', height: '12px', background: '#e0f2fe', border: '1px solid #bae6fd', borderRadius: '3px' }} />
          <div style={{ width: '12px', height: '12px', background: '#e0e7ff', border: '1px solid #c7d2fe', borderRadius: '3px' }} />
          <div style={{ width: '12px', height: '12px', background: '#fef3c7', border: '1px solid #fde68a', borderRadius: '3px' }} />
          <div style={{ width: '12px', height: '12px', background: '#ffe4e6', border: '1px solid #fecdd3', borderRadius: '3px' }} />
          <span>High</span>
        </div>
      </div>

      {/* Grid of 24 Hour Blocks */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(12, 1fr)',
        gap: '0.6rem'
      }}>
        {hours.map(h => {
          const item = hourlyData ? hourlyData.find(x => x.hour === h) : null;
          const count = item ? item.count : 0;
          const formatHour = h === 0 ? '12AM' : h === 12 ? '12PM' : h > 12 ? `${h-12}PM` : `${h}AM`;
          const style = getCellStyles(count);

          return (
            <div
              key={h}
              className="pastel-heatmap-cell"
              style={{
                background: style.bg,
                border: `1px solid ${style.border}`,
                padding: '0.6rem 0.2rem',
                textAlign: 'center'
              }}
              title={`Hour: ${formatHour} | Motion Events: ${count}`}
            >
              <div style={{ fontSize: '0.7rem', color: '#64748b', fontFamily: 'var(--font-mono)', fontWeight: 500 }}>
                {formatHour}
              </div>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: style.color, marginTop: '0.1rem' }}>
                {count}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
