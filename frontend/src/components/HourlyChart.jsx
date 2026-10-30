import React, { useState } from 'react';
import { BarChart3, Calendar } from 'lucide-react';

export default function HourlyChart({ hourlyData, selectedDate, isToday = true, dateLabel }) {
  const [hoveredHour, setHoveredHour] = useState(null);

  if (!hourlyData || hourlyData.length === 0) return null;

  const maxCount = Math.max(...hourlyData.map(d => d.count), 1);
  const chartHeight = 150;

  return (
    <div className="pastel-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
            <BarChart3 size={18} color="#0284c7" />
            Hourly Occupancy Distribution
          </h3>
          {selectedDate && (
            <span style={{
              fontSize: '0.74rem',
              fontWeight: 600,
              padding: '0.15rem 0.55rem',
              borderRadius: '999px',
              background: isToday ? '#ecfdf5' : '#f0f9ff',
              color: isToday ? '#059669' : '#0284c7',
              border: `1px solid ${isToday ? '#a7f3d0' : '#bae6fd'}`,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem'
            }}>
              <Calendar size={12} />
              {dateLabel || selectedDate}
            </span>
          )}
        </div>

        {hoveredHour !== null ? (
          <div style={{ fontSize: '0.82rem', color: '#0369a1', background: '#e0f2fe', padding: '0.25rem 0.65rem', borderRadius: '8px', fontWeight: 600 }}>
            Hour {hoveredHour.hour}:00 &bull; {hoveredHour.count} Motion Events
          </div>
        ) : (
          <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Hover bar for details</div>
        )}
      </div>

      {/* SVG Bar Chart */}
      <div style={{ position: 'relative', height: `${chartHeight + 32}px`, width: '100%' }}>
        <svg width="100%" height={chartHeight} style={{ overflow: 'visible' }}>
          {/* Subtle Gridlines */}
          <line x1="0" y1="0" x2="100%" y2="0" stroke="#f1f5f9" strokeDasharray="4 4" />
          <line x1="0" y1={chartHeight / 2} x2="100%" y2={chartHeight / 2} stroke="#f1f5f9" strokeDasharray="4 4" />
          <line x1="0" y1={chartHeight} x2="100%" y2={chartHeight} stroke="#e2e8f0" />

          {/* Pastel SVG Bars */}
          {hourlyData.map((d, index) => {
            const barWidth = 100 / 24;
            const barHeight = (d.count / maxCount) * (chartHeight - 12);
            const x = index * barWidth;
            const y = chartHeight - barHeight;
            const isHovered = hoveredHour && hoveredHour.hour === d.hour;
            const isPeak = d.count > maxCount * 0.7;

            return (
              <g 
                key={d.hour} 
                onMouseEnter={() => setHoveredHour(d)}
                onMouseLeave={() => setHoveredHour(null)}
                style={{ cursor: 'pointer' }}
              >
                <rect
                  x={`${x + 0.6}%`}
                  y={y}
                  width={`${barWidth - 1.2}%`}
                  height={Math.max(barHeight, 3)}
                  rx="6"
                  fill={isHovered ? '#0284c7' : isPeak ? '#f59e0b' : '#38bdf8'}
                  opacity={isHovered ? 1 : 0.8}
                  style={{ transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)' }}
                />
              </g>
            );
          })}
        </svg>

        {/* X-Axis Hour Labels */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: '0.6rem',
          fontSize: '0.7rem',
          color: '#64748b',
          fontFamily: 'var(--font-mono)'
        }}>
          <span>12 AM</span>
          <span>04 AM</span>
          <span>08 AM</span>
          <span>12 PM</span>
          <span>04 PM</span>
          <span>08 PM</span>
          <span>11 PM</span>
        </div>
      </div>
    </div>
  );
}
