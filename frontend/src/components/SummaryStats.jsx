import React from 'react';
import { Activity, Clock, Flame, AlertCircle } from 'lucide-react';

export default function SummaryStats({ summary, anomalyCount }) {
  if (!summary) return null;

  const formatHour = (h) => {
    if (h === 0) return '12 AM';
    if (h === 12) return '12 PM';
    return h > 12 ? `${h - 12} PM` : `${h} AM`;
  };

  const cards = [
    {
      title: 'Total Active Sessions',
      value: summary.total_sessions || 0,
      subtext: 'Past 7 days detected',
      icon: Activity,
      badgeBg: '#e0f2fe',
      iconColor: '#0284c7',
      textColor: '#0369a1'
    },
    {
      title: 'Peak Activity Hour',
      value: formatHour(summary.most_active_hour || 0),
      subtext: 'Highest occupancy density',
      icon: Flame,
      badgeBg: '#fef3c7',
      iconColor: '#d97706',
      textColor: '#b45309'
    },
    {
      title: 'Avg Session Duration',
      value: `${((summary.avg_session_duration_ms || 3500) / 1000).toFixed(1)}s`,
      subtext: 'Continuous PIR signal',
      icon: Clock,
      badgeBg: '#d1fae5',
      iconColor: '#059669',
      textColor: '#047857'
    },
    {
      title: 'Flagged Anomalies',
      value: anomalyCount || 0,
      subtext: 'Z-Score > 2.5 or off-hours',
      icon: AlertCircle,
      badgeBg: '#ffe4e6',
      iconColor: '#e11d48',
      textColor: '#be123c'
    }
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
      {cards.map((c, i) => {
        const Icon = c.icon;
        return (
          <div key={i} className="pastel-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 500 }}>
                {c.title}
              </span>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: c.badgeBg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Icon size={18} color={c.iconColor} />
              </div>
            </div>
            <div style={{ fontSize: '1.65rem', fontWeight: 700, letterSpacing: '-0.02em', color: c.textColor }}>
              {c.value}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
              {c.subtext}
            </div>
          </div>
        );
      })}
    </div>
  );
}
