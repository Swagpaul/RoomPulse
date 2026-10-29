import http from 'http';

const SERVER_URL = 'http://localhost:5000/api/events';
const SENSORS = ['esp32-room238', 'esp32-room301'];

console.log('🤖 RoomPulse ESP32 Sensor Simulator Started!');
console.log('Emitting simulated motion events from registered IoT sensor setups.');
console.log('Events are automatically routed to rooms according to manual associations in RoomPulse.');
console.log('Press Ctrl+C to stop.\n');

let isMotionActive = false;
let currentSensor = 'esp32-room238';
let deviceUptimeMs = 120000;

function sendEvent(payload) {
  const data = JSON.stringify(payload);
  const req = http.request(SERVER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data)
    }
  }, (res) => {
    let responseData = '';
    res.on('data', chunk => responseData += chunk);
    res.on('end', () => {
      try {
        const json = JSON.parse(responseData);
        if (json.status === 'unassigned_sensor') {
          console.log(`[Simulator] ⚠️ Sensor ${payload.sensor_id} is DE-ASSIGNED. Association needed.`);
        } else {
          console.log(`[Simulator Sent] Sensor ${payload.sensor_id} -> Room ${json.event?.room_id || 'N/A'}: ${payload.event} (${payload.timestamp_ms}ms uptime)`);
        }
      } catch (e) {
        console.log(`[Simulator Sent] Sensor ${payload.sensor_id} -> ${payload.event}`);
      }
    });
  });

  req.on('error', (err) => {
    console.error(`[Simulator Error] Could not connect to backend at ${SERVER_URL}. Is server running?`);
  });

  req.write(data);
  req.end();
}

function simulateStep() {
  deviceUptimeMs += 5000;
  currentSensor = SENSORS[Math.floor(Math.random() * SENSORS.length)];

  if (!isMotionActive) {
    // 60% chance to trigger motion
    if (Math.random() < 0.6) {
      isMotionActive = true;
      sendEvent({
        sensor_id: currentSensor,
        event: 'motion_detected',
        timestamp_ms: deviceUptimeMs
      });

      // Schedule motion_cleared after 2-6 seconds
      const duration = Math.floor(Math.random() * 4000) + 2000;
      setTimeout(() => {
        deviceUptimeMs += duration;
        sendEvent({
          sensor_id: currentSensor,
          event: 'motion_cleared',
          timestamp_ms: deviceUptimeMs,
          duration_ms: duration
        });
        isMotionActive = false;
      }, duration);
    }
  }
}

// Run simulation loop every 7 seconds
setInterval(simulateStep, 7000);
