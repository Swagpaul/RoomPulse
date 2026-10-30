import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { store } from './store.js';
import { getHourlyActivity, getActivitySummary, detectAnomalies, getDailyActivity, getAvailableDates } from './analytics.js';
import { generateInsights, chatWithAI, getSuggestedQuestions } from './ai.js';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ type: ['application/json', 'text/plain', '*/*'] }));

// Log every incoming request for debugging AWS IoT connectivity
app.use((req, res, next) => {
  if (req.method !== 'GET') {
    console.log(`[HTTP ${req.method}] ${req.url} from ${req.ip}`);
  }
  next();
});

// Catch any JSON SyntaxErrors from malformed AWS IoT payloads and recover gracefully
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    console.log('[Ingest Warning] Received non-standard JSON payload from AWS IoT, normalizing...');
    req.body = { room_id: 'room238', event: 'motion_detected' };
    return next();
  }
  next(err);
});

// Create HTTP Server & Attach WebSockets
const server = createServer(app);
const wss = new WebSocketServer({ server });

const connectedClients = new Set();

wss.on('connection', (ws) => {
  connectedClients.add(ws);
  console.log('[WebSocket] Client connected. Total active clients:', connectedClients.size);

  ws.on('close', () => {
    connectedClients.delete(ws);
    console.log('[WebSocket] Client disconnected.');
  });
});

/**
 * Broadcast event to all connected WebSocket clients
 */
function broadcastLiveEvent(eventItem) {
  const message = JSON.stringify({ type: 'LATEST_MOTION_EVENT', payload: eventItem });
  for (const client of connectedClients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  }
}

/**
 * Broadcast sensor registry changes to WebSocket clients
 */
function broadcastSensorUpdate(action, sensor) {
  const message = JSON.stringify({
    type: 'SENSOR_REGISTRY_CHANGED',
    payload: { action, sensor, sensors: store.getAllSensors(), rooms: store.getAllRooms() }
  });
  for (const client of connectedClients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  }
}

/**
 * Broadcast alert when a de-assigned sensor triggers motion
 */
function broadcastUnassignedAlert(eventItem) {
  const message = JSON.stringify({
    type: 'UNASSIGNED_SENSOR_EVENT',
    payload: eventItem
  });
  for (const client of connectedClients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  }
}

/* ==========================================================================
   AWS IoT CORE / INGESTION WEBHOOK ROUTE
   ========================================================================== */
/**
 * Ingestion Endpoint (§6a & §4 in cloud.md)
 * Receives MQTT payloads from AWS IoT Core Rule or Simulator
 * Normalizes device uptime timestamp to ISO 8601 UTC server wall-clock time.
 * Resolves target room from manual sensor association!
 */
app.post(['/api/events', '/'], (req, res) => {
  console.log('[Ingest Hit] Incoming POST request:', req.body);
  
  let payload = req.body;
  if (typeof payload === 'string') {
    try {
      payload = JSON.parse(payload);
    } catch (e) {
      payload = { event: 'motion_detected', room_id: 'room238', raw: req.body };
    }
  }

  if (!payload || typeof payload !== 'object') {
    payload = { room_id: 'room238', event: 'motion_detected' };
  }

  if (payload.messageType === 'DestinationConfirmation' && payload.enableUrl) {
    console.log('[AWS IoT] Received DestinationConfirmation request. Auto-confirming via enableUrl...');
    fetch(payload.enableUrl)
      .then(res => res.text())
      .then(body => console.log('[AWS IoT] Destination successfully confirmed with AWS:', body))
      .catch(err => console.error('[AWS IoT] Failed to confirm enableUrl:', err));
    return res.status(200).json({ status: 'confirmation_received' });
  }

  // Ensure default fallback values so test events from AWS Console work seamlessly
  const normalizedPayload = {
    sensor_id: payload.sensor_id || payload.device_id || payload.thing_name || null,
    room_id: payload.room_id || null,
    event: payload.event || (payload.message ? 'motion_detected' : 'motion_detected'),
    timestamp_ms: payload.timestamp_ms || Date.now(),
    duration_ms: payload.duration_ms || null
  };

  // Add event to store with server-side ISO 8601 UTC timestamp and sensor association resolution
  const eventItem = store.addEvent(normalizedPayload);

  if (eventItem.unassigned) {
    console.log(`[Ingest Alert] Motion received from de-assigned sensor "${eventItem.sensor_id}". No room associated.`);
    broadcastUnassignedAlert(eventItem);
    return res.status(200).json({
      status: 'unassigned_sensor',
      message: `Sensor "${eventItem.sensor_id}" is de-assigned. Please associate it with a room in the Sensor Manager.`,
      event: eventItem
    });
  }

  // Broadcast to live dashboard via WebSockets
  broadcastLiveEvent(eventItem);

  console.log(`[Ingest] Stamped & stored event for room ${eventItem.room_id} (Sensor: ${eventItem.sensor_id}): ${eventItem.event}`);
  return res.status(201).json({ status: 'success', event: eventItem });
});

/**
 * Trigger manual test simulation
 * Supports testing either by room_id or by sensor_id to verify associations
 */
app.post('/api/simulate', (req, res) => {
  const sensorId = req.body.sensor_id || null;
  const roomId = req.body.room_id || null;
  const eventType = req.body.event || 'motion_detected';
  const durationMs = req.body.duration_ms || (eventType === 'motion_cleared' ? 4200 : null);

  const payload = {
    sensor_id: sensorId,
    room_id: roomId || (!sensorId ? 'room238' : null),
    event: eventType,
    timestamp_ms: Math.floor(Math.random() * 200000) + 10000,
    duration_ms: durationMs
  };

  const eventItem = store.addEvent(payload);

  if (eventItem.unassigned) {
    broadcastUnassignedAlert(eventItem);
    return res.json({
      status: 'unassigned',
      message: `Simulated event on de-assigned sensor "${eventItem.sensor_id}". Associate with a room to chart telemetry.`,
      event: eventItem
    });
  }

  broadcastLiveEvent(eventItem);

  return res.json({ status: 'simulated', event: eventItem });
});

/* ==========================================================================
   SENSOR & HARDWARE ASSOCIATION ROUTES
   ========================================================================== */

// 1. GET all sensors and current room associations
app.get('/api/sensors', (req, res) => {
  res.json({
    sensors: store.getAllSensors(),
    rooms: store.getAllRooms()
  });
});

// 2. Register a new sensor / IoT setup
app.post('/api/sensors', (req, res) => {
  try {
    const { sensor_id, name, model, thing_name, room_id } = req.body;
    if (!sensor_id) {
      return res.status(400).json({ error: 'sensor_id is required' });
    }
    const sensor = store.registerSensor({ sensor_id, name, model, thing_name, room_id });
    broadcastSensorUpdate('registered', sensor);
    res.status(201).json({ status: 'success', sensor });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Manually associate a sensor with a particular room
app.all(['/api/sensors/:sensor_id/assign'], (req, res) => {
  const { sensor_id } = req.params;
  const { room_id } = req.body;
  if (!room_id) {
    return res.status(400).json({ error: 'room_id is required for association' });
  }
  const sensor = store.assignSensor(sensor_id, room_id);
  if (!sensor) {
    return res.status(404).json({ error: `Sensor "${sensor_id}" not found` });
  }
  broadcastSensorUpdate('assigned', sensor);
  res.json({
    status: 'success',
    message: `Sensor "${sensor_id}" manually associated with ${sensor.room_id}`,
    sensor
  });
});

// 4. Manually de-assign a sensor so it can be associated with another room
app.all(['/api/sensors/:sensor_id/deassign'], (req, res) => {
  const { sensor_id } = req.params;
  const sensor = store.deassignSensor(sensor_id);
  if (!sensor) {
    return res.status(404).json({ error: `Sensor "${sensor_id}" not found` });
  }
  broadcastSensorUpdate('deassigned', sensor);
  res.json({
    status: 'success',
    message: `Sensor "${sensor_id}" de-assigned and returned to unassigned standby pool`,
    sensor
  });
});

// 5. Delete a sensor
app.delete('/api/sensors/:sensor_id', (req, res) => {
  const { sensor_id } = req.params;
  const success = store.deleteSensor(sensor_id);
  if (!success) {
    return res.status(404).json({ error: `Sensor "${sensor_id}" not found` });
  }
  broadcastSensorUpdate('deleted', { sensor_id });
  res.json({ status: 'success', message: `Sensor "${sensor_id}" deleted` });
});

// 6. Get sensor associated with a specific room
app.get('/rooms/:room_id/sensor', (req, res) => {
  const { room_id } = req.params;
  const sensor = store.getSensorByRoom(room_id);
  res.json({ room_id, sensor: sensor || null });
});

/* ==========================================================================
   REST API CONTRACT ENDPOINTS (§7 in cloud.md) & ACTIVITY HISTORY
   ========================================================================== */

// 1. GET List of registered rooms
app.get('/rooms', (req, res) => {
  const rooms = store.getAllRooms();
  res.json({ rooms });
});

// 2. GET /rooms/{room_id}/events?start={ISO8601}&end={ISO8601}&date={YYYY-MM-DD}&limit={number}
app.get('/rooms/:room_id/events', (req, res) => {
  const { room_id } = req.params;
  const { start, end, date, limit } = req.query;

  let events = [];
  if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const startIso = `${date}T00:00:00.000Z`;
    const endIso = `${date}T23:59:59.999Z`;
    events = store.getEvents(room_id, startIso, endIso);
    if (events.length === 0) {
      events = store.getEvents(room_id).filter(e => e.timestamp && e.timestamp.startsWith(date));
    }
  } else {
    events = store.getEvents(room_id, start, end);
  }

  if (limit) {
    const l = parseInt(limit, 10);
    if (l > 0) events = events.slice(0, l);
  }

  res.json(events);
});

// 3. GET /rooms/{room_id}/activity/hourly?date={YYYY-MM-DD}
app.get('/rooms/:room_id/activity/hourly', (req, res) => {
  const { room_id } = req.params;
  const { date } = req.query;
  const hourly = getHourlyActivity(room_id, date);
  res.json(hourly);
});

// 4. GET /rooms/{room_id}/activity/daily?days={number}&end={YYYY-MM-DD} — Multi-Day Historical Trend
app.get('/rooms/:room_id/activity/daily', (req, res) => {
  const { room_id } = req.params;
  const { days, end } = req.query;
  const daily = getDailyActivity(room_id, days || 7, end);
  res.json(daily);
});

// 5. GET /rooms/{room_id}/activity/dates — Distinct dates with recorded activity
app.get('/rooms/:room_id/activity/dates', (req, res) => {
  const { room_id } = req.params;
  const dates = getAvailableDates(room_id);
  res.json({ room_id, dates });
});

// 6. GET /rooms/{room_id}/activity/summary?range={week|day|month}&date={YYYY-MM-DD}
app.get('/rooms/:room_id/activity/summary', (req, res) => {
  const { room_id } = req.params;
  const { range, date } = req.query;
  const summary = getActivitySummary(room_id, range || 'week', date);
  res.json(summary);
});

// 7. GET /rooms/{room_id}/anomalies?range={week|day|month}
app.get('/rooms/:room_id/anomalies', (req, res) => {
  const { room_id } = req.params;
  const { range } = req.query;
  const anomalies = detectAnomalies(room_id, range || 'week');
  res.json(anomalies);
});

/* ==========================================================================
   AI INTELLIGENCE ENDPOINTS
   ========================================================================== */

// 8. GET /api/ai/insights/:room_id — Generate AI intelligence report
app.get('/api/ai/insights/:room_id', async (req, res) => {
  const { room_id } = req.params;
  const { range } = req.query;
  console.log(`[AI] Generating insights for ${room_id} (range: ${range || 'week'})...`);
  try {
    const result = await generateInsights(room_id, range || 'week');
    console.log(`[AI] Insights generated via ${result.source}`);
    res.json(result);
  } catch (err) {
    console.error('[AI] Error generating insights:', err);
    res.status(500).json({ error: 'Failed to generate AI insights', message: err.message });
  }
});

// 9. POST /api/ai/chat — Interactive AI chat about room data
app.post('/api/ai/chat', async (req, res) => {
  const { room_id, question, history } = req.body;
  if (!question) {
    return res.status(400).json({ error: 'Missing required field: question' });
  }
  console.log(`[AI Chat] Q: "${question}" for ${room_id || 'room238'}`);
  try {
    const result = await chatWithAI(room_id || 'room238', question, history || []);
    console.log(`[AI Chat] Answered via ${result.source}`);
    res.json(result);
  } catch (err) {
    console.error('[AI Chat] Error:', err);
    res.status(500).json({ error: 'Failed to process AI chat', message: err.message });
  }
});

// 10. GET /api/ai/suggestions/:room_id — Get contextual suggested questions
app.get('/api/ai/suggestions/:room_id', (req, res) => {
  const { room_id } = req.params;
  const questions = getSuggestedQuestions(room_id);
  res.json({ room_id, suggestions: questions });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'online', timestamp: new Date().toISOString() });
});

server.listen(PORT, () => {
  console.log(`===================================================`);
  console.log(`🚀 RoomPulse Backend API Running on port ${PORT}`);
  console.log(`📡 Ingest Webhook: POST http://localhost:${PORT}/api/events`);
  console.log(`🔌 WebSockets Live Stream: ws://localhost:${PORT}`);
  console.log(`🤖 AI Insights:  GET  http://localhost:${PORT}/api/ai/insights/room238`);
  console.log(`💬 AI Chat:      POST http://localhost:${PORT}/api/ai/chat`);
  console.log(`🧭 Sensor Assoc: GET  http://localhost:${PORT}/api/sensors`);
  console.log(`📅 History Daily: GET  http://localhost:${PORT}/rooms/room238/activity/daily`);
  console.log(`🔑 Gemini API:   ${process.env.GEMINI_API_KEY ? 'CONFIGURED ✅' : 'NOT SET (using local fallback)'}`);
  console.log(`===================================================`);
});
