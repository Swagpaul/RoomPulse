import React, { useState } from 'react';
import { TrendingUp, Calendar, Flame, ArrowRight, Activity } from 'lucide-react';

export default function DailyTrendChart({
  dailyData = [],
  trendDays = 7,
  onSelectTrendDays,
  onSelectDate,
  selectedDate,
  summary = null
}) {
  const [hoveredDay, setHoveredDay] = useState(null);

  const maxCount = Math.max(...dailyData.map(d => d.motion_detected || 0), 1);
  const chartHeight = 160;

  const formatPeakHour = (hour) => {
    if (hour === null || hour === undefined) return 'None';
    if (hour === 0) return '12 AM';
    if (hour === 12) return '12 PM';
    if (hour > 12) return `${hour - 12} PM`;
    return `${hour} AM`;
  };

  return (
    <div className="pastel-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Header and Range Filter Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
            <TrendingUp size={18} color="#0284c7" />
            Multi-Day Activity Trend & Timeline
          </h3>
          <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '0.2rem 0 0 0' }}>
            Daily occupancy session volume over time &bull; Click any day to view its 24-hour breakdown
          </p>
        </div>

        {/* Range Buttons (7D / 14D / 30D) */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          background: '#f1f5f9',
          borderRadius: '10px',
          padding: '0.25rem',
          gap: '0.25rem'
        }}>
          {[7, 14, 30].map(days => (
            <button
              key={days}
              type="button"
              onClick={() => onSelectTrendDays && onSelectTrendDays(days)}
              style={{
                border: 'none',
                background: trendDays === days ? '#ffffff' : 'transparent',
                color: trendDays === days ? '#0284c7' : '#64748b',
                fontWeight: trendDays === days ? 700 : 500,
                fontSize: '0.78rem',
                padding: '0.35rem 0.75rem',
                borderRadius: '8px',
                cursor: 'pointer',
                boxShadow: trendDays === days ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              Last {days} Days
            </button>
          ))}
        </div>
      </div>

      {/* High-Level Metric Stat Badges */}
      {summary && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '0.75rem',
          padding: '0.85rem 1rem',
          background: '#f8fafc',
          borderRadius: '12px',
          border: '1px solid #f1f5f9'
        }}>
          <div>
            <div style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
              Total Sessions
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0369a1', marginTop: '0.1rem' }}>
              {summary.total_motion_detected || 0}
            </div>
            <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
              In past {trendDays} days
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
              Daily Average
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', marginTop: '0.1rem' }}>
              {summary.daily_average_motion || 0}
            </div>
            <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
              Sessions / day
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
              Busiest Day
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#d97706', marginTop: '0.1rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <Flame size={15} color="#f59e0b" />
              {summary.busiest_day ? `${summary.busiest_day.formatted}` : 'N/A'}
            </div>
            <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
              {summary.busiest_day ? `${summary.busiest_day.count} sessions` : 'No data'}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
              Active Days
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#059669', marginTop: '0.1rem' }}>
              {dailyData.filter(d => d.motion_detected > 0).length} / {trendDays}
            </div>
            <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
              Days with motion
            </div>
          </div>
        </div>
      )}

      {/* SVG Daily Bar Chart */}
      <div style={{ position: 'relative', height: `${chartHeight + 48}px`, width: '100%' }}>
        <svg width="100%" height={chartHeight} style={{ overflow: 'visible' }}>
          {/* Gridlines */}
          <line x1="0" y1="0" x2="100%" y2="0" stroke="#f1f5f9" strokeDasharray="4 4" />
          <line x1="0" y1={chartHeight / 2} x2="100%" y2={chartHeight / 2} stroke="#f1f5f9" strokeDasharray="4 4" />
          <line x1="0" y1={chartHeight} x2="100%" y2={chartHeight} stroke="#e2e8f0" />

          {/* Daily Bars */}
          {dailyData.map((d, index) => {
            const numCols = dailyData.length;
            const barWidthPercent = 100 / numCols;
            const padding = numCols > 14 ? 0.3 : 0.8;
            const count = d.motion_detected || 0;
            const barHeight = count > 0 ? (count / maxCount) * (chartHeight - 16) : 4;
            const x = index * barWidthPercent;
            const y = chartHeight - barHeight;
            const isHovered = hoveredDay && hoveredDay.date === d.date;
            const isSelected = selectedDate === d.date;
            const isPeak = count > 0 && count === maxCount;

            // Fill color based on volume and selection state
            let fill = '#e2e8f0';
            if (count > 0) {
              if (isPeak) fill = '#f59e0b'; // Amber for peak
              else if (count / maxCount > 0.5) fill = '#38bdf8'; // Sky
              else fill = '#bae6fd'; // Light sky
            }
            if (isHovered || isSelected) {
              fill = '#0284c7'; // Deep brand blue when focused
            }

            return (
              <g
                key={d.date}
                onClick={() => onSelectDate && onSelectDate(d.date)}
                onMouseEnter={() => setHoveredDay(d)}
                onMouseLeave={() => setHoveredDay(null)}
                style={{ cursor: 'pointer' }}
              >
                <rect
                  x={`${x + padding}%`}
                  y={y}
                  width={`${Math.max(barWidthPercent - padding * 2, 0.5)}%`}
                  height={barHeight}
                  rx={numCols > 14 ? 3 : 6}
                  fill={fill}
                  opacity={isHovered || isSelected ? 1 : 0.85}
                  style={{ transition: 'all 0.2s ease' }}
                />
              </g>
            );
          })}
        </svg>

        {/* X-Axis Labels */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: '0.6rem',
          fontSize: '0.7rem',
          color: '#64748b',
          fontFamily: 'var(--font-mono)'
        }}>
          {trendDays <= 7 ? (
            dailyData.map(d => (
              <span
                key={d.date}
                onClick={() => onSelectDate && onSelectDate(d.date)}
                style={{
                  cursor: 'pointer',
                  fontWeight: selectedDate === d.date ? 700 : 500,
                  color: selectedDate === d.date ? '#0284c7' : '#64748b'
                }}
              >
                {d.day_name} {d.date.slice(-2)}
              </span>
            ))
          ) : (
            // For 14 or 30 days, show spaced key dates
            dailyData.filter((_, idx) => idx % Math.ceil(dailyData.length / 7) === 0 || idx === dailyData.length - 1).map(d => (
              <span key={d.date}>
                {d.formatted_date}
              </span>
            ))
          )}
        </div>
      </div>

      {/* Hover or Selected Day Detailed Card */}
      {hoveredDay ? (
        <div style={{
          background: '#eff6ff',
          border: '1px solid #bfdbfe',
          borderRadius: '10px',
          padding: '0.75rem 1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.82rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Calendar size={16} color="#0284c7" />
            <span>
              <strong>{hoveredDay.day_name}, {hoveredDay.formatted_date}</strong>: {hoveredDay.motion_detected || 0} motion sessions
              {hoveredDay.active_hours > 0 && ` across ${hoveredDay.active_hours} active hours`}
              {hoveredDay.peak_hour !== null && ` &bull; Peak: ${formatPeakHour(hoveredDay.peak_hour)}`}
            </span>
          </div>
          <button
            type="button"
            onClick={() => onSelectDate && onSelectDate(hoveredDay.date)}
            style={{
              background: '#0284c7',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              padding: '0.3rem 0.65rem',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem'
            }}
          >
            Inspect 24h Breakdown <ArrowRight size={13} />
          </button>
        </div>
      ) : (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.75rem',
          color: '#94a3b8',
          paddingTop: '0.2rem'
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Activity size={13} /> Hover over any bar for daily stats, or click to drill down into that day's 24 hours.
          </span>
          {selectedDate && (
            <span style={{ color: '#0284c7', fontWeight: 600 }}>
              Currently focused: {selectedDate}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
