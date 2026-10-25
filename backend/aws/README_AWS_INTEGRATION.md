# RoomPulse — AWS Integration Guide

## Recommended setup when the ESP32 belongs to another laptop

Use the other laptop as an MQTT-to-HTTP bridge:

```text
ESP32 -> AWS IoT Core -> friend's laptop (MQTT subscriber)
                              -> your laptop /api/events
                              -> dashboard WebSocket -> frontend
```

This avoids exposing your backend to the internet and does not require an AWS IoT
HTTP rule. The bridge uses the same AWS IoT certificate files that are already
working for your friend.

### 1. Start RoomPulse on your laptop

On your laptop, run:

```powershell
cd "d:\Vit vellore\cloud computing\RoomPulse\backend"
npm install
npm start
```

Find your laptop's Wi-Fi IPv4 address:

```powershell
ipconfig
```

Use the `IPv4 Address` from the active Wi-Fi adapter, for example
`192.168.1.25`. Verify from your laptop:

```powershell
curl.exe http://localhost:5000/health
```

Allow the backend through Windows Firewall once, in an Administrator PowerShell:

```powershell
New-NetFirewallRule -DisplayName "RoomPulse backend 5000" -Direction Inbound -Protocol TCP -LocalPort 5000 -Action Allow
```

Your friend must be able to open this URL from their laptop:

```text
http://YOUR_LAPTOP_IPV4:5000/health
```

It must return `{"status":"online",...}` before continuing. Both laptops must
be on the same Wi-Fi network. Do not use `localhost` in the friend's bridge
configuration.

### 2. Install the bridge on your friend's laptop

Copy this repository's `backend` folder to the friend's laptop, or copy
`backend/aws/iot-bridge.mjs` there. In that folder run:

```powershell
npm install
npm install mqtt
```

The bridge is implemented in [`iot-bridge.mjs`](./iot-bridge.mjs).

### 3. Configure the friend's AWS certificate paths

In PowerShell on the friend's laptop, replace every value in this example:

```powershell
$env:AWS_IOT_ENDPOINT = "xxxxxxxxxxxx-ats.iot.ap-south-1.amazonaws.com"
$env:AWS_IOT_CA_PATH = "C:\iot-certs\AmazonRootCA1.pem"
$env:AWS_IOT_CERT_PATH = "C:\iot-certs\device-certificate.pem.crt"
$env:AWS_IOT_KEY_PATH = "C:\iot-certs\private.pem.key"
$env:AWS_IOT_TOPIC = "roompulse/+/motion"
$env:AWS_IOT_CLIENT_ID = "roompulse-friend-bridge"
$env:ROOMPULSE_BACKEND_URL = "http://YOUR_LAPTOP_IPV4:5000"
```

`AWS_IOT_ENDPOINT` is the AWS IoT Core endpoint, not the Thing name. It can
usually be found in AWS IoT Core → Settings. Use the exact certificate and
private-key files that the working ESP32/AWS setup uses. Never commit or share
the private key.

### 4. Start the bridge

From the folder containing `iot-bridge.mjs`:

```powershell
npm run iot:bridge
```

Expected output:

```text
[Bridge] Connected to AWS IoT Core: ...
[Bridge] Subscribed to roompulse/+/motion
[Bridge] Forwarding events to http://YOUR_LAPTOP_IPV4:5000/api/events
```

Now trigger the sensor. The friend's terminal should show:

```text
[Bridge] Forwarded room238 -> motion_detected
```

Your backend terminal should show `[Ingest Hit]`, and the event should appear
in the frontend without refreshing.

### 5. Test without moving the sensor

From the friend's laptop, after the bridge is running, publish a test message
using AWS IoT Core's MQTT test client to:

```text
roompulse/room238/motion
```

Use this JSON:

```json
{
  "room_id": "room238",
  "event": "motion_detected",
  "timestamp_ms": 123456
}
```

Then verify on your laptop:

```powershell
curl.exe http://localhost:5000/rooms/room238/events
```

The event should also appear in the RoomPulse dashboard.

### Troubleshooting

- `ECONNREFUSED`: the backend is not running, the IP is wrong, or Windows
  Firewall is blocking TCP port 5000.
- `Not authorized` from AWS: the certificate policy does not allow
  `iot:Connect` and `iot:Subscribe` for the bridge client/topic. Add those
  permissions or use a certificate policy intended for a subscriber.
- `Could not read ... certificate`: the path is wrong; use an absolute Windows
  path and confirm the file exists.
- The bridge connects but receives nothing: verify the exact topic and that
  the IoT policy allows subscribing to `roompulse/+/motion`.
- The event reaches the backend but not the dashboard: keep the frontend
  pointed at `http://localhost:5000`, reload the page, and check its browser
  console for a WebSocket connection error.

When your friend arrives with the AWS IoT Core setup, follow these simple steps to bridge AWS to the Backend & Frontend dashboard!

---

## ⚡ Option 1: Direct HTTP Rule (Fastest — 2 Minutes, Zero Extra AWS Infrastructure)

If your local backend is running (or hosted on ngrok/Vercel/EC2), connect AWS IoT Core directly:

1. Go to **AWS Console** → **AWS IoT Core** → **Message Routing** → **Rules**.
2. Click **Create Rule**.
3. **Name**: `RoomPulseForwardingRule`
4. **SQL Statement**:
   ```sql
   SELECT * FROM 'roompulse/+/motion'
   ```
5. **Action**: Select **HTTP Webhook**.
6. **Endpoint URL**: `http://YOUR_BACKEND_IP:5000/api/events` (or ngrok public URL).
7. **HTTP Method**: `POST`
8. Click **Save & Enable**.

*Done! Every motion event published by the ESP32 will instantly flow into the backend and update the live dashboard!*

---

## ☁️ Option 2: AWS Lambda + DynamoDB Setup (Pure AWS Cloud Deployment)

1. Create a DynamoDB table named `RoomPulseEvents`:
   - **Partition Key**: `room_id` (String)
   - **Sort Key**: `timestamp` (String)
2. Create Lambda Function using `ingest_lambda.py`.
3. Set Environment Variable: `DYNAMODB_TABLE = RoomPulseEvents`.
4. Create AWS IoT Rule triggering the Lambda for topic `roompulse/+/motion`.

---

## 📡 API Contract Test (Verification)

Test if backend API endpoints match expectations:

```bash
# 1. Fetch raw events
curl http://localhost:5000/rooms/room238/events

# 2. Fetch hourly activity counts
curl http://localhost:5000/rooms/room238/activity/hourly?date=2026-10-07

# 3. Fetch activity summary
curl http://localhost:5000/rooms/room238/activity/summary?range=week

# 4. Fetch Z-score anomalies
curl http://localhost:5000/rooms/room238/anomalies?range=week
```
