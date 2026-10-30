import React, { useState } from 'react';
import ActivityHeatmap from './ActivityHeatmap';
import HourlyChart from './HourlyChart';
import DailyTrendChart from './DailyTrendChart';
import { 
  Calendar, 
  Clock, 
  TrendingUp, 
  ChevronLeft, 
  ChevronRight, 
  RotateCcw, 
  History
} from 'lucide-react';

export default function ActivityHistory({
  selectedRoom,
  selectedDate,
  onSelectDate,
  availableDates = [],
  hourlyData = [],
  dailyTrendData = null,
  trendDays = 7,
  onSelectTrendDays,
  daySummary = null
}) {
  const [viewMode, setViewMode] = useState('day'); // 'day' | 'trend'

  const todayStr = new Date().toISOString().split('T')[0];
  const isToday = selectedDate === todayStr;

  // Format date nicely for human display
  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return '';
    if (dateStr === todayStr) return 'Today (Live)';
    const d = new Date(`${dateStr}T12:00:00Z`);
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatPeakHour = (h) => {
    if (h === null || h === undefined) return 'None';
    if (h === 0) return '12 AM';
    if (h === 12) return '12 PM';
    if (h > 12) return `${h - 12} PM`;
    return `${h} AM`;
  };

  // Navigate to previous day
  const handlePrevDay = () => {
    const cur = new Date(`${selectedDate}T12:00:00Z`);
    cur.setUTCDate(cur.getUTCDate() - 1);
    const prevStr = cur.toISOString().split('T')[0];
    onSelectDate(prevStr);
  };

  // Navigate to next day (cannot go past today)
  const handleNextDay = () => {
    if (isToday) return;
    const cur = new Date(`${selectedDate}T12:00:00Z`);
    cur.setUTCDate(cur.getUTCDate() + 1);
    const nextStr = cur.toISOString().split('T')[0];
    if (nextStr <= todayStr) {
      onSelectDate(nextStr);
    }
  };

  // Drill down from multi-day trend into single day
  const handleTrendDayClick = (dateStr) => {
    onSelectDate(dateStr);
    setViewMode('day');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Main Activity History Control Header */}
      <div className="pastel-card" style={{ padding: '1.1rem 1.4rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          
          {/* Title and Mode Switcher */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: '#e0f2fe',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#0284c7'
              }}>
                <History size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                  Room Activity History
                </h3>
                <span style={{ fontSize: '0.76rem', color: '#64748b' }}>
                  Occupancy & sensor timeline for <strong>{selectedRoom}</strong>
                </span>
              </div>
            </div>

            {/* Mode Pills: Single Day 24h vs Multi-Day Trends */}
            <div style={{
              display: 'flex',
              background: '#f1f5f9',
              borderRadius: '10px',
              padding: '0.25rem',
              gap: '0.2rem'
            }}>
              <button
                type="button"
                onClick={() => setViewMode('day')}
                style={{
                  border: 'none',
                  background: viewMode === 'day' ? '#ffffff' : 'transparent',
                  color: viewMode === 'day' ? '#0284c7' : '#64748b',
                  fontWeight: viewMode === 'day' ? 700 : 500,
                  fontSize: '0.78rem',
                  padding: '0.35rem 0.75rem',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  boxShadow: viewMode === 'day' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                <Clock size={14} /> 24-Hour Day Detail
              </button>

              <button
                type="button"
                onClick={() => setViewMode('trend')}
                style={{
                  border: 'none',
                  background: viewMode === 'trend' ? '#ffffff' : 'transparent',
                  color: viewMode === 'trend' ? '#0284c7' : '#64748b',
                  fontWeight: viewMode === 'trend' ? 700 : 500,
                  fontSize: '0.78rem',
                  padding: '0.35rem 0.75rem',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  boxShadow: viewMode === 'trend' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                <TrendingUp size={14} /> Multi-Day Trends
              </button>
            </div>
          </div>

          {/* Date Navigation & Selector (Always accessible) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            
            {/* Quick jump to Today */}
            <button
              type="button"
              onClick={() => onSelectDate(todayStr)}
              style={{
                border: isToday ? '1px solid #10b981' : '1px solid #e2e8f0',
                background: isToday ? '#ecfdf5' : '#ffffff',
                color: isToday ? '#059669' : '#475569',
                borderRadius: '8px',
                padding: '0.35rem 0.7rem',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                transition: 'all 0.15s ease'
              }}
              title="Return to today's live telemetry"
            >
              <span style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: isToday ? '#10b981' : '#94a3b8'
              }} />
              Today (Live)
            </button>

            {/* Stepper Buttons and Date Input */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              background: '#ffffff',
              overflow: 'hidden'
            }}>
              <button
                type="button"
                onClick={handlePrevDay}
                style={{
                  border: 'none',
                  background: 'transparent',
                  padding: '0.4rem 0.5rem',
                  cursor: 'pointer',
                  color: '#475569',
                  display: 'flex',
                  alignItems: 'center'
                }}
                title="Previous Day"
              >
                <ChevronLeft size={16} />
              </button>

              <input
                type="date"
                value={selectedDate}
                max={todayStr}
                onChange={(e) => e.target.value && onSelectDate(e.target.value)}
                style={{
                  border: 'none',
                  outline: 'none',
                  fontFamily: 'var(--font-sans)',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: '#0f172a',
                  padding: '0.35rem 0.2rem',
                  cursor: 'pointer'
                }}
              />

              <button
                type="button"
                onClick={handleNextDay}
                disabled={isToday}
                style={{
                  border: 'none',
                  background: 'transparent',
                  padding: '0.4rem 0.5rem',
                  cursor: isToday ? 'not-allowed' : 'pointer',
                  color: isToday ? '#cbd5e1' : '#475569',
                  display: 'flex',
                  alignItems: 'center'
                }}
                title="Next Day"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Quick dropdown of dates that actually have events */}
            {availableDates && availableDates.length > 0 && (
              <select
                value={selectedDate}
                onChange={(e) => onSelectDate(e.target.value)}
                style={{
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  background: '#ffffff',
                  padding: '0.38rem 0.65rem',
                  fontSize: '0.78rem',
                  fontWeight: 500,
                  color: '#0f172a',
                  cursor: 'pointer',
                  outline: 'none'
                }}
                title="Jump to a specific date with recorded activity"
              >
                <option value="" disabled>Jump to recorded day...</option>
                {availableDates.map(item => (
                  <option key={item.date} value={item.date}>
                    {item.label} &bull; {item.motion_count} sessions
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Historical Context Notice Bar */}
        <div style={{
          marginTop: '1rem',
          padding: '0.65rem 1rem',
          borderRadius: '10px',
          background: isToday ? '#f0fdf4' : '#eff6ff',
          border: `1px solid ${isToday ? '#bbf7d0' : '#bfdbfe'}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.6rem',
          fontSize: '0.82rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Calendar size={16} color={isToday ? '#16a34a' : '#0284c7'} />
            <span>
              {isToday ? (
                <>
                  <strong style={{ color: '#166534' }}>Live Telemetry Mode:</strong> Showing activity for today (<strong>{formatDateDisplay(selectedDate)}</strong>). Real-time IoT events update this chart live.
                </>
              ) : (
                <>
                  <strong style={{ color: '#1e40af' }}>Historical Archive View:</strong> Inspecting activity recorded for <strong>{selectedRoom}</strong> on <strong>{formatDateDisplay(selectedDate)}</strong>.
                </>
              )}
            </span>
          </div>

          {!isToday && (
            <button
              type="button"
              onClick={() => onSelectDate(todayStr)}
              style={{
                border: 'none',
                background: '#0284c7',
                color: '#ffffff',
                borderRadius: '6px',
                padding: '0.25rem 0.65rem',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem'
              }}
            >
              <RotateCcw size={12} /> Return to Today
            </button>
          )}
        </div>

        {/* Selected Day Quick Metrics Row */}
        {daySummary && viewMode === 'day' && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: '0.65rem',
            marginTop: '0.85rem'
          }}>
            <div style={{ background: '#f8fafc', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
              <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Day Sessions</div>
              <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0369a1', marginTop: '0.1rem' }}>
                {daySummary.total_sessions || 0}
              </div>
              <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Motion triggers</div>
            </div>

            <div style={{ background: '#f8fafc', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
              <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Peak Hour</div>
              <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#d97706', marginTop: '0.1rem' }}>
                {formatPeakHour(daySummary.most_active_hour)}
              </div>
              <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Busiest occupancy</div>
            </div>

            <div style={{ background: '#f8fafc', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
              <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Active Hours</div>
              <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#059669', marginTop: '0.1rem' }}>
                {daySummary.active_hours_count || 0} / 24
              </div>
              <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Hours occupied</div>
            </div>

            <div style={{ background: '#f8fafc', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
              <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Avg Duration</div>
              <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#4338ca', marginTop: '0.1rem' }}>
                {daySummary.avg_session_duration_ms ? `${(daySummary.avg_session_duration_ms / 1000).toFixed(1)}s` : '0s'}
              </div>
              <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Per session</div>
            </div>
          </div>
        )}
      </div>

      {/* Main View Content */}
      {viewMode === 'day' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <ActivityHeatmap 
            hourlyData={hourlyData} 
            selectedDate={selectedDate} 
            isToday={isToday}
            dateLabel={formatDateDisplay(selectedDate)}
          />
          <HourlyChart 
            hourlyData={hourlyData} 
            selectedDate={selectedDate} 
            isToday={isToday}
            dateLabel={formatDateDisplay(selectedDate)}
          />
        </div>
      ) : (
        <DailyTrendChart
          dailyData={dailyTrendData?.daily || []}
          trendDays={trendDays}
          onSelectTrendDays={onSelectTrendDays}
          onSelectDate={handleTrendDayClick}
          selectedDate={selectedDate}
          summary={dailyTrendData}
        />
      )}
    </div>
  );
}
