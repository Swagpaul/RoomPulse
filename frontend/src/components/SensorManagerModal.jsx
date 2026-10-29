import React, { useState } from 'react';
import { 
  Cpu, 
  Radio, 
  Unlink, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  Zap, 
  Clock
} from 'lucide-react';

export default function SensorManagerModal({
  isOpen,
  onClose,
  sensors,
  rooms,
  onAssign,
  onDeassign,
  onRegister,
  onDelete,
  onSimulateSensor,
  onSelectRoom
}) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSensorId, setNewSensorId] = useState('');
  const [newName, setNewName] = useState('');
  const [newModel, setNewModel] = useState('ESP32 + HC-SR501 PIR');
  const [newRoomId, setNewRoomId] = useState('');
  const [actionLoading, setActionLoading] = useState(null);
  const [feedbackMsg, setFeedbackMsg] = useState(null);

  // Target room selection per sensor: { [sensorId]: targetRoom }
  const [targetRooms, setTargetRooms] = useState({});
  const [customRoomInputs, setCustomRoomInputs] = useState({});

  if (!isOpen) return null;

  const showFeedback = (text, type = 'success') => {
    setFeedbackMsg({ text, type });
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  const handleDeassign = async (sensorId) => {
    setActionLoading(`deassign-${sensorId}`);
    try {
      await onDeassign(sensorId);
      showFeedback(`Sensor device removed from room. It is now in Standby.`);
    } catch (err) {
      showFeedback(`Failed to de-assign: ${err.message}`, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleAssign = async (sensorId) => {
    let target = targetRooms[sensorId];
    if (target === '__custom__') {
      target = customRoomInputs[sensorId];
    }
    if (!target) {
      target = rooms[0] || 'room238';
    }
    setActionLoading(`assign-${sensorId}`);
    try {
      await onAssign(sensorId, target);
      showFeedback(`Device successfully placed in ${target}. Telemetry now routes to ${target}.`);
    } catch (err) {
      showFeedback(`Failed to assign: ${err.message}`, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    if (!newSensorId.trim()) {
      showFeedback('Sensor ID is required', 'error');
      return;
    }
    setActionLoading('register');
    try {
      await onRegister({
        sensor_id: newSensorId.trim(),
        name: newName.trim() || `Sensor ${newSensorId.trim()}`,
        model: newModel.trim(),
        room_id: newRoomId.trim() || null
      });
      showFeedback(`Hardware device "${newSensorId}" registered successfully!`);
      setNewSensorId('');
      setNewName('');
      setNewRoomId('');
      setShowAddForm(false);
    } catch (err) {
      showFeedback(`Registration failed: ${err.message}`, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (sensorId) => {
    if (!window.confirm(`Delete sensor configuration for "${sensorId}"?`)) return;
    setActionLoading(`delete-${sensorId}`);
    try {
      await onDelete(sensorId);
      showFeedback(`Sensor "${sensorId}" removed.`);
    } catch (err) {
      showFeedback(`Failed to delete: ${err.message}`, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(15, 23, 42, 0.45)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '1.5rem'
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: '24px',
        width: '100%',
        maxWidth: '820px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
        border: '1px solid #e2e8f0',
        overflow: 'hidden'
      }}>
        {/* Modal Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          padding: '1.5rem 1.75rem',
          borderBottom: '1px solid #f1f5f9',
          background: 'linear-gradient(to bottom, #f8fafc, #ffffff)'
        }}>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <div style={{
              width: '46px',
              height: '46px',
              borderRadius: '14px',
              background: '#e0f2fe',
              border: '1px solid #7dd3fc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#0284c7'
            }}>
              <Cpu size={24} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>
                IoT Device Placement & Room Association
              </h2>
              <p style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '0.15rem' }}>
                A physical sensor setup can only be kept in <strong>one room at any given time</strong>. Telemetry is automatically routed to that room.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: '#f1f5f9',
              border: 'none',
              borderRadius: '10px',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#64748b'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Feedback Alert if any */}
        {feedbackMsg && (
          <div style={{
            padding: '0.75rem 1.75rem',
            background: feedbackMsg.type === 'error' ? '#ffe4e6' : '#d1fae5',
            color: feedbackMsg.type === 'error' ? '#be123c' : '#047857',
            fontSize: '0.84rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            borderBottom: '1px solid rgba(0,0,0,0.05)'
          }}>
            {feedbackMsg.type === 'error' ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}
            {feedbackMsg.text}
          </div>
        )}

        {/* Modal Body / Scrollable Content */}
        <div style={{ padding: '1.5rem 1.75rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Section Heading & Register Toggle */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Radio size={16} color="#0284c7" />
              Active IoT Hardware Device Placement
            </h3>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontSize: '0.78rem',
                fontWeight: 600,
                color: showAddForm ? '#64748b' : '#0284c7',
                background: showAddForm ? '#f1f5f9' : '#e0f2fe',
                border: 'none',
                padding: '0.4rem 0.8rem',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              {showAddForm ? <X size={14} /> : <Plus size={14} />}
              {showAddForm ? 'Cancel' : 'Add Another Device'}
            </button>
          </div>

          {/* Add New Hardware Form (Collapsible) */}
          {showAddForm && (
            <form onSubmit={handleRegisterSubmit} style={{
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: '16px',
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.85rem'
            }}>
              <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>
                Register Additional IoT Hardware Setup
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.74rem', fontWeight: 600, color: '#64748b' }}>Hardware Key / ID *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. esp32-sensor-02"
                    value={newSensorId}
                    onChange={(e) => setNewSensorId(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.5rem 0.75rem',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.82rem',
                      marginTop: '0.2rem'
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.74rem', fontWeight: 600, color: '#64748b' }}>Friendly Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Lab 2 Sensor Setup"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.5rem 0.75rem',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.82rem',
                      marginTop: '0.2rem'
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.74rem', fontWeight: 600, color: '#64748b' }}>Hardware Model</label>
                  <input
                    type="text"
                    value={newModel}
                    onChange={(e) => setNewModel(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.5rem 0.75rem',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.82rem',
                      marginTop: '0.2rem'
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.74rem', fontWeight: 600, color: '#64748b' }}>Initial Room</label>
                  <input
                    type="text"
                    placeholder="e.g. room104 (or leave blank)"
                    value={newRoomId}
                    onChange={(e) => setNewRoomId(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.5rem 0.75rem',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.82rem',
                      marginTop: '0.2rem'
                    }}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button
                  type="submit"
                  disabled={actionLoading === 'register'}
                  className="btn btn-primary"
                  style={{ fontSize: '0.82rem', padding: '0.45rem 1.1rem' }}
                >
                  <Plus size={14} />
                  {actionLoading === 'register' ? 'Registering...' : 'Save Hardware Setup'}
                </button>
              </div>
            </form>
          )}

          {/* Sensor Device Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {sensors.map((sensor) => {
              const isAssigned = Boolean(sensor.room_id);
              const isDeassigning = actionLoading === `deassign-${sensor.sensor_id}`;
              const isAssigning = actionLoading === `assign-${sensor.sensor_id}`;
              const isSimulating = actionLoading === `sim-${sensor.sensor_id}`;
              const currentTarget = targetRooms[sensor.sensor_id] || (isAssigned ? sensor.room_id : rooms[0] || 'room238');
              const isCustomRoom = currentTarget === '__custom__';

              return (
                <div
                  key={sensor.sensor_id}
                  style={{
                    background: '#ffffff',
                    border: isAssigned ? '1px solid #cbd5e1' : '1px dashed #f59e0b',
                    borderRadius: '20px',
                    padding: '1.5rem',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem'
                  }}
                >
                  {/* Top line: Device Identity & Location Badge */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>
                          {sensor.name}
                        </h4>
                        <span style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '0.75rem',
                          background: '#f1f5f9',
                          color: '#475569',
                          padding: '0.2rem 0.55rem',
                          borderRadius: '6px',
                          border: '1px solid #e2e8f0'
                        }}>
                          {sensor.sensor_id}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                        <span>Hardware: <strong>{sensor.model}</strong></span>
                        {sensor.thing_name && <span>AWS Thing: <code>{sensor.thing_name}</code></span>}
                        {sensor.last_seen && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <Clock size={12} /> Last signal: {new Date(sensor.last_seen).toLocaleTimeString()}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Location status badge */}
                    <div>
                      {isAssigned ? (
                        <span 
                          className="badge badge-mint" 
                          style={{ cursor: 'pointer', fontSize: '0.82rem', padding: '0.35rem 0.85rem' }} 
                          onClick={() => onSelectRoom(sensor.room_id)}
                          title="Click to view this room's dashboard"
                        >
                          <CheckCircle2 size={14} />
                          Currently in: <strong>{sensor.room_id}</strong>
                        </span>
                      ) : (
                        <span className="badge badge-amber" style={{ fontSize: '0.82rem', padding: '0.35rem 0.85rem' }}>
                          <AlertTriangle size={14} />
                          Standby (Not in any room)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Association Box */}
                  <div style={{
                    background: isAssigned ? '#f0fdf4' : '#fffbeb',
                    border: '1px solid ' + (isAssigned ? '#bbf7d0' : '#fde68a'),
                    borderRadius: '14px',
                    padding: '1rem 1.25rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem'
                  }}>
                    <div style={{ fontSize: '0.82rem', color: isAssigned ? '#166534' : '#92400e' }}>
                      {isAssigned ? (
                        <span>
                          📍 <strong>Location Status:</strong> This physical device is placed in <strong>{sensor.room_id}</strong>. Any motion detected by the ESP32 sensor is recorded as occupancy for <strong>{sensor.room_id}</strong>.
                        </span>
                      ) : (
                        <span>
                          ⚠️ <strong>Location Status:</strong> This hardware device is currently not placed in any room. To capture occupancy data, select a room below and assign it.
                        </span>
                      )}
                    </div>

                    {/* Controls Row */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', paddingTop: '0.25rem' }}>
                      
                      {/* Left: Move to another room selector */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#475569' }}>
                          {isAssigned ? 'Move device to:' : 'Place device in:'}
                        </span>

                        <select
                          value={currentTarget}
                          onChange={(e) => setTargetRooms({ ...targetRooms, [sensor.sensor_id]: e.target.value })}
                          style={{
                            padding: '0.45rem 0.75rem',
                            borderRadius: '9px',
                            border: '1px solid #cbd5e1',
                            fontSize: '0.82rem',
                            background: '#ffffff',
                            fontWeight: 600,
                            color: '#0f172a'
                          }}
                        >
                          {rooms.map(r => (
                            <option key={r} value={r}>
                              {r} {r === sensor.room_id ? '(Current Location)' : ''}
                            </option>
                          ))}
                          <option value="__custom__">+ Enter Custom Room Name...</option>
                        </select>

                        {isCustomRoom && (
                          <input
                            type="text"
                            placeholder="e.g. room104"
                            value={customRoomInputs[sensor.sensor_id] || ''}
                            onChange={(e) => setCustomRoomInputs({ ...customRoomInputs, [sensor.sensor_id]: e.target.value })}
                            style={{
                              padding: '0.45rem 0.75rem',
                              borderRadius: '9px',
                              border: '1px solid #cbd5e1',
                              fontSize: '0.82rem',
                              width: '130px'
                            }}
                          />
                        )}

                        <button
                          onClick={() => handleAssign(sensor.sensor_id)}
                          disabled={isAssigning}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            padding: '0.45rem 0.95rem',
                            borderRadius: '9px',
                            fontSize: '0.82rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            background: '#0284c7',
                            color: '#ffffff',
                            border: 'none',
                            boxShadow: '0 2px 6px rgba(2, 132, 199, 0.2)'
                          }}
                        >
                          {isAssigning ? 'Moving...' : (isAssigned ? 'Move Device' : 'Place in Room')}
                        </button>
                      </div>

                      {/* Right: De-assign and Test pulse */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        {isAssigned && (
                          <button
                            onClick={() => handleDeassign(sensor.sensor_id)}
                            disabled={isDeassigning}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.4rem',
                              padding: '0.45rem 0.85rem',
                              borderRadius: '9px',
                              fontSize: '0.8rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              background: '#ffe4e6',
                              color: '#be123c',
                              border: '1px solid #fecdd3'
                            }}
                            title="Remove device from room (e.g. while unplugged or moving to another room)"
                          >
                            <Unlink size={13} />
                            {isDeassigning ? 'Removing...' : 'De-assign from Room'}
                          </button>
                        )}

                        <button
                          onClick={async () => {
                            setActionLoading(`sim-${sensor.sensor_id}`);
                            try {
                              await onSimulateSensor(sensor.sensor_id);
                              showFeedback(`Simulated motion triggered for ${sensor.name}`);
                            } catch (e) {
                              showFeedback(`Simulation error: ${e.message}`, 'error');
                            } finally {
                              setActionLoading(null);
                            }
                          }}
                          disabled={isSimulating}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            padding: '0.45rem 0.8rem',
                            borderRadius: '9px',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            background: '#ffffff',
                            color: '#475569',
                            border: '1px solid #cbd5e1'
                          }}
                          title="Simulate a motion event from this hardware node"
                        >
                          <Zap size={13} />
                          {isSimulating ? 'Sending...' : 'Test Pulse'}
                        </button>

                        {/* Allow deleting secondary device if more than 1 */}
                        {sensors.length > 1 && (
                          <button
                            onClick={() => handleDelete(sensor.sensor_id)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#94a3b8',
                              cursor: 'pointer',
                              padding: '0.35rem'
                            }}
                            title="Remove this device entry"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Footer */}
        <div style={{
          padding: '1.1rem 1.75rem',
          borderTop: '1px solid #f1f5f9',
          background: '#f8fafc',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
            A physical sensor can only be in one room at a time. Relocate it anytime using <strong>Move Device</strong>.
          </span>
          <button
            onClick={onClose}
            className="btn btn-secondary"
            style={{ fontSize: '0.82rem', padding: '0.45rem 1.1rem' }}
          >
            Done & Close
          </button>
        </div>
      </div>
    </div>
  );
}
