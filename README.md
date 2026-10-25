# RoomPulse

RoomPulse is a privacy-preserving room occupancy monitoring system. It uses anonymous motion events from an ESP32 and PIR sensor to provide a live React dashboard, backend analytics, anomaly detection, and optional AWS IoT integration.

RoomPulse does not use cameras, microphones, or identity data.

## Features

- Live room occupancy and motion activity dashboard
- Activity heatmap and hourly activity charts
- Motion event log
- Anomaly detection for unusual activity patterns
- AI copilot interface for dashboard insights
- Local event simulator for development
- AWS IoT MQTT bridge for forwarding device events
- Server-side timestamps for reliable event history

## Project structure

```text
RoomPulse/
├── backend/
│   ├── aws/              # AWS IoT integration and ingest Lambda
│   ├── data/             # Local event data
│   ├── ai.js             # AI insight helpers
│   ├── analytics.js      # Activity and anomaly analytics
│   ├── server.js         # Express API and WebSocket server
│   ├── simulator.js      # Local motion event simulator
│   └── store.js          # Event persistence
├── frontend/
│   ├── src/              # React dashboard
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

## Backend API

The backend provides HTTP endpoints for events, analytics, and health checks. It also exposes a WebSocket endpoint for live dashboard updates.

The frontend is configured to communicate with the local backend during development. See [`backend/server.js`](./backend/server.js) for the available routes and [`cloud.md`](./cloud.md) for the event and storage contract.

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
  "room_id": "301",
  "event": "motion_detected",
  "timestamp_ms": 137930
}
```

Supported event types are `motion_detected` and `motion_cleared`. The device timestamp is retained for debugging only; the backend assigns the authoritative wall-clock timestamp when it receives an event.

## Privacy

RoomPulse is designed to measure room activity without collecting identifying information. The system processes motion state and room-level event metadata only. Do not add credentials, certificates, private keys, or other sensitive data to the repository.
