# RoomPulse — Stop & Start Cheat Sheet

> [!IMPORTANT]
> Every time you restart `cloudflared`, it generates a **NEW random URL**.
> You **must** update the AWS IoT Rule with the new URL each time.

---

## 🛑 STOP Everything

Press `Ctrl+C` in each of the 3 terminal windows, then run:

```powershell
taskkill /F /IM node.exe
```

---

## 🚀 START Everything (3 Terminals)

### Terminal 1 — Backend

```powershell
cd "d:\Vit vellore\cloud computing\RoomPulse\backend"
npm start
```

✅ Wait for: `🚀 RoomPulse Backend API Running on port 5000`

---

### Terminal 2 — Frontend

```powershell
cd "d:\Vit vellore\cloud computing\RoomPulse\frontend"
npm run dev
```

✅ Open browser: `http://localhost:5173`

---

### Terminal 3 — Cloudflare Tunnel

```powershell
cd "d:\Vit vellore\cloud computing\RoomPulse"
npx cloudflared tunnel --url http://localhost:5000
```

✅ Look for the line:
```
Your quick Tunnel has been created! Visit it at:
https://XXXX-XXXX-XXXX-XXXX.trycloudflare.com
```

⚠️ **Copy this URL — you need it in the next step!**

---

## 🔄 Update AWS IoT Rule (REQUIRED every restart)

1. Open **AWS Console** → **AWS IoT Core** → **Message routing** → **Rules**
2. Click **RoomPulseForwardingRule** → **Edit**
3. Under Rule actions, click the **HTTPS endpoint** action
4. Change the URL to:
   ```
   https://XXXX-XXXX-XXXX-XXXX.trycloudflare.com/api/events
   ```
   *(Paste your NEW Cloudflare URL + `/api/events`)*
5. Click **Update**

---

## ✅ Confirm Destination Activated

Watch **Terminal 1** (backend). Within 10 seconds you should see:

```
[AWS IoT] Received DestinationConfirmation request. Auto-confirming via enableUrl...
[AWS IoT] Destination successfully confirmed with AWS: {}
```

Then go to **AWS IoT Core** → **Message routing** → **Destinations** and verify status is **Enabled**.

If it shows **Inactive**:
- Delete the old destination
- Go back to Rules → Edit → Remove the old action → Add a new HTTPS endpoint action with the same URL
- Save again

---

## 🧪 Test

Touch the ESP32 sensor — your dashboard at `http://localhost:5173` should show the motion event live!

Or test manually from **AWS MQTT test client**:
- **Topic:** `roompulse/room238/motion`
- **Payload:**
  ```json
  {"room_id":"room238","event":"motion_detected","timestamp_ms":123456}
  ```
- Click **Publish**
