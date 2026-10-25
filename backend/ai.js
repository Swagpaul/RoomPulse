import { store } from './store.js';
import { getHourlyActivity, getActivitySummary, detectAnomalies } from './analytics.js';

/* ==========================================================================
   RoomPulse AI Intelligence Engine
   Uses Google Gemini API for generative insights, with a rich local fallback.
   Set GEMINI_API_KEY env var to enable cloud AI.
   ========================================================================== */

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = 'gemini-2.0-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=`;

/**
 * Build a structured context snapshot of room data for the LLM
 */
function buildRoomContext(roomId, range = 'week') {
  const summary = getActivitySummary(roomId, range);
  const anomalies = detectAnomalies(roomId, range);
  const today = new Date().toISOString().split('T')[0];
  const hourlyToday = getHourlyActivity(roomId, today);

  // Get recent events (last 50)
  const allEvents = store.getEvents(roomId);
  const recentEvents = allEvents.slice(0, 50);

  // Compute additional metrics
  const motionEvents = recentEvents.filter(e => e.event === 'motion_detected');
  const clearedEvents = recentEvents.filter(e => e.event === 'motion_cleared' && e.duration_ms);
  const avgDuration = clearedEvents.length > 0
    ? (clearedEvents.reduce((s, e) => s + Number(e.duration_ms), 0) / clearedEvents.length / 1000).toFixed(1)
    : 'N/A';

  // Peak and quiet hours from today's hourly data
  const activeHours = hourlyToday.filter(h => h.count > 0);
  const quietHours = hourlyToday.filter(h => h.count === 0);
  const peakHour = hourlyToday.reduce((max, h) => h.count > max.count ? h : max, { hour: 0, count: 0 });

  // Day-of-week distribution from recent events
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayDist = new Array(7).fill(0);
  motionEvents.forEach(e => {
    const d = new Date(e.timestamp).getDay();
    dayDist[d]++;
  });
  const busiestDay = dayNames[dayDist.indexOf(Math.max(...dayDist))];
  const quietestDay = dayNames[dayDist.indexOf(Math.min(...dayDist))];

  return {
    room_id: roomId,
    analysis_range: range,
    current_date: today,
    current_time: new Date().toLocaleTimeString('en-US', { hour12: true }),
    summary: {
      total_sessions: summary.total_sessions,
      most_active_hour: summary.most_active_hour,
      avg_session_duration_ms: summary.avg_session_duration_ms,
      active_hours_count: summary.active_hours_count,
      anomaly_count: anomalies.length
    },
    today_hourly: hourlyToday.filter(h => h.count > 0).map(h => `${h.hour}:00 → ${h.count} events`),
    peak_hour_today: `${peakHour.hour}:00 with ${peakHour.count} events`,
    quiet_hours_today_count: quietHours.length,
    avg_session_duration_seconds: avgDuration,
    busiest_day_of_week: busiestDay,
    quietest_day_of_week: quietestDay,
    anomalies: anomalies.slice(0, 10).map(a => ({
      timestamp: a.timestamp,
      actual: a.actual,
      expected: a.expected_range,
      z_score: a.z_score,
      reason: a.reason
    })),
    recent_events_sample: recentEvents.slice(0, 10).map(e => ({
      event: e.event,
      timestamp: e.timestamp,
      duration_ms: e.duration_ms
    }))
  };
}

/**
 * System prompt that instructs Gemini to act as a building intelligence analyst
 */
const SYSTEM_PROMPT = `You are RoomPulse AI — an expert building intelligence analyst for a privacy-preserving IoT occupancy monitoring system.

You analyze anonymous PIR motion sensor data (no cameras, no microphones, no identity tracking) to provide:
1. Executive occupancy intelligence briefings
2. Energy optimization recommendations with estimated savings
3. Security anomaly narratives and risk assessments
4. Predictive scheduling advice

RULES:
- Be concise, data-driven, and actionable
- Use bullet points and clear sections
- Reference specific times, counts, and z-scores from the data
- Provide energy saving estimates in kWh when suggesting HVAC/lighting optimizations
- Flag any off-hours motion (1 AM–5 AM) as potential security concerns
- Never reference cameras or personal identification — this is a privacy-preserving system
- Use professional but accessible language suitable for facility managers
- When data is limited, acknowledge it and provide qualified insights
- Use emoji sparingly for section headers only (🔋 ⚡ 🛡️ 📊 🕐)`;

/**
 * Call Google Gemini API
 */
async function callGemini(userPrompt, roomContext) {
  if (!GEMINI_API_KEY) {
    return null; // Will fall back to local generation
  }

  const body = {
    system_instruction: {
      parts: [{ text: SYSTEM_PROMPT }]
    },
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: `Room sensor data context:\n\`\`\`json\n${JSON.stringify(roomContext, null, 2)}\n\`\`\`\n\n${userPrompt}`
          }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 1500,
      topP: 0.9
    }
  };

  try {
    const response = await fetch(`${GEMINI_URL}${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('[AI] Gemini API error:', response.status, errText);
      return null;
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    return text || null;
  } catch (err) {
    console.error('[AI] Gemini API call failed:', err.message);
    return null;
  }
}

/**
 * Generate a rich local fallback report when no API key is available
 */
function generateLocalInsights(roomContext) {
  const ctx = roomContext;
  const s = ctx.summary;
  const anomCount = ctx.anomalies.length;

  const formatHour = (h) => {
    if (h === 0) return '12:00 AM';
    if (h === 12) return '12:00 PM';
    return h > 12 ? `${h - 12}:00 PM` : `${h}:00 AM`;
  };

  // Occupancy classification
  let occupancyLevel = 'Low';
  let occupancyEmoji = '🟢';
  if (s.total_sessions > 100) { occupancyLevel = 'High'; occupancyEmoji = '🔴'; }
  else if (s.total_sessions > 40) { occupancyLevel = 'Moderate'; occupancyEmoji = '🟡'; }

  // Energy estimate: assume ~0.5 kWh saved per quiet hour (HVAC + lighting)
  const quietHours = ctx.quiet_hours_today_count || 0;
  const weeklyQuietHours = quietHours * 7;
  const estimatedSavingsKwh = (weeklyQuietHours * 0.5).toFixed(1);

  // Security assessment
  let securityStatus = '🛡️ **Security Status: CLEAR**\nNo unusual off-hours motion detected in the analysis period.';
  const offHourAnomalies = ctx.anomalies.filter(a => {
    const hour = new Date(a.timestamp).getHours();
    return hour >= 1 && hour <= 5;
  });
  if (offHourAnomalies.length > 0) {
    securityStatus = `🛡️ **Security Status: ATTENTION REQUIRED**\n${offHourAnomalies.length} off-hours motion event(s) detected between 1:00 AM – 5:00 AM.\n`;
    offHourAnomalies.forEach(a => {
      securityStatus += `  • **${new Date(a.timestamp).toLocaleString()}** — ${a.actual} motion triggers (expected ${a.expected[0]}–${a.expected[1]}), Z-score: ${a.z_score}\n`;
    });
    securityStatus += '  • **Recommendation:** Review corridor access logs and verify no unauthorized entry occurred.\n';
  }

  // Build the report
  const report = `📊 **RoomPulse Daily Intelligence Report**
**${ctx.room_id.toUpperCase()}** | ${ctx.current_date} at ${ctx.current_time} | Range: ${ctx.analysis_range}

---

${occupancyEmoji} **Occupancy Overview: ${occupancyLevel} Activity**
• **${s.total_sessions}** motion sessions recorded over the past ${ctx.analysis_range}
• **Peak hour:** ${formatHour(s.most_active_hour)} — highest occupancy density
• **Active hours today:** ${s.active_hours_count} of 24 hours showed motion
• **Average session duration:** ${ctx.avg_session_duration_seconds}s continuous PIR signal
• **Busiest day:** ${ctx.busiest_day_of_week} | **Quietest day:** ${ctx.quietest_day_of_week}

---

🔋 **Energy Optimization Advisory**
• Room is unoccupied for approximately **${quietHours} hours today** (${Math.round(quietHours/24*100)}% idle time)
• Estimated weekly energy savings if HVAC/lighting is auto-scheduled: **~${estimatedSavingsKwh} kWh**
${quietHours >= 8 ? `• 💡 **High Savings Potential:** This room has extended idle periods. Consider implementing automated occupancy-based HVAC scheduling to reduce energy waste by up to 30%.` : `• Room utilization is high — current HVAC scheduling appears appropriate.`}
${s.most_active_hour >= 8 && s.most_active_hour <= 10 ? `• Pre-cool the room by ${formatHour(s.most_active_hour - 1)} to optimize comfort at peak usage time.` : ''}

---

${securityStatus}

---

⚡ **Anomaly Intelligence**
${anomCount === 0 ? '• All room activity is within expected statistical baselines (Z-score ≤ 2.5). No anomalies flagged.' : `• **${anomCount} anomal${anomCount === 1 ? 'y' : 'ies'}** flagged with Z-score > 2.5 or off-peak surges.\n${ctx.anomalies.slice(0, 5).map(a => `  • **${new Date(a.timestamp).toLocaleString()}** — ${a.reason} (actual: ${a.actual}, expected: ${a.expected[0]}–${a.expected[1]}, Z: ${a.z_score})`).join('\n')}`}

---

🕐 **Today's Activity Timeline**
${ctx.today_hourly.length > 0 ? ctx.today_hourly.map(h => `• ${h}`).join('\n') : '• No activity recorded yet today.'}

---

*Generated by RoomPulse AI Intelligence Engine${GEMINI_API_KEY ? ' (Gemini)' : ' (Local Analysis)'} • Privacy-preserving: no cameras, no identity tracking*`;

  return report;
}

/**
 * Generate daily intelligence insights for a room
 */
export async function generateInsights(roomId, range = 'week') {
  const context = buildRoomContext(roomId, range);

  // Try Gemini first
  const geminiResult = await callGemini(
    `Generate a comprehensive daily intelligence report for this room. Include:
1. Executive occupancy summary with key metrics
2. Energy optimization recommendations with estimated kWh savings
3. Security assessment (flag any off-hours 1-5 AM motion)
4. Anomaly analysis with root cause hypotheses
5. Predictive scheduling recommendations for the next day

Format with clear sections, bullet points, and actionable insights.`,
    context
  );

  if (geminiResult) {
    return {
      source: 'gemini',
      model: GEMINI_MODEL,
      report: geminiResult,
      context_snapshot: context,
      generated_at: new Date().toISOString()
    };
  }

  // Local fallback
  return {
    source: 'local',
    model: 'RoomPulse Built-in Analytics',
    report: generateLocalInsights(context),
    context_snapshot: context,
    generated_at: new Date().toISOString()
  };
}

/**
 * Interactive AI chat — answer a user question about room data
 */
export async function chatWithAI(roomId, userQuestion, conversationHistory = []) {
  const context = buildRoomContext(roomId);

  // Try Gemini first
  if (GEMINI_API_KEY) {
    const body = {
      system_instruction: {
        parts: [{ text: SYSTEM_PROMPT + `\n\nCurrent room sensor context:\n\`\`\`json\n${JSON.stringify(context, null, 2)}\n\`\`\`` }]
      },
      contents: [
        // Include conversation history for multi-turn context
        ...conversationHistory.map(msg => ({
          role: msg.role,
          parts: [{ text: msg.text }]
        })),
        {
          role: 'user',
          parts: [{ text: userQuestion }]
        }
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1000,
        topP: 0.9
      }
    };

    try {
      const response = await fetch(`${GEMINI_URL}${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (response.ok) {
        const data = await response.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          return {
            source: 'gemini',
            answer: text,
            room_id: roomId,
            timestamp: new Date().toISOString()
          };
        }
      }
    } catch (err) {
      console.error('[AI Chat] Gemini error:', err.message);
    }
  }

  // Local fallback for chat
  const answer = generateLocalChatAnswer(userQuestion, context);
  return {
    source: 'local',
    answer,
    room_id: roomId,
    timestamp: new Date().toISOString()
  };
}

/**
 * Local chat answer generator — handles common questions with structured data
 */
function generateLocalChatAnswer(question, ctx) {
  const q = question.toLowerCase();
  const s = ctx.summary;

  const formatHour = (h) => {
    if (h === 0) return '12:00 AM';
    if (h === 12) return '12:00 PM';
    return h > 12 ? `${h - 12}:00 PM` : `${h}:00 AM`;
  };

  if (q.includes('peak') || q.includes('busiest') || q.includes('most active') || q.includes('highest')) {
    return `📊 The peak activity hour for **${ctx.room_id}** is **${formatHour(s.most_active_hour)}** with the highest concentration of motion events.\n\nThe busiest day of the week is **${ctx.busiest_day_of_week}**. Total sessions this ${ctx.analysis_range}: **${s.total_sessions}**.`;
  }

  if (q.includes('quiet') || q.includes('empty') || q.includes('least') || q.includes('unoccupied') || q.includes('idle')) {
    return `🟢 **${ctx.room_id}** has **${ctx.quiet_hours_today_count} quiet hours** today (zero motion detected).\n\nThe quietest day of the week is **${ctx.quietest_day_of_week}**. You could save approximately **${(ctx.quiet_hours_today_count * 0.5).toFixed(1)} kWh daily** by turning off HVAC during these idle periods.`;
  }

  if (q.includes('anomal') || q.includes('unusual') || q.includes('suspicious') || q.includes('weird') || q.includes('strange')) {
    if (ctx.anomalies.length === 0) {
      return `🛡️ No anomalies detected for **${ctx.room_id}** in the past ${ctx.analysis_range}. All activity is within the expected statistical baseline (Z-score ≤ 2.5).`;
    }
    let response = `⚠️ **${ctx.anomalies.length} anomal${ctx.anomalies.length === 1 ? 'y' : 'ies'}** detected for ${ctx.room_id}:\n\n`;
    ctx.anomalies.slice(0, 5).forEach(a => {
      response += `• **${new Date(a.timestamp).toLocaleString()}** — ${a.reason}\n  Z-score: ${a.z_score} | Actual: ${a.actual} | Expected: ${a.expected[0]}–${a.expected[1]}\n\n`;
    });
    return response;
  }

  if (q.includes('energy') || q.includes('save') || q.includes('power') || q.includes('hvac') || q.includes('electricity') || q.includes('cost')) {
    const savings = (ctx.quiet_hours_today_count * 0.5 * 7).toFixed(1);
    return `🔋 **Energy Analysis for ${ctx.room_id}:**\n\n• The room is idle for ~${ctx.quiet_hours_today_count} hours daily\n• Estimated weekly savings with smart HVAC scheduling: **~${savings} kWh**\n• Peak activity at ${formatHour(s.most_active_hour)} — pre-cool 30 minutes before\n• ${ctx.quietest_day_of_week} has the lowest usage — consider reduced HVAC on that day`;
  }

  if (q.includes('security') || q.includes('night') || q.includes('after hours') || q.includes('off-hour') || q.includes('intrusion')) {
    const nightAnomalies = ctx.anomalies.filter(a => {
      const h = new Date(a.timestamp).getHours();
      return h >= 1 && h <= 5;
    });
    if (nightAnomalies.length === 0) {
      return `🛡️ **Security Status: ALL CLEAR**\n\nNo off-hours motion (1 AM – 5 AM) detected for ${ctx.room_id} in the past ${ctx.analysis_range}. The room shows typical daytime-only occupancy patterns.`;
    }
    let resp = `🛡️ **Security Alert for ${ctx.room_id}:**\n\n${nightAnomalies.length} off-hours motion event(s) detected:\n\n`;
    nightAnomalies.forEach(a => {
      resp += `• **${new Date(a.timestamp).toLocaleString()}** — ${a.actual} triggers (Z: ${a.z_score})\n`;
    });
    resp += '\n**Recommendation:** Cross-reference with access badge logs and corridor cameras to verify authorized entry.';
    return resp;
  }

  if (q.includes('today') || q.includes('current') || q.includes('now') || q.includes('right now')) {
    if (ctx.today_hourly.length === 0) {
      return `📊 No activity recorded yet today for **${ctx.room_id}**. The system is monitoring and will report motion as it occurs.`;
    }
    return `📊 **Today's Activity for ${ctx.room_id}** (${ctx.current_date}):\n\n${ctx.today_hourly.map(h => `• ${h}`).join('\n')}\n\nPeak so far: **${ctx.peak_hour_today}**\nActive hours: **${s.active_hours_count}** of 24`;
  }

  if (q.includes('summary') || q.includes('overview') || q.includes('status') || q.includes('report')) {
    return `📊 **${ctx.room_id} Summary** (past ${ctx.analysis_range}):\n\n• Total sessions: **${s.total_sessions}**\n• Peak hour: **${formatHour(s.most_active_hour)}**\n• Avg session: **${ctx.avg_session_duration_seconds}s**\n• Active hours: **${s.active_hours_count}/24**\n• Anomalies: **${ctx.anomalies.length}** flagged\n• Busiest day: **${ctx.busiest_day_of_week}**\n• Quietest day: **${ctx.quietest_day_of_week}**`;
  }

  if (q.includes('duration') || q.includes('how long') || q.includes('session length')) {
    return `⏱️ The average motion session duration for **${ctx.room_id}** is **${ctx.avg_session_duration_seconds} seconds**.\n\nThis represents the average continuous PIR sensor HIGH signal before motion clears. Longer sessions may indicate sustained occupancy (meetings, work sessions), while very short bursts typically indicate transit.`;
  }

  // Generic fallback
  return `📊 Here's what I know about **${ctx.room_id}** (past ${ctx.analysis_range}):\n\n• **${s.total_sessions}** total motion sessions\n• Peak activity at **${formatHour(s.most_active_hour)}**\n• **${ctx.anomalies.length}** anomalies flagged\n• **${ctx.quiet_hours_today_count}** quiet hours today\n• Avg session: **${ctx.avg_session_duration_seconds}s**\n\nTry asking about: *peak hours, energy savings, anomalies, security, today's activity, or session durations*.`;
}

/**
 * Generate suggested questions based on current room data
 */
export function getSuggestedQuestions(roomId) {
  const context = buildRoomContext(roomId);
  const anomCount = context.anomalies.length;

  const questions = [
    'What is the peak activity hour for this room?',
    'When is this room usually empty?',
    'How can I save energy in this room?',
    'Give me a full status summary'
  ];

  if (anomCount > 0) {
    questions.unshift('Were there any suspicious off-hours events?');
    questions.push('Explain the anomalies detected this week');
  }

  questions.push("What's today's activity timeline?");
  questions.push('How long are typical occupancy sessions?');

  return questions.slice(0, 6);
}
