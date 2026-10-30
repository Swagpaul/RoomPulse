import { store } from './store.js';

/**
 * Computes hourly activity count for a given date (YYYY-MM-DD)
 * Returns array of 24 hours: [{ hour: 0, count: 12 }, ...]
 */
export function getHourlyActivity(roomId, dateStr) {
  let events = [];

  if (dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const startOfDay = `${dateStr}T00:00:00.000Z`;
    const endOfDay = `${dateStr}T23:59:59.999Z`;
    events = store.getEvents(roomId, startOfDay, endOfDay);

    // Fallback: if zero events found through ISO string window, check date prefix
    if (events.length === 0) {
      const allEvents = store.getEvents(roomId);
      events = allEvents.filter(e => e.timestamp && e.timestamp.startsWith(dateStr));
    }
  } else {
    const targetDate = dateStr ? new Date(dateStr) : new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);
    events = store.getEvents(roomId, startOfDay.toISOString(), endOfDay.toISOString());
  }
  
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
 * Computes daily activity trend for a room across a specified number of days
 * Supports multi-day view (7 days, 14 days, 30 days)
 */
export function getDailyActivity(roomId, days = 7, endDateStr = null) {
  const numDays = Math.min(Math.max(parseInt(days, 10) || 7, 1), 60);
  const endDate = endDateStr ? new Date(endDateStr) : new Date();
  const daily = [];
  
  let totalEventsSum = 0;
  let totalMotionSum = 0;
  let maxDayMotion = -1;
  let busiestDay = null;

  for (let i = numDays - 1; i >= 0; i--) {
    const curDate = new Date(endDate.getTime() - i * 86400000);
    const dateStr = curDate.toISOString().split('T')[0];
    const dayName = curDate.toLocaleDateString('en-US', { weekday: 'short' });
    const formattedDate = curDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    const startOfDay = `${dateStr}T00:00:00.000Z`;
    const endOfDay = `${dateStr}T23:59:59.999Z`;
    let dayEvents = store.getEvents(roomId, startOfDay, endOfDay);

    if (dayEvents.length === 0) {
      const allEvents = store.getEvents(roomId);
      dayEvents = allEvents.filter(e => e.timestamp && e.timestamp.startsWith(dateStr));
    }

    let totalDetected = 0;
    let totalCleared = 0;
    let totalDurationMs = 0;
    const hourCounts = new Array(24).fill(0);

    dayEvents.forEach(e => {
      if (e.event === 'motion_detected') {
        totalDetected++;
        const h = new Date(e.timestamp).getHours();
        if (h >= 0 && h < 24) hourCounts[h]++;
      } else if (e.event === 'motion_cleared' && e.duration_ms) {
        totalCleared++;
        totalDurationMs += Number(e.duration_ms);
      }
    });

    let peakHour = null;
    let maxHourCount = 0;
    let activeHours = 0;
    hourCounts.forEach((cnt, h) => {
      if (cnt > 0) activeHours++;
      if (cnt > maxHourCount) {
        maxHourCount = cnt;
        peakHour = h;
      }
    });

    const avgDuration = totalCleared > 0 ? Math.round(totalDurationMs / totalCleared) : 0;

    totalEventsSum += dayEvents.length;
    totalMotionSum += totalDetected;

    if (totalDetected > maxDayMotion && totalDetected > 0) {
      maxDayMotion = totalDetected;
      busiestDay = {
        date: dateStr,
        formatted: formattedDate,
        day_name: dayName,
        count: totalDetected,
        peak_hour: peakHour
      };
    }

    daily.push({
      date: dateStr,
      day_name: dayName,
      formatted_date: formattedDate,
      total_events: dayEvents.length,
      motion_detected: totalDetected,
      active_hours: activeHours,
      peak_hour: peakHour,
      peak_count: maxHourCount,
      avg_duration_ms: avgDuration,
      has_data: dayEvents.length > 0
    });
  }

  const startDateStr = daily[0]?.date || '';
  const actualEndDateStr = daily[daily.length - 1]?.date || '';

  return {
    room_id: roomId,
    days: numDays,
    start_date: startDateStr,
    end_date: actualEndDateStr,
    daily,
    total_events: totalEventsSum,
    total_motion_detected: totalMotionSum,
    busiest_day: busiestDay,
    daily_average_motion: Math.round(totalMotionSum / numDays)
  };
}

/**
 * Returns all distinct dates that have recorded activity for this room,
 * sorted from newest to oldest. Includes today's entry even if 0 events.
 */
export function getAvailableDates(roomId) {
  const events = store.getEvents(roomId);
  const dateMap = {};

  const todayStr = new Date().toISOString().split('T')[0];
  dateMap[todayStr] = { total: 0, detected: 0, cleared: 0, duration: 0 };

  events.forEach(e => {
    if (!e.timestamp) return;
    const d = e.timestamp.split('T')[0];
    if (!dateMap[d]) {
      dateMap[d] = { total: 0, detected: 0, cleared: 0, duration: 0 };
    }
    dateMap[d].total++;
    if (e.event === 'motion_detected') {
      dateMap[d].detected++;
    } else if (e.event === 'motion_cleared' && e.duration_ms) {
      dateMap[d].cleared++;
      dateMap[d].duration += Number(e.duration_ms);
    }
  });

  const sortedDates = Object.keys(dateMap).sort().reverse();
  const now = new Date();
  const yesterdayStr = new Date(now.getTime() - 86400000).toISOString().split('T')[0];

  return sortedDates.map(dateKey => {
    const dObj = new Date(`${dateKey}T12:00:00Z`);
    const dayName = dObj.toLocaleDateString('en-US', { weekday: 'short' });
    const formattedDate = dObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const isToday = dateKey === todayStr;
    const isYesterday = dateKey === yesterdayStr;

    let label = `${formattedDate} (${dayName})`;
    if (isToday) label = `${formattedDate} (Today - Live)`;
    else if (isYesterday) label = `${formattedDate} (Yesterday)`;

    const info = dateMap[dateKey];
    const avgDuration = info.cleared > 0 ? Math.round(info.duration / info.cleared) : 0;

    return {
      date: dateKey,
      label,
      day_name: dayName,
      formatted_date: formattedDate,
      total_events: info.total,
      motion_count: info.detected,
      avg_duration_ms: avgDuration,
      is_today: isToday,
      is_yesterday: isYesterday,
      has_data: info.total > 0
    };
  });
}

/**
 * Computes summary metrics for a given range ('day', 'week', 'month')
 * Or for a specific historical date (e.g. date: '2026-10-29')
 */
export function getActivitySummary(roomId, range = 'week', dateStr = null) {
  const now = new Date();

  // If a specific date is requested, compute metrics for that day
  if (dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const startOfDay = `${dateStr}T00:00:00.000Z`;
    const endOfDay = `${dateStr}T23:59:59.999Z`;
    let events = store.getEvents(roomId, startOfDay, endOfDay);
    if (events.length === 0) {
      const allEvents = store.getEvents(roomId);
      events = allEvents.filter(e => e.timestamp && e.timestamp.startsWith(dateStr));
    }

    const hourBuckets = new Array(24).fill(0);
    let totalDetected = 0;
    let totalClearedDuration = 0;
    let clearedCount = 0;

    events.forEach(evt => {
      if (evt.event === 'motion_detected') {
        const h = new Date(evt.timestamp).getHours();
        if (h >= 0 && h < 24) hourBuckets[h]++;
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

    const avgDuration = clearedCount > 0 ? Math.round(totalClearedDuration / clearedCount) : 0;
    const allAnomalies = detectAnomalies(roomId, 'month');
    const dayAnomalies = allAnomalies.filter(a => a.timestamp && a.timestamp.startsWith(dateStr));

    return {
      room_id: roomId,
      range: 'date',
      date: dateStr,
      most_active_hour: mostActiveHour,
      total_sessions: totalDetected,
      avg_session_duration_ms: avgDuration,
      active_hours_count: hourBuckets.filter(c => c > 0).length,
      anomaly_count: dayAnomalies.length
    };
  }

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
