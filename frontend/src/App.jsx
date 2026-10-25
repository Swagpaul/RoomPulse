import React, { useState, useEffect, useCallback, useRef } from 'react';
import Navbar from './components/Navbar';
import MotionRadar from './components/MotionRadar';
import SummaryStats from './components/SummaryStats';
import ActivityHeatmap from './components/ActivityHeatmap';
import HourlyChart from './components/HourlyChart';
import AnomalyFeed from './components/AnomalyFeed';
import EventLogTable from './components/EventLogTable';
import AICopilot from './components/AICopilot';

const API_BASE = 'http://localhost:5000';
const WS_URL = 'ws://localhost:5000';

export default function App() {
  const [selectedRoom, setSelectedRoom] = useState('room238');
  const [isConnected, setIsConnected] = useState(false);
  const [latestEvent, setLatestEvent] = useState(null);
  
  // Data states
  const [summary, setSummary] = useState(null);
  const [hourlyData, setHourlyData] = useState([]);
  const [anomalies, setAnomalies] = useState([]);
  const [events, setEvents] = useState([]);

  // Refs to prevent stale closures inside WebSocket callbacks
  const selectedRoomRef = useRef(selectedRoom);
  useEffect(() => { selectedRoomRef.current = selectedRoom; }, [selectedRoom]);

  // Fetch API data for selected room
  const fetchRoomData = useCallback(async (roomId) => {
    try {
      const [sumRes, hourlyRes, anomRes, evtsRes] = await Promise.all([
        fetch(`${API_BASE}/rooms/${roomId}/activity/summary?range=week`),
        fetch(`${API_BASE}/rooms/${roomId}/activity/hourly`),
        fetch(`${API_BASE}/rooms/${roomId}/anomalies?range=week`),
        fetch(`${API_BASE}/rooms/${roomId}/events`)
      ]);

      if (sumRes.ok) setSummary(await sumRes.json());
      if (hourlyRes.ok) setHourlyData(await hourlyRes.json());
      if (anomRes.ok) setAnomalies(await anomRes.json());
      if (evtsRes.ok) {
        const evtsList = await evtsRes.json();
        setEvents(evtsList);
        if (evtsList.length > 0) {
          setLatestEvent(evtsList[0]);
        }
      }
    } catch (err) {
      console.error('Error fetching room data:', err);
    }
  }, []);

  useEffect(() => {
    fetchRoomData(selectedRoom);
  }, [selectedRoom, fetchRoomData]);

  // Establish WebSocket Connection — connects ONCE, never torn down on room change
  useEffect(() => {
    let ws = null;
    let timer = null;
    let intentionalClose = false;

    const connectWS = () => {
      if (intentionalClose) return;
      ws = new WebSocket(WS_URL);

      ws.onopen = () => {
        setIsConnected(true);
        console.log('[WebSocket] Connected to RoomPulse backend stream.');
      };

      ws.onmessage = (message) => {
        try {
          const data = JSON.parse(message.data);
          if (data.type === 'LATEST_MOTION_EVENT') {
            const eventPayload = data.payload;
            console.log('[WebSocket Live Motion]', eventPayload);
            
            setLatestEvent(eventPayload);
            
            // Use ref to read latest selectedRoom without re-running the effect
            const currentRoom = selectedRoomRef.current;
            if (eventPayload.room_id === currentRoom) {
              setEvents(prev => {
                const exists = prev.some(e => e.id === eventPayload.id || (e.timestamp === eventPayload.timestamp && e.event === eventPayload.event));
                return exists ? prev : [eventPayload, ...prev];
              });
              // Refresh hourly and summary metrics
              fetchRoomData(currentRoom);
            }
          }
        } catch (e) {
          console.error('[WebSocket] Error parsing message:', e);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        if (!intentionalClose) {
          console.log('[WebSocket] Disconnected. Reconnecting in 5s...');
          timer = setTimeout(connectWS, 5000);
        }
      };

      ws.onerror = () => {
        // onclose will fire after onerror, so just let it handle reconnect
      };
    };

    connectWS();

    return () => {
      intentionalClose = true;
      if (timer) clearTimeout(timer);
      if (ws) ws.close();
    };
  // Empty deps: connect once, never re-run
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Trigger Mock Motion Simulation
  const handleTriggerSim = async () => {
    try {
      await fetch(`${API_BASE}/api/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ room_id: selectedRoom, event: 'motion_detected' })
      });
    } catch (err) {
      console.error('Failed to trigger simulation:', err);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar
        selectedRoom={selectedRoom}
        setSelectedRoom={setSelectedRoom}
        isConnected={isConnected}
        onTriggerSim={handleTriggerSim}
      />

      <main className="dashboard-grid" style={{ flex: 1, width: '100%' }}>
        {/* Top Metric Cards (Span 12 cols) */}
        <div style={{ gridColumn: 'span 12' }}>
          <SummaryStats summary={summary} anomalyCount={anomalies.length} />
        </div>

        {/* Left Column: Live Radar & Anomaly Feed (Span 4 cols) */}
        <div style={{ gridColumn: 'span 4', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <MotionRadar latestEvent={latestEvent} selectedRoom={selectedRoom} />
          <AnomalyFeed anomalies={anomalies} />
        </div>

        {/* Right Column: Heatmap, Hourly Chart (Span 8 cols) */}
        <div style={{ gridColumn: 'span 8', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <ActivityHeatmap hourlyData={hourlyData} />
          <HourlyChart hourlyData={hourlyData} />
        </div>

        {/* AI Intelligence Copilot (Full Width — 12 cols) */}
        <div style={{ gridColumn: 'span 12' }}>
          <AICopilot selectedRoom={selectedRoom} />
        </div>

        {/* Raw Event Logs (Full Width — 12 cols) */}
        <div style={{ gridColumn: 'span 12' }}>
          <EventLogTable events={events} />
        </div>
      </main>

      <footer style={{
        textAlign: 'center',
        padding: '1rem',
        borderTop: '1px solid rgba(255, 255, 255, 0.05)',
        fontSize: '0.75rem',
        color: 'var(--text-muted)'
      }}>
        RoomPulse Privacy-Preserving IoT Platform &bull; AWS IoT Core & Sensor Ready
      </footer>
    </div>
  );
}
