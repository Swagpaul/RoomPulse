import React, { useState, useMemo } from 'react';
import { Terminal, Download } from 'lucide-react';

export default function EventLogTable({ events = [], selectedDate, _onSelectDate }) {
  const [filterType, setFilterType] = useState('all'); // 'all' | 'motion_detected' | 'motion_cleared'
  const [dateFilterMode, setDateFilterMode] = useState('all'); // 'all' | 'selected_date'

  // Filter events based on active controls
  const filteredEvents = useMemo(() => {
    let list = events || [];

    if (dateFilterMode === 'selected_date' && selectedDate) {
      list = list.filter(e => e.timestamp && e.timestamp.startsWith(selectedDate));
    }

    if (filterType !== 'all') {
      list = list.filter(e => e.event === filterType);
    }

    return list;
  }, [events, dateFilterMode, selectedDate, filterType]);

  const displayEvents = filteredEvents.slice(0, 50);

  // CSV Export utility
  const handleExportCSV = () => {
    if (!filteredEvents || filteredEvents.length === 0) return;

    const headers = ['id', 'room_id', 'sensor_id', 'event', 'timestamp', 'duration_ms', 'device_timestamp_ms'];
    const rows = filteredEvents.map(e => [
      e.id || '',
      e.room_id || '',
      e.sensor_id || '',
      e.event || '',
      e.timestamp || '',
      e.duration_ms || '',
      e.device_timestamp_ms || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `roompulse-events-${selectedDate || 'all'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="pastel-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
            <Terminal size={18} color="#0284c7" />
            Room Event Telemetry Log
          </h3>
          <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
            Showing {displayEvents.length} of {filteredEvents.length} matched motion telemetry events
          </span>
        </div>

        {/* Action and Filter Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          
          {/* Date Scope Toggle (if selectedDate is provided) */}
          {selectedDate && (
            <div style={{
              display: 'flex',
              background: '#f1f5f9',
              borderRadius: '8px',
              padding: '0.2rem',
              fontSize: '0.75rem'
            }}>
              <button
                type="button"
                onClick={() => setDateFilterMode('all')}
                style={{
                  border: 'none',
                  background: dateFilterMode === 'all' ? '#ffffff' : 'transparent',
                  color: dateFilterMode === 'all' ? '#0284c7' : '#64748b',
                  fontWeight: dateFilterMode === 'all' ? 700 : 500,
                  borderRadius: '6px',
                  padding: '0.25rem 0.6rem',
                  cursor: 'pointer',
                  boxShadow: dateFilterMode === 'all' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none'
                }}
              >
                All Events
              </button>
              <button
                type="button"
                onClick={() => setDateFilterMode('selected_date')}
                style={{
                  border: 'none',
                  background: dateFilterMode === 'selected_date' ? '#ffffff' : 'transparent',
                  color: dateFilterMode === 'selected_date' ? '#0284c7' : '#64748b',
                  fontWeight: dateFilterMode === 'selected_date' ? 700 : 500,
                  borderRadius: '6px',
                  padding: '0.25rem 0.6rem',
                  cursor: 'pointer',
                  boxShadow: dateFilterMode === 'selected_date' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none'
                }}
              >
                Date: {selectedDate}
              </button>
            </div>
          )}

          {/* Event Type Filter */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            style={{
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              background: '#ffffff',
              padding: '0.35rem 0.6rem',
              fontSize: '0.75rem',
              fontWeight: 500,
              color: '#0f172a',
              cursor: 'pointer',
              outline: 'none'
            }}
          >
            <option value="all">All Event Types</option>
            <option value="motion_detected">motion_detected</option>
            <option value="motion_cleared">motion_cleared</option>
          </select>

          {/* Export to CSV Button */}
          <button
            type="button"
            onClick={handleExportCSV}
            disabled={filteredEvents.length === 0}
            style={{
              border: '1px solid #cbd5e1',
              background: filteredEvents.length === 0 ? '#f8fafc' : '#ffffff',
              color: filteredEvents.length === 0 ? '#94a3b8' : '#0f172a',
              borderRadius: '8px',
              padding: '0.35rem 0.65rem',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: filteredEvents.length === 0 ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
            }}
            title="Download matched events as CSV file"
          >
            <Download size={13} color="#0284c7" />
            Export CSV
          </button>
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #f1f5f9', color: '#64748b' }}>
              <th style={{ padding: '0.6rem 0.8rem', fontWeight: 600 }}>Server Timestamp (UTC ISO)</th>
              <th style={{ padding: '0.6rem 0.8rem', fontWeight: 600 }}>Sensor Source</th>
              <th style={{ padding: '0.6rem 0.8rem', fontWeight: 600 }}>Event Type</th>
              <th style={{ padding: '0.6rem 0.8rem', fontWeight: 600 }}>Duration</th>
              <th style={{ padding: '0.6rem 0.8rem', fontWeight: 600 }}>Device Uptime</th>
            </tr>
          </thead>
          <tbody>
            {displayEvents.length === 0 ? (
              <tr key="empty-row">
                <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
                  No events found matching current criteria.
                </td>
              </tr>
            ) : (
              displayEvents.map((evt) => {
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
                    <td style={{ padding: '0.65rem 0.8rem', fontFamily: 'var(--font-mono)', color: '#0369a1', fontSize: '0.78rem' }}>
                      {evt.sensor_id || 'esp32-sensor-01'}
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
