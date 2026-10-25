import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_FILE = path.join(__dirname, 'data', 'db.json');

// Ensure data directory exists
if (!fs.existsSync(path.join(__dirname, 'data'))) {
  fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });
}

class EventStore {
  constructor() {
    this.events = [];
    this.loadData();
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

  /**
   * Insert a new event into storage
   * Stamping server-side UTC wall-clock timestamp per cloud.md requirements
   */
  addEvent(payload) {
    // Normalize room_id: handle "301" vs "room301" or "room238"
    let roomId = String(payload.room_id || 'room238');
    if (!roomId.startsWith('room')) {
      roomId = `room${roomId}`;
    }

    const serverTimestamp = payload.timestamp || new Date().toISOString();
    
    const eventItem = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      room_id: roomId,
      event: payload.event, // "motion_detected" or "motion_cleared"
      timestamp: serverTimestamp, // ISO 8601 UTC
      device_timestamp_ms: payload.timestamp_ms || null,
      duration_ms: payload.duration_ms || null
    };

    this.events.push(eventItem);
    this.saveData();
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
    const set = new Set(this.events.map(e => e.room_id));
    if (set.size === 0) {
      set.add('room238');
      set.add('room301');
    }
    return Array.from(set);
  }

  /**
   * Seeds 7 days of realistic motion data for room238 and room301
   * includes typical work hours (8 AM - 6 PM) and occasional nighttime anomalies (2 AM)
   */
  seedHistoricalData() {
    console.log('[Store] Seeding 7 days of realistic motion data...');
    const now = new Date();
    const rooms = ['room238', 'room301'];

    for (let dayOffset = 7; dayOffset >= 0; dayOffset--) {
      const baseDate = new Date(now.getTime() - dayOffset * 86400000);
      
      rooms.forEach(room => {
        // Generate normal day activity (8 AM to 6 PM)
        for (let hour = 0; hour < 24; hour++) {
          let activityProbability = 0.05; // 5% chance during off hours
          if (hour >= 8 && hour <= 18) {
            activityProbability = 0.75; // 75% chance during active hours
          }

          // Force an anomaly on 3 days ago at 02:00 AM for testing Z-score anomaly detection!
          const isAnomalyTime = (dayOffset === 2 && hour === 2);

          if (Math.random() < activityProbability || isAnomalyTime) {
            const eventCount = isAnomalyTime ? 12 : Math.floor(Math.random() * 6) + 1;
            
            for (let k = 0; k < eventCount; k++) {
              const minute = Math.floor(Math.random() * 50);
              const second = Math.floor(Math.random() * 50);
              
              const eventTime = new Date(baseDate);
              eventTime.setHours(hour, minute, second, 0);

              const duration = Math.floor(Math.random() * 8000) + 1500; // 1.5s - 9.5s
              
              const detectedTime = eventTime.toISOString();
              const clearedTime = new Date(eventTime.getTime() + duration).toISOString();

              this.events.push({
                id: `evt_seed_${room}_${dayOffset}_${hour}_${k}_d`,
                room_id: room,
                event: 'motion_detected',
                timestamp: detectedTime,
                device_timestamp_ms: 100000 + (hour * 3600000) + (minute * 60000),
                duration_ms: null
              });

              this.events.push({
                id: `evt_seed_${room}_${dayOffset}_${hour}_${k}_c`,
                room_id: room,
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

    // Sort by timestamp
    this.events.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    this.saveData();
    console.log(`[Store] Successfully seeded ${this.events.length} historical events.`);
  }
}

export const store = new EventStore();
