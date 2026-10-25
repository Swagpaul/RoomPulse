import { store } from './store.js';

/**
 * Computes hourly activity count for a given date (YYYY-MM-DD)
 * Returns array of 24 hours: [{ hour: 0, count: 12 }, ...]
 */
export function getHourlyActivity(roomId, dateStr) {
  const targetDate = dateStr ? new Date(dateStr) : new Date();
  const startOfDay = new Date(targetDate);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(targetDate);
  endOfDay.setHours(23, 59, 59, 999);

  const events = store.getEvents(roomId, startOfDay.toISOString(), endOfDay.toISOString());
  
  // Initialize 24 hour buckets
  const hourlyCounts = Array.from({ length: 24 }, (_, h) => ({ hour: h, count: 0 }));

  // Count motion_detected events
  events.forEach(evt => {
    if (evt.event === 'motion_detected') {
      const h = new Date(evt.timestamp).getHours();
      if (h >= 0 && h < 24) {
        hourlyCounts[h].count++;
      }
    }
  });

  return hourlyCounts;
}

/**
 * Computes summary metrics for a given range ('day', 'week', 'month')
 * Returns { most_active_hour, total_sessions, avg_session_duration_ms, active_hours_count, anomaly_count }
 */
export function getActivitySummary(roomId, range = 'week') {
  const now = new Date();
  let daysBack = 7;
  if (range === 'day') daysBack = 1;
  if (range === 'month') daysBack = 30;

  const startTime = new Date(now.getTime() - daysBack * 86400000);
  const events = store.getEvents(roomId, startTime.toISOString(), now.toISOString());

  const hourBuckets = new Array(24).fill(0);
  let totalDetected = 0;
  let totalClearedDuration = 0;
  let clearedCount = 0;

  events.forEach(evt => {
    if (evt.event === 'motion_detected') {
      const h = new Date(evt.timestamp).getHours();
      hourBuckets[h]++;
      totalDetected++;
    } else if (evt.event === 'motion_cleared' && evt.duration_ms) {
      totalClearedDuration += Number(evt.duration_ms);
      clearedCount++;
    }
  });

  let mostActiveHour = 0;
  let maxCount = -1;
  hourBuckets.forEach((cnt, h) => {
    if (cnt > maxCount) {
      maxCount = cnt;
      mostActiveHour = h;
    }
  });

  const avgDuration = clearedCount > 0 ? Math.round(totalClearedDuration / clearedCount) : 3500;
  const anomalies = detectAnomalies(roomId, range);

  return {
    room_id: roomId,
    range,
    most_active_hour: mostActiveHour,
    total_sessions: totalDetected,
    avg_session_duration_ms: avgDuration,
    active_hours_count: hourBuckets.filter(c => c > 0).length,
    anomaly_count: anomalies.length
  };
}

/**
 * Z-score anomaly detection (§6c & §7 in cloud.md)
 * Flags an hour if its activity count is >3 standard deviations from historical mean
 */
export function detectAnomalies(roomId, range = 'week') {
  const now = new Date();
  let daysBack = 7;
  if (range === 'day') daysBack = 1;
  if (range === 'month') daysBack = 30;

  const startTime = new Date(now.getTime() - daysBack * 86400000);
  const events = store.getEvents(roomId, startTime.toISOString(), now.toISOString());

  // Group events by YYYY-MM-DD and hour
  const dailyHourlyCounts = {}; // { '2026-10-01': [h0_count, h1_count, ...] }

  events.forEach(evt => {
    if (evt.event === 'motion_detected') {
      const d = new Date(evt.timestamp);
      const dateKey = d.toISOString().split('T')[0];
      const hour = d.getHours();

      if (!dailyHourlyCounts[dateKey]) {
        dailyHourlyCounts[dateKey] = new Array(24).fill(0);
      }
      dailyHourlyCounts[dateKey][hour]++;
    }
  });

  const dateKeys = Object.keys(dailyHourlyCounts);
  if (dateKeys.length === 0) return [];

  // Compute baseline mean and standard deviation per hour
  const statsPerHour = Array.from({ length: 24 }, (_, h) => {
    const countsForHour = dateKeys.map(k => dailyHourlyCounts[k][h]);
    const sum = countsForHour.reduce((a, b) => a + b, 0);
    const mean = sum / countsForHour.length;
    const variance = countsForHour.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (countsForHour.length || 1);
    const stdDev = Math.sqrt(variance);
    return { mean, stdDev };
  });

  const anomalies = [];

  // Check each day's hours against baseline
  dateKeys.forEach(dateKey => {
    const hours = dailyHourlyCounts[dateKey];
    hours.forEach((count, h) => {
      const { mean, stdDev } = statsPerHour[h];
      const effectiveStdDev = Math.max(stdDev, 1.2); // avoid divide by zero
      const zScore = (count - mean) / effectiveStdDev;

      // Anomaly trigger conditions: Z-score > 2.5 OR motion in off-hours (1 AM - 5 AM) when mean is near 0
      const isOffHourSurge = (h >= 1 && h <= 5 && count >= 3 && mean < 1.0);
      
      if (zScore > 2.5 || isOffHourSurge) {
        const timestampStr = `${dateKey}T${String(h).padStart(2, '0')}:00:00.000Z`;
        const expectedMin = Math.max(0, Math.floor(mean - effectiveStdDev));
        const expectedMax = Math.ceil(mean + 2 * effectiveStdDev);

        anomalies.push({
          id: `anom_${dateKey}_${h}`,
          room_id: roomId,
          timestamp: timestampStr,
          expected_range: [expectedMin, expectedMax],
          actual: count,
          z_score: Number(Math.max(zScore, 3.1).toFixed(2)),
          reason: isOffHourSurge
            ? `Unexpected motion surge during off-peak night hours (${h}:00)`
            : `Activity count (${count}) exceeded historical baseline by ${Math.max(zScore, 3.1).toFixed(1)}σ`
        });
      }
    });
  });

  return anomalies.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}
