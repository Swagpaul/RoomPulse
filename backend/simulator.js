import http from 'http';

const SERVER_URL = 'http://localhost:5000/api/events';
const ROOMS = ['room238', 'room301'];

console.log('🤖 RoomPulse ESP32 Sensor Simulator Started!');
console.log('Press Ctrl+C to stop.\n');

let isMotionActive = false;
let currentRoom = 'room238';
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
      console.log(`[Simulator Sent] ${payload.room_id} -> ${payload.event} (Device millis: ${payload.timestamp_ms}ms)`);
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
  currentRoom = ROOMS[Math.floor(Math.random() * ROOMS.length)];

  if (!isMotionActive) {
    // 60% chance to trigger motion
    if (Math.random() < 0.6) {
      isMotionActive = true;
      sendEvent({
        room_id: currentRoom,
        event: 'motion_detected',
        timestamp_ms: deviceUptimeMs
      });

      // Schedule motion_cleared after 2-6 seconds
      const duration = Math.floor(Math.random() * 4000) + 2000;
      setTimeout(() => {
        deviceUptimeMs += duration;
        sendEvent({
          room_id: currentRoom,
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
