# RoomPulse

RoomPulse is a privacy-preserving room occupancy monitoring system. It uses anonymous motion events from an ESP32 and PIR sensor to provide a live React dashboard, backend analytics, anomaly detection, manual sensor-to-room association, room activity history exploration, and optional AWS IoT integration.

RoomPulse does not use cameras, microphones, or identity data.

## Features

- Live room occupancy and motion activity dashboard
- **Room Activity History Explorer**: Browse activities beyond just 24 hours:
  - **Date Navigator & Quick Presets**: Stepper navigation, "Today (Live)", "Yesterday", date picker calendar, and jump to dates with recorded telemetry.
  - **24-Hour Day Detail**: Deep-dive into any past day with a 24-hour activity density heatmap and hourly occupancy distribution.
  - **Multi-Day Trends (7D / 14D / 30D)**: Daily activity trend bar chart showing session volume, daily averages, and busiest days over time with interactive drill-down.
  - **Historical Event Log & CSV Export**: Filter events by specific past dates or event types, with one-click CSV download.
- **Manual Sensor & Room Association**: Associate physical ESP32 PIR sensors to specific rooms on the fly.
- **Sensor De-assignment & Re-assignment**: De-assign sensors into a standby pool to relocate them between rooms anytime.
- Activity heatmap and hourly activity distribution charts.
- Motion event log with sensor source tracing.
- Z-score anomaly detection for unusual activity patterns.
- AI copilot interface for dashboard insights and queries.
- Local event simulator for development.
- AWS IoT MQTT bridge for forwarding device events.
- Server-side UTC timestamps for reliable event history.

## Project structure

```text
RoomPulse/
├── backend/
│   ├── aws/              # AWS IoT integration and ingest Lambda
│   ├── data/             # Local event data and sensor registry (db.json, sensors.json)
│   ├── ai.js             # AI insight helpers
│   ├── analytics.js      # Activity, daily trend, and anomaly analytics
│   ├── server.js         # Express API and WebSocket server
│   ├── simulator.js      # Local motion event simulator
│   └── store.js          # Event persistence & sensor association manager
├── frontend/
│   ├── src/              # React dashboard
│   │   ├── components/
│   │   │   ├── ActivityHistory.jsx    # Unified room activity history & date navigator
│   │   │   ├── DailyTrendChart.jsx    # 7D / 14D / 30D daily activity trend chart
│   │   │   ├── ActivityHeatmap.jsx    # 24-hour density heatmap (with historical date support)
│   │   │   ├── HourlyChart.jsx        # Hourly distribution chart (with historical date support)
│   │   │   ├── EventLogTable.jsx      # Telemetry stream with date filter & CSV export
│   │   │   ├── SensorManagerModal.jsx # Sensor association manager dialog
│   │   │   ├── MotionRadar.jsx        # Live radar with assigned sensor badge
│   │   │   └── ...
│   ├── public/           # Static assets
│   └── package.json
├── cloud.md              # Cloud architecture and integration guide
└── stop_start_cheatsheet.md
```

## Requirements

- Node.js 18 or newer
- npm
- Optional: AWS IoT Core credentials for hardware integration

## Installation

Install dependencies for both applications:

```bash
cd backend
npm install

cd ../frontend
npm install
```

## Running locally

Start the backend:

```bash
cd backend
npm start
```

Start the frontend in a second terminal:

```bash
cd frontend
npm run dev
```

The Vite development server will print the dashboard URL, normally `http://localhost:5173`.

To generate simulated motion events, run:

```bash
cd backend
npm run sim
```

## Room Activity History & Analytics APIs

The dashboard allows navigating past 24-hour cycles:

- `GET /rooms/:room_id/activity/daily?days={7|14|30}&end={YYYY-MM-DD}`: Returns daily session volume, active hours, peak hours, and busiest day across the specified time window.
- `GET /rooms/:room_id/activity/dates`: Returns a list of all distinct dates with recorded activity and session counts for that room.
- `GET /rooms/:room_id/activity/hourly?date={YYYY-MM-DD}`: Returns the 24-hour activity distribution for any specific date.
- `GET /rooms/:room_id/activity/summary?range={week|day|month}&date={YYYY-MM-DD}`: Returns total sessions, peak active hour, active hours count, average session duration, and anomalies for a range or single date.
- `GET /rooms/:room_id/events?date={YYYY-MM-DD}&limit={number}`: Returns raw telemetry events filtered by historical date.

## Sensor Association & Hardware Management

Sensors / IoT setups are decoupled from physical rooms:

- **Association**: In the dashboard, click **"Sensors & Setup"** in the top navbar to associate an IoT sensor (e.g. `esp32-sensor-01`) with any room (e.g. `room238`, `room301`, or a new custom room like `room104`).
- **De-assignment**: Click **"De-assign"** on any sensor card. The hardware is immediately detached from the room and returned to the unassigned standby pool. If motion is detected from a de-assigned sensor, the system alerts you and ignores the telemetry until it is re-associated.
- **Re-assignment / Relocation**: Select a target room from the dropdown and click **"Move / Re-assign"** to deploy the hardware in another room.

### Sensor API Endpoints

- `GET /api/sensors`: List all registered sensors, current room associations, and statuses.
- `POST /api/sensors`: Register a new sensor `{ sensor_id, name, model, thing_name, room_id }`.
- `POST /api/sensors/:sensor_id/assign`: Manually associate a sensor to a room `{ room_id }`.
- `POST /api/sensors/:sensor_id/deassign`: De-assign a sensor, placing it in the unassigned standby pool.
- `DELETE /api/sensors/:sensor_id`: Remove a sensor registration.
- `GET /rooms/:room_id/sensor`: Get the sensor currently associated with a given room.

## AWS IoT integration

The MQTT bridge subscribes to the configured AWS IoT topic and forwards validated events to the backend API. It requires these environment variables:

```text
AWS_IOT_ENDPOINT
AWS_IOT_CA_PATH
AWS_IOT_CERT_PATH
AWS_IOT_KEY_PATH
ROOMPULSE_BACKEND_URL
```

Optional variables:

```text
AWS_IOT_TOPIC=roompulse/+/motion
AWS_IOT_CLIENT_ID=roompulse-bridge
```

Run the bridge with:

```bash
cd backend
npm run iot:bridge
```

Keep certificates and private keys outside the repository. They are excluded by the root `.gitignore`.

For the complete AWS architecture, DynamoDB schema, event format, and deployment notes, see [`cloud.md`](./cloud.md) and [`backend/aws/README_AWS_INTEGRATION.md`](./backend/aws/README_AWS_INTEGRATION.md).

## Frontend commands

From `frontend/`:

```bash
npm run dev       # Start the development server
npm run build     # Create a production build
npm run preview   # Preview the production build
npm run lint      # Run Oxlint
```

## Event format

Motion events use the following shape:

```json
{
  "sensor_id": "esp32-sensor-01",
  "room_id": "room238",
  "event": "motion_detected",
  "timestamp_ms": 137930
}
```

Supported event types are `motion_detected` and `motion_cleared`. The backend assigns the authoritative wall-clock timestamp and maps the sensor to the room according to the manual association registry.

## Privacy

RoomPulse is designed to measure room activity without collecting identifying information. The system processes motion state and room-level event metadata only. Do not add credentials, certificates, private keys, or other sensitive data to the repository.
