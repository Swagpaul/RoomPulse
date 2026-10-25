# RoomPulse — Cloud Architecture & Integration Guide

A reference doc for building the frontend + backend on top of the IoT data pipeline. The hardware → AWS IoT Core leg is done and confirmed working; this doc defines what's already flowing, and the contract your backend/frontend should build against.

---

## 1. Project Summary

RoomPulse is a privacy-preserving room occupancy monitor. An SR501 PIR sensor + ESP32 detects motion only (no camera/mic, no identity data) and streams anonymous motion events to AWS. The cloud side stores activity history, computes usage patterns, and flags anomalies (e.g. motion at 2 AM in a room normally active 8 AM–5 PM).

---

## 2. Architecture

```
SR501 + ESP32
   │  (MQTT over TLS)
   ▼
AWS IoT Core        ← DONE, confirmed working
   │  (IoT Rule)
   ▼
Ingest Lambda        ← TO BUILD
   │
   ▼
DynamoDB              ← TO BUILD
   │
   ▼
Analytics Lambda      ← TO BUILD
(EventBridge-scheduled, pandas + z-score / Isolation Forest)
   │
   ▼
API Gateway + Lambda  ← TO BUILD (backend partner's main task)
   │
   ▼
React Dashboard (Amplify)  ← TO BUILD (frontend partner's main task)
```

**Status right now:** the ESP32 is publishing live motion events to AWS IoT Core, and we can see them arrive in the IoT Core MQTT test client. Nothing downstream of IoT Core exists yet — that's what this doc specifies.

---

## 3. Device Details

| Item | Value |
| --- | --- |
| Thing name | `roompulse-room238` |
| MQTT topic | `roompulse/room238/motion` |
| Protocol | MQTT over TLS (port 8883), mutual-TLS cert auth |
| IoT policy scope | `roompulse/*` |

---

## 4. Current Output Format (from device)

Each motion event published by the ESP32 looks like this:

```json
{"room_id":"301","event":"motion_detected","timestamp_ms":137930}
```

```json
{"room_id":"301","event":"motion_cleared","timestamp_ms":142620,"duration_ms":4700}
```

| Field | Type | Meaning |
| --- | --- | --- |
| `room_id` | string | Which room (currently hardcoded `"301"` — needs syncing with the `room238` naming; fix before demo) |
| `event` | string | `"motion_detected"` or `"motion_cleared"` |
| `timestamp_ms` | number | ⚠️ **Not wall-clock time** — milliseconds since the ESP32 last booted (`millis()`). Resets to 0 on every reboot. **Do not use this as the real event time.** |
| `duration_ms` | number | Only present on `motion_cleared` — how long the HIGH signal lasted |

### Important: timestamp fix required at ingestion

`timestamp_ms` is unreliable across device reboots. **The ingest Lambda must stamp each event with the real wall-clock time when it receives it** (e.g. `datetime.utcnow()` in Python, or DynamoDB's own insert time) rather than trusting the device's value. The device's `timestamp_ms` can still be stored alongside for debugging, just not relied on for analytics.

---

## 5. How to Retrieve the Raw Output (today, before Lambda/DynamoDB exist)

Until step 3 (ingest Lambda) is built, the only way to see events is:

1. AWS Console → **IoT Core → MQTT test client**
2. **Subscribe to a topic** → enter `roompulse/room238/motion`
3. Trigger motion on the sensor → JSON payload appears live

This is a manual/debug view only — it is **not** a data source for the dashboard. The dashboard must read from DynamoDB via the backend API (section 7), never directly from MQTT.

---

## 6. What the Backend Partner Needs to Build

### 6a. Ingest path (IoT Rule → Lambda → DynamoDB)

- **IoT Rule**: SQL filter `SELECT * FROM 'roompulse/+/motion'` → triggers a Lambda
- **Ingest Lambda** (Python recommended, matches the rest of the stack):
  - Parses the incoming MQTT payload
  - Adds a server-side `timestamp` (ISO 8601 UTC, wall-clock — see §4)
  - Writes one item per event to DynamoDB

### 6b. DynamoDB schema

| Attribute | Type | Role |
| --- | --- | --- |
| `room_id` | String | Partition key |
| `timestamp` | String (ISO 8601) | Sort key — server-assigned, not from the device |
| `event` | String | `motion_detected` / `motion_cleared` |
| `duration_ms` | Number | Optional, from `motion_cleared` events |
| `device_timestamp_ms` | Number | Original device value, kept for debugging only |

This schema supports range queries like "all events for room 301 between time A and B," which the analytics and dashboard both need.

### 6c. Analytics Lambda (scheduled via EventBridge)

- Runs hourly or daily
- Pulls recent events from DynamoDB with pandas
- Computes: activity count per hour-of-day, daily/weekly totals, active session count
- Anomaly detection, phase 1: z-score threshold — flag an hour if its activity count is &gt;3 standard deviations from that hour's historical mean
- Anomaly detection, phase 2 (stretch): scikit-learn Isolation Forest, once there's enough baseline data (several days minimum)
- Writes results back to DynamoDB (either a separate `analytics` table, or items in the same table with a different sort-key prefix, e.g. `STATS#2026-09-17`)

---

## 7. API Contract (for the frontend to build against)

Suggested REST endpoints via API Gateway + Lambda. Backend partner should implement these; frontend partner can start building UI against mocked versions of this shape immediately, without waiting for the real backend.

```
GET /rooms/{room_id}/events?start={ISO8601}&end={ISO8601}
→ [{ "timestamp": "...", "event": "motion_detected", "duration_ms": 4700 }, ...]

GET /rooms/{room_id}/activity/hourly?date={YYYY-MM-DD}
→ [{ "hour": 8, "count": 12 }, { "hour": 9, "count": 34 }, ...]

GET /rooms/{room_id}/activity/summary?range=week
→ { "most_active_hour": 10, "total_sessions": 47, "avg_session_duration_ms": 3100 }

GET /rooms/{room_id}/anomalies?range=week
→ [{ "timestamp": "2026-09-14T02:17:00Z", "expected_range": [0, 2], "actual": 9 }, ...]
```

Keep response shapes stable once the frontend starts consuming them — treat this as the agreed contract between both of you.

---

## 8. Frontend (React + Amplify)

- Consumes the endpoints in §7
- Suggested views:
  - **Activity heatmap** — hour-of-day vs. day-of-week grid (matches the bar-chart visualization in the original project concept)
  - **Usage trend line** — daily/weekly totals over time
  - **Anomaly feed** — chronological list of flagged events
- Deploy via AWS Amplify (connects to a git repo, auto-builds on push — simplest hosting path for this stack)

---

## 9. Deployment Order (once both halves are built)

1. Deploy DynamoDB table first (nothing else works without it)
2. Deploy ingest Lambda + IoT Rule, confirm events are landing in DynamoDB (check via console's "Explore table items")
3. Deploy analytics Lambda + EventBridge schedule, let it run for a few cycles, confirm stats are being written
4. Deploy API Gateway + backend Lambda endpoints, test each route with a tool like Postman/curl before wiring up the frontend
5. Deploy frontend to Amplify, point it at the API Gateway base URL
6. Run the full pipeline live for several days to build a real behavioral baseline before anomaly detection results mean anything
7. Set a billing alarm in AWS Budgets (if not already done) before leaving it running unattended

---

## 10. Known Issues / Things to Fix Before Demo

- `room_id` is hardcoded `"301"` in firmware but the thing/topic use `238` — pick one and make it consistent
- Device timestamps are unreliable across reboots — ingest Lambda must apply server-side timestamps (§4)
- No multi-day baseline data yet — anomaly detection won't be meaningful until the system has run for several days