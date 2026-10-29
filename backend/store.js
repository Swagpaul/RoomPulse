import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_FILE = path.join(__dirname, 'data', 'db.json');
const SENSORS_FILE = path.join(__dirname, 'data', 'sensors.json');

// Ensure data directory exists
if (!fs.existsSync(path.join(__dirname, 'data'))) {
  fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });
}

// Single physical IoT sensor setup by default (strict 1 device = 1 room at any given time)
const DEFAULT_SENSORS = [
  {
    sensor_id: 'esp32-sensor-01',
    name: 'ESP32 PIR Sensor Setup',
    model: 'ESP32 + HC-SR501 PIR',
    thing_name: 'roompulse-room238',
    aliases: [
      'sensor_1',
      'swagata_room',
      'roompulse-room238',
      'room238',
      '301',
      'esp32-room238',
      'esp32-room301'
    ],
    room_id: 'room238',
    status: 'online',
    assigned_at: '2026-10-28T17:45:00.000Z',
    last_seen: new Date().toISOString()
  }
];

class EventStore {
  constructor() {
    this.events = [];
    this.sensors = [];
    this.loadData();
    this.loadSensors();
    if (this.events.length === 0) {
      this.seedHistoricalData();
    }
  }

  loadData() {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.events = JSON.parse(raw);
        console.log(`[Store] Loaded ${this.events.length} historical events from storage.`);
      }
    } catch (err) {
      console.error('[Store] Error loading db.json, starting fresh:', err.message);
      this.events = [];
    }
  }

  saveData() {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.events, null, 2), 'utf-8');
    } catch (err) {
      console.error('[Store] Error writing to db.json:', err.message);
    }
  }

  /* ==========================================================================
     SENSOR & ROOM MANUAL ASSOCIATION SYSTEM
     ========================================================================== */

  loadSensors() {
    try {
      if (fs.existsSync(SENSORS_FILE)) {
        const raw = fs.readFileSync(SENSORS_FILE, 'utf-8');
        this.sensors = JSON.parse(raw);
        console.log(`[Store] Loaded ${this.sensors.length} registered IoT sensors.`);
      } else {
        console.log('[Store] Initializing default sensor registry with 1 physical IoT setup...');
        this.sensors = JSON.parse(JSON.stringify(DEFAULT_SENSORS));
        this.saveSensors();
      }
    } catch (err) {
      console.error('[Store] Error loading sensors.json, initializing defaults:', err.message);
      this.sensors = JSON.parse(JSON.stringify(DEFAULT_SENSORS));
      this.saveSensors();
    }
  }

  saveSensors() {
    try {
      fs.writeFileSync(SENSORS_FILE, JSON.stringify(this.sensors, null, 2), 'utf-8');
    } catch (err) {
      console.error('[Store] Error writing to sensors.json:', err.message);
    }
  }

  getAllSensors() {
    return this.sensors;
  }

  getSensor(sensorId) {
    if (!sensorId) {
      return this.sensors[0] || null;
    }
    const query = String(sensorId).trim().toLowerCase();
    const match = this.sensors.find(s => {
      if (s.sensor_id && s.sensor_id.toLowerCase() === query) return true;
      if (s.thing_name && s.thing_name.toLowerCase() === query) return true;
      if (Array.isArray(s.aliases) && s.aliases.some(a => a.toLowerCase() === query)) return true;
      return false;
    });

    // If only 1 physical device setup is in the system, any device traffic routes to it
    if (!match && this.sensors.length === 1) {
      return this.sensors[0];
    }
    return match || null;
  }

  getSensorByRoom(roomId) {
    if (!roomId) return null;
    let normalized = String(roomId).trim();
    if (!normalized.startsWith('room')) normalized = `room${normalized}`;
    return this.sensors.find(s => s.room_id === normalized) || null;
  }

  /**
   * Manually associate a sensor / IoT setup with a particular room.
   * Strict 1:1 rule: A physical device can only be in one room at any time.
   */
  assignSensor(sensorId, roomId) {
    let sensor = this.getSensor(sensorId) || this.sensors[0];
    if (!sensor) return null;

    let normalizedRoom = String(roomId).trim();
    if (!normalizedRoom.startsWith('room')) {
      normalizedRoom = `room${normalizedRoom}`;
    }

    // Mutual exclusivity: A room can only have 1 device placed in it at a given time
    this.sensors.forEach(other => {
      if (other.sensor_id !== sensor.sensor_id && other.room_id === normalizedRoom) {
        other.room_id = null;
        other.assigned_at = null;
        other.status = 'unassigned';
      }
    });

    sensor.room_id = normalizedRoom;
    sensor.assigned_at = new Date().toISOString();
    sensor.status = 'online';
    this.saveSensors();
    console.log(`[Store] Sensor "${sensor.sensor_id}" manually assigned to "${normalizedRoom}".`);
    return sensor;
  }

  /**
   * Manually de-assign a sensor / IoT setup so it can be associated with another room
   */
  deassignSensor(sensorId) {
    let sensor = this.getSensor(sensorId) || this.sensors[0];
    if (!sensor) return null;

    const previousRoom = sensor.room_id;
    sensor.room_id = null;
    sensor.assigned_at = null;
    sensor.status = 'unassigned';
    this.saveSensors();
    console.log(`[Store] Sensor "${sensor.sensor_id}" de-assigned from "${previousRoom || 'none'}". Now in unassigned standby pool.`);
    return sensor;
  }

  /**
   * Register or update a physical hardware sensor
   */
  registerSensor({ sensor_id, name, model, thing_name, room_id }) {
    if (!sensor_id) throw new Error('sensor_id is required');
    const existing = this.getSensor(sensor_id);
    let normalizedRoom = room_id ? String(room_id).trim() : null;
    if (normalizedRoom && !normalizedRoom.startsWith('room')) {
      normalizedRoom = `room${normalizedRoom}`;
    }

    if (existing) {
      existing.name = name || existing.name;
      existing.model = model || existing.model;
      existing.thing_name = thing_name || existing.thing_name;
      if (normalizedRoom !== undefined) {
        existing.room_id = normalizedRoom;
        existing.assigned_at = normalizedRoom ? new Date().toISOString() : null;
        existing.status = normalizedRoom ? 'online' : 'unassigned';
      }
      this.saveSensors();
      return existing;
    }

    const newSensor = {
      sensor_id: String(sensor_id).trim(),
      name: name || `Sensor ${sensor_id}`,
      model: model || 'ESP32 + HC-SR501 PIR',
      thing_name: thing_name || `roompulse-${sensor_id}`,
      aliases: [sensor_id],
      room_id: normalizedRoom,
      status: normalizedRoom ? 'online' : 'unassigned',
      assigned_at: normalizedRoom ? new Date().toISOString() : null,
      last_seen: null
    };

    this.sensors.push(newSensor);
    this.saveSensors();
    console.log(`[Store] Registered new sensor: ${newSensor.sensor_id}`);
    return newSensor;
  }

  deleteSensor(sensorId) {
    const idx = this.sensors.findIndex(s => s.sensor_id === sensorId || s.thing_name === sensorId);
    if (idx === -1) return false;
    this.sensors.splice(idx, 1);
    this.saveSensors();
    return true;
  }

  /**
   * Insert a new event into storage
   * Resolves target room strictly from where the sensor is currently placed!
   */
  addEvent(payload) {
    let sensorId = payload.sensor_id || payload.device_id || payload.thing_name || null;
    let explicitRoomId = payload.room_id ? String(payload.room_id).trim() : null;

    // Resolve the physical sensor
    let matchedSensor = this.getSensor(sensorId);

    let roomId = null;
    let isUnassigned = false;

    if (matchedSensor) {
      sensorId = matchedSensor.sensor_id;
      matchedSensor.last_seen = new Date().toISOString();

      if (matchedSensor.room_id) {
        // Physical sensor placement dictates the target room
        roomId = matchedSensor.room_id;
        matchedSensor.status = 'online';
      } else {
        // Sensor is currently in standby (de-assigned / not placed in any room)
        isUnassigned = true;
        roomId = null;
      }
      this.saveSensors();
    } else if (explicitRoomId) {
      let s = explicitRoomId;
      roomId = s.startsWith('room') ? s : `room${s}`;
    } else {
      roomId = 'room238';
    }

    const serverTimestamp = payload.timestamp || new Date().toISOString();

    const eventItem = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      room_id: roomId,
      sensor_id: sensorId || 'esp32-sensor-01',
      event: payload.event || 'motion_detected',
      timestamp: serverTimestamp,
      device_timestamp_ms: payload.timestamp_ms || null,
      duration_ms: payload.duration_ms || null,
      unassigned: isUnassigned
    };

    if (roomId && !isUnassigned) {
      this.events.push(eventItem);
      this.saveData();
    }

    return eventItem;
  }

  getEvents(roomId, startIso, endIso) {
    let normalizedId = String(roomId);
    if (!normalizedId.startsWith('room')) {
      normalizedId = `room${normalizedId}`;
    }

    return this.events.filter(e => {
      if (e.room_id !== normalizedId) return false;
      if (startIso && new Date(e.timestamp) < new Date(startIso)) return false;
      if (endIso && new Date(e.timestamp) > new Date(endIso)) return false;
      return true;
    }).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  getAllRooms() {
    const set = new Set();
    // Default baseline demo rooms
    set.add('room238');
    set.add('room301');

    // Add rooms from recorded events
    this.events.forEach(e => {
      if (e.room_id) set.add(e.room_id);
    });
    // Add rooms from current sensor associations
    this.sensors.forEach(s => {
      if (s.room_id) set.add(s.room_id);
    });

    return Array.from(set).sort();
  }

  seedHistoricalData() {
    console.log('[Store] Seeding 7 days of realistic motion data...');
    const now = new Date();
    const rooms = ['room238', 'room301'];

    for (let dayOffset = 7; dayOffset >= 0; dayOffset--) {
      const baseDate = new Date(now.getTime() - dayOffset * 86400000);
      
      rooms.forEach(room => {
        for (let hour = 0; hour < 24; hour++) {
          let activityProbability = 0.05;
          if (hour >= 8 && hour <= 18) {
            activityProbability = 0.75;
          }

          const isAnomalyTime = (dayOffset === 2 && hour === 2);

          if (Math.random() < activityProbability || isAnomalyTime) {
            const eventCount = isAnomalyTime ? 12 : Math.floor(Math.random() * 6) + 1;
            
            for (let k = 0; k < eventCount; k++) {
              const minute = Math.floor(Math.random() * 50);
              const second = Math.floor(Math.random() * 50);
              
              const eventTime = new Date(baseDate);
              eventTime.setHours(hour, minute, second, 0);

              const duration = Math.floor(Math.random() * 8000) + 1500;
              const detectedTime = eventTime.toISOString();
              const clearedTime = new Date(eventTime.getTime() + duration).toISOString();

              this.events.push({
                id: `evt_seed_${room}_${dayOffset}_${hour}_${k}_d`,
                room_id: room,
                sensor_id: 'esp32-sensor-01',
                event: 'motion_detected',
                timestamp: detectedTime,
                device_timestamp_ms: 100000 + (hour * 3600000) + (minute * 60000),
                duration_ms: null
              });

              this.events.push({
                id: `evt_seed_${room}_${dayOffset}_${hour}_${k}_c`,
                room_id: room,
                sensor_id: 'esp32-sensor-01',
                event: 'motion_cleared',
                timestamp: clearedTime,
                device_timestamp_ms: 100000 + (hour * 3600000) + (minute * 60000) + duration,
                duration_ms: duration
              });
            }
          }
        }
      });
    }

    this.events.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    this.saveData();
    console.log(`[Store] Successfully seeded ${this.events.length} historical events.`);
  }
}

export const store = new EventStore();
