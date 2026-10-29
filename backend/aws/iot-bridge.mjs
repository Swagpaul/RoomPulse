import fs from 'node:fs';
import process from 'node:process';
import mqtt from 'mqtt';

const required = [
  'AWS_IOT_ENDPOINT',
  'AWS_IOT_CA_PATH',
  'AWS_IOT_CERT_PATH',
  'AWS_IOT_KEY_PATH',
  'ROOMPULSE_BACKEND_URL'
];

const missing = required.filter((name) => !process.env[name]);
if (missing.length > 0) {
  console.error(`Missing environment variables: ${missing.join(', ')}`);
  process.exit(1);
}

const endpoint = process.env.AWS_IOT_ENDPOINT
  .replace(/^mqtts?:\/\//, '')
  .replace(/\/+$/, '');
const topic = process.env.AWS_IOT_TOPIC || 'roompulse/+/motion';
const backendUrl = `${process.env.ROOMPULSE_BACKEND_URL.replace(/\/+$/, '')}/api/events`;

function readCertificate(path, name) {
  try {
    return fs.readFileSync(path);
  } catch (error) {
    console.error(`Could not read ${name} at "${path}": ${error.message}`);
    process.exit(1);
  }
}

const client = mqtt.connect(`mqtts://${endpoint}:8883`, {
  protocolVersion: 4,
  ca: readCertificate(process.env.AWS_IOT_CA_PATH, 'AWS IoT CA certificate'),
  cert: readCertificate(process.env.AWS_IOT_CERT_PATH, 'device certificate'),
  key: readCertificate(process.env.AWS_IOT_KEY_PATH, 'private key'),
  clientId: process.env.AWS_IOT_CLIENT_ID || `roompulse-bridge-${Date.now()}`,
  reconnectPeriod: 3000,
  connectTimeout: 10000
});

client.on('connect', () => {
  console.log(`[Bridge] Connected to AWS IoT Core: ${endpoint}`);
  client.subscribe(topic, { qos: 1 }, (error) => {
    if (error) {
      console.error(`[Bridge] Subscribe failed for "${topic}": ${error.message}`);
      return;
    }
    console.log(`[Bridge] Subscribed to ${topic}`);
    console.log(`[Bridge] Forwarding events to ${backendUrl}`);
  });
});

client.on('reconnect', () => console.log('[Bridge] Reconnecting to AWS IoT Core...'));
client.on('error', (error) => console.error(`[Bridge] MQTT error: ${error.message}`));

client.on('message', async (receivedTopic, buffer) => {
  let payload;
  try {
    payload = JSON.parse(buffer.toString('utf8'));
  } catch (error) {
    console.error(`[Bridge] Ignoring non-JSON message on ${receivedTopic}: ${error.message}`);
    return;
  }

  // Extract sensor_id from payload, or derive from MQTT topic (e.g. roompulse/room238/motion)
  if (!payload.sensor_id && !payload.device_id) {
    const parts = receivedTopic.split('/');
    if (parts.length >= 2 && parts[1] !== '+') {
      payload.sensor_id = parts[1];
    }
  }

  if (!payload.event) {
    console.error('[Bridge] Ignoring message without event:', payload);
    return;
  }

  try {
    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const responseText = await response.text();
      console.error(`[Bridge] Backend returned HTTP ${response.status}: ${responseText}`);
      return;
    }

    const data = await response.json();
    if (data.status === 'unassigned_sensor') {
      console.log(`[Bridge] ⚠️ Event from sensor ${payload.sensor_id} received, but sensor is DE-ASSIGNED from all rooms.`);
    } else {
      console.log(`[Bridge] Forwarded ${payload.sensor_id || payload.room_id} -> Room ${data.event?.room_id}: ${payload.event}`);
    }
  } catch (error) {
    console.error(`[Bridge] Could not reach backend at ${backendUrl}: ${error.message}`);
  }
});

function shutdown() {
  client.end(false, {}, () => {
    console.log('[Bridge] Disconnected.');
    process.exit(0);
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
