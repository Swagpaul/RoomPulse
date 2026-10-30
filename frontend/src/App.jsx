import React, { useState, useEffect, useCallback, useRef } from 'react';
import Navbar from './components/Navbar';
import MotionRadar from './components/MotionRadar';
import SummaryStats from './components/SummaryStats';
import ActivityHistory from './components/ActivityHistory';
import AnomalyFeed from './components/AnomalyFeed';
import EventLogTable from './components/EventLogTable';
import AICopilot from './components/AICopilot';
import SensorManagerModal from './components/SensorManagerModal';
import { AlertTriangle, X } from 'lucide-react';

const API_BASE = 'http://localhost:5000';
const WS_URL = 'ws://localhost:5000';

async function parseErrorResponse(res, defaultMsg) {
  try {
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const err = await res.json();
      return err.error || err.message || defaultMsg;
    }
    const text = await res.text();
    if (res.status === 404) {
      return 'Backend returned 404 Not Found. Please restart the backend server so the latest routes are loaded.';
    }
    return text.slice(0, 120) || defaultMsg;
  } catch {
    return defaultMsg;
  }
}

export default function App() {
  const [selectedRoom, setSelectedRoom] = useState('room238');
  const [isConnected, setIsConnected] = useState(false);
  const [latestEvent, setLatestEvent] = useState(null);

  // History & Date Navigation State
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [availableDates, setAvailableDates] = useState([]);
  const [dailyTrendData, setDailyTrendData] = useState(null);
  const [trendDays, setTrendDays] = useState(7);
  const [daySummary, setDaySummary] = useState(null);
  
  // Sensors & Rooms Association State
  const [sensors, setSensors] = useState([]);
  const [rooms, setRooms] = useState(['room238', 'room301']);
  const [isSensorModalOpen, setIsSensorModalOpen] = useState(false);
  const [unassignedNotice, setUnassignedNotice] = useState(null);

  // Data states
  const [summary, setSummary] = useState(null);
  const [hourlyData, setHourlyData] = useState([]);
  const [anomalies, setAnomalies] = useState([]);
  const [events, setEvents] = useState([]);

  // Refs to prevent stale closures inside WebSocket callbacks
  const selectedRoomRef = useRef(selectedRoom);
  const selectedDateRef = useRef(selectedDate);
  const trendDaysRef = useRef(trendDays);

  useEffect(() => { selectedRoomRef.current = selectedRoom; }, [selectedRoom]);
  useEffect(() => { selectedDateRef.current = selectedDate; }, [selectedDate]);
  useEffect(() => { trendDaysRef.current = trendDays; }, [trendDays]);

  // Fetch sensors and rooms list
  const fetchSensors = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/sensors`);
      if (res.ok) {
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const data = await res.json();
          setSensors(data.sensors || []);
          if (data.rooms && data.rooms.length > 0) {
            setRooms(data.rooms);
          }
        }
      } else {
        console.warn(`[FetchSensors] Server returned HTTP ${res.status}. If 404, please restart backend.`);
      }
    } catch (err) {
      console.error('Error fetching sensors:', err);
    }
  }, []);

  // Fetch API data for selected room and active history dates
  const fetchRoomData = useCallback(async (roomId, dateStr, daysCount) => {
    try {
      const activeDate = dateStr || selectedDateRef.current;
      const days = daysCount || trendDaysRef.current;

      const [sumRes, hourlyRes, anomRes, evtsRes, datesRes, dailyRes, daySumRes] = await Promise.all([
        fetch(`${API_BASE}/rooms/${roomId}/activity/summary?range=week`),
        fetch(`${API_BASE}/rooms/${roomId}/activity/hourly?date=${activeDate}`),
        fetch(`${API_BASE}/rooms/${roomId}/anomalies?range=week`),
        fetch(`${API_BASE}/rooms/${roomId}/events`),
        fetch(`${API_BASE}/rooms/${roomId}/activity/dates`),
        fetch(`${API_BASE}/rooms/${roomId}/activity/daily?days=${days}`),
        fetch(`${API_BASE}/rooms/${roomId}/activity/summary?date=${activeDate}`)
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
      if (datesRes.ok) {
        const datesData = await datesRes.json();
        setAvailableDates(datesData.dates || []);
      }
      if (dailyRes.ok) setDailyTrendData(await dailyRes.json());
      if (daySumRes.ok) setDaySummary(await daySumRes.json());
    } catch (err) {
      console.error('Error fetching room data:', err);
    }
  }, []);

  useEffect(() => {
    fetchSensors();
  }, [fetchSensors]);

  // Refetch when room, date, or trend duration changes
  useEffect(() => {
    fetchRoomData(selectedRoom, selectedDate, trendDays);
  }, [selectedRoom, selectedDate, trendDays, fetchRoomData]);

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

          // 1. Live Motion Event
          if (data.type === 'LATEST_MOTION_EVENT') {
            const eventPayload = data.payload;
            console.log('[WebSocket Live Motion]', eventPayload);
            
            setLatestEvent(eventPayload);
            
            const currentRoom = selectedRoomRef.current;
            if (eventPayload.room_id === currentRoom) {
              setEvents(prev => {
                const exists = prev.some(e => e.id === eventPayload.id || (e.timestamp === eventPayload.timestamp && e.event === eventPayload.event));
                return exists ? prev : [eventPayload, ...prev];
              });
              // Refresh metrics and daily charts
              fetchRoomData(currentRoom, selectedDateRef.current, trendDaysRef.current);
            }
          }

          // 2. Sensor Registry Updated (Assigned, De-assigned, Registered)
          if (data.type === 'SENSOR_REGISTRY_CHANGED') {
            console.log('[WebSocket Sensor Registry Changed]', data.payload);
            if (data.payload.sensors) {
              setSensors(data.payload.sensors);
            }
            if (data.payload.rooms) {
              setRooms(data.payload.rooms);
            }
            fetchRoomData(selectedRoomRef.current, selectedDateRef.current, trendDaysRef.current);
          }

          // 3. Motion detected on a de-assigned / unassociated sensor
          if (data.type === 'UNASSIGNED_SENSOR_EVENT') {
            console.warn('[WebSocket Unassigned Sensor Motion]', data.payload);
            setUnassignedNotice({
              sensor_id: data.payload.sensor_id,
              event: data.payload.event,
              timestamp: data.payload.timestamp
            });
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
        // onclose will handle reconnect
      };
    };

    connectWS();

    return () => {
      intentionalClose = true;
      if (timer) clearTimeout(timer);
      if (ws) ws.close();
    };
  }, [fetchRoomData]);

  // Sensor Management API Handlers
  const handleAssignSensor = async (sensorId, roomId) => {
    let res;
    try {
      res = await fetch(`${API_BASE}/api/sensors/${sensorId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ room_id: roomId })
      });
    } catch {
      throw new Error(`Cannot reach backend at ${API_BASE}. Please verify server is running.`);
    }

    if (!res.ok) {
      const errMsg = await parseErrorResponse(res, 'Failed to assign sensor');
      throw new Error(errMsg);
    }
    await fetchSensors();
    await fetchRoomData(selectedRoom, selectedDate, trendDays);
  };

  const handleDeassignSensor = async (sensorId) => {
    let res;
    try {
      res = await fetch(`${API_BASE}/api/sensors/${sensorId}/deassign`, {
        method: 'POST'
      });
    } catch {
      throw new Error(`Cannot reach backend at ${API_BASE}. Please verify server is running.`);
    }

    if (!res.ok) {
      const errMsg = await parseErrorResponse(res, 'Failed to de-assign sensor');
      throw new Error(errMsg);
    }
    await fetchSensors();
    await fetchRoomData(selectedRoom, selectedDate, trendDays);
  };

  const handleRegisterSensor = async (newSensorData) => {
    let res;
    try {
      res = await fetch(`${API_BASE}/api/sensors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSensorData)
      });
    } catch {
      throw new Error(`Cannot reach backend at ${API_BASE}. Please verify server is running.`);
    }

    if (!res.ok) {
      const errMsg = await parseErrorResponse(res, 'Failed to register sensor');
      throw new Error(errMsg);
    }
    await fetchSensors();
  };

  const handleDeleteSensor = async (sensorId) => {
    let res;
    try {
      res = await fetch(`${API_BASE}/api/sensors/${sensorId}`, {
        method: 'DELETE'
      });
    } catch {
      throw new Error(`Cannot reach backend at ${API_BASE}. Please verify server is running.`);
    }

    if (!res.ok) {
      const errMsg = await parseErrorResponse(res, 'Failed to delete sensor');
      throw new Error(errMsg);
    }
    await fetchSensors();
  };

  const handleSimulateSensor = async (sensorId) => {
    let res;
    try {
      res = await fetch(`${API_BASE}/api/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sensor_id: sensorId, event: 'motion_detected' })
      });
    } catch {
      throw new Error(`Cannot reach backend at ${API_BASE}. Please verify server is running.`);
    }

    if (!res.ok) {
      const errMsg = await parseErrorResponse(res, 'Simulation request failed');
      throw new Error(errMsg);
    }
    return await res.json();
  };

  // Trigger Mock Motion Simulation for Current Room
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

  // Currently assigned sensor for selected room and primary hardware device
  const primarySensor = sensors[0] || null;
  const assignedSensor = sensors.find(s => s.room_id === selectedRoom) || null;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar
        selectedRoom={selectedRoom}
        setSelectedRoom={(room) => {
          setSelectedRoom(room);
          setSelectedDate(todayStr); // Reset to today when switching room
        }}
        isConnected={isConnected}
        onTriggerSim={handleTriggerSim}
        rooms={rooms}
        sensors={sensors}
        onOpenSensorManager={() => setIsSensorModalOpen(true)}
      />

      {/* Unassigned Sensor Detected Alert Banner */}
      {unassignedNotice && (
        <div style={{
          background: '#fffbeb',
          borderBottom: '1px solid #fde68a',
          padding: '0.65rem 2rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.82rem',
          color: '#b45309'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <AlertTriangle size={16} />
            <span>
              <strong>Hardware Notice:</strong> Motion was detected on de-assigned sensor{' '}
              <code>{unassignedNotice.sensor_id}</code> at {new Date(unassignedNotice.timestamp).toLocaleTimeString()}.
              This sensor is currently not associated with any room.
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <button
              onClick={() => setIsSensorModalOpen(true)}
              style={{
                background: '#f59e0b',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '0.25rem 0.65rem',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Assign to a Room
            </button>
            <button
              onClick={() => setUnassignedNotice(null)}
              style={{ background: 'transparent', border: 'none', color: '#92400e', cursor: 'pointer' }}
            >
              <X size={15} />
            </button>
          </div>
        </div>
      )}

      <main className="dashboard-grid" style={{ flex: 1, width: '100%' }}>
        {/* Top Metric Cards (Span 12 cols) */}
        <div style={{ gridColumn: 'span 12' }}>
          <SummaryStats summary={summary} anomalyCount={anomalies.length} />
        </div>

        {/* Left Column: Live Radar & Anomaly Feed (Span 4 cols) */}
        <div style={{ gridColumn: 'span 4', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <MotionRadar 
            latestEvent={latestEvent} 
            selectedRoom={selectedRoom}
            assignedSensor={assignedSensor}
            primarySensor={primarySensor}
            onAssignSensor={handleAssignSensor}
            onOpenSensorManager={() => setIsSensorModalOpen(true)}
          />
          <AnomalyFeed anomalies={anomalies} />
        </div>

        {/* Right Column: Comprehensive Room Activity History Explorer (Span 8 cols) */}
        <div style={{ gridColumn: 'span 8' }}>
          <ActivityHistory
            selectedRoom={selectedRoom}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            availableDates={availableDates}
            hourlyData={hourlyData}
            dailyTrendData={dailyTrendData}
            trendDays={trendDays}
            onSelectTrendDays={setTrendDays}
            daySummary={daySummary}
          />
        </div>

        {/* AI Intelligence Copilot (Full Width — 12 cols) */}
        <div style={{ gridColumn: 'span 12' }}>
          <AICopilot selectedRoom={selectedRoom} />
        </div>

        {/* Raw Event Logs with Date Filter & CSV Export (Full Width — 12 cols) */}
        <div style={{ gridColumn: 'span 12' }}>
          <EventLogTable 
            events={events} 
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
          />
        </div>
      </main>

      {/* Sensor Association & Hardware Manager Modal */}
      <SensorManagerModal
        isOpen={isSensorModalOpen}
        onClose={() => setIsSensorModalOpen(false)}
        sensors={sensors}
        rooms={rooms}
        onAssign={handleAssignSensor}
        onDeassign={handleDeassignSensor}
        onRegister={handleRegisterSensor}
        onDelete={handleDeleteSensor}
        onSimulateSensor={handleSimulateSensor}
        onSelectRoom={(room) => {
          setSelectedRoom(room);
          setSelectedDate(todayStr);
          setIsSensorModalOpen(false);
        }}
      />

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
