import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Sparkles, Send, RefreshCw, MessageCircle, FileText, Lightbulb, ChevronDown, Bot, User, Zap, X } from 'lucide-react';

const API_BASE = 'http://localhost:5000';

/**
 * Simple markdown-lite renderer: handles **bold**, bullet points, headings, code, and horizontal rules
 */
function renderMarkdown(text) {
  if (!text) return null;

  const lines = text.split('\n');
  const elements = [];

  lines.forEach((line, i) => {
    // Horizontal rule
    if (line.trim() === '---' || line.trim() === '***') {
      elements.push(<hr key={i} style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '0.75rem 0' }} />);
      return;
    }

    // Heading lines (## or **...**)
    if (line.startsWith('## ') || line.startsWith('### ')) {
      const text = line.replace(/^#{2,3}\s/, '');
      elements.push(
        <div key={i} style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f172a', marginTop: '0.6rem', marginBottom: '0.25rem' }}>
          {renderInline(text)}
        </div>
      );
      return;
    }

    // Empty line
    if (line.trim() === '') {
      elements.push(<div key={i} style={{ height: '0.35rem' }} />);
      return;
    }

    // Bullet point
    if (line.trimStart().startsWith('• ') || line.trimStart().startsWith('- ') || line.trimStart().startsWith('* ')) {
      const indent = line.length - line.trimStart().length;
      const content = line.trimStart().substring(2);
      elements.push(
        <div key={i} style={{
          display: 'flex',
          gap: '0.5rem',
          paddingLeft: `${Math.max(0, indent * 0.35)}rem`,
          marginBottom: '0.15rem',
          lineHeight: 1.55
        }}>
          <span style={{ color: '#6366f1', fontWeight: 700, flexShrink: 0 }}>•</span>
          <span>{renderInline(content)}</span>
        </div>
      );
      return;
    }

    // Normal paragraph
    elements.push(
      <div key={i} style={{ lineHeight: 1.55, marginBottom: '0.1rem' }}>
        {renderInline(line)}
      </div>
    );
  });

  return elements;
}

/**
 * Render inline markdown: **bold**, `code`, *italic*
 */
function renderInline(text) {
  const parts = [];
  // Match **bold**, `code`, *italic*, and plain text
  const regex = /(\*\*(.+?)\*\*)|(`(.+?)`)|(\*(.+?)\*)|([^*`]+)/g;
  let match;
  let idx = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match[1]) {
      // **bold**
      parts.push(<strong key={idx++} style={{ fontWeight: 700, color: '#0f172a' }}>{match[2]}</strong>);
    } else if (match[3]) {
      // `code`
      parts.push(
        <code key={idx++} style={{
          background: '#f1f5f9',
          padding: '0.1rem 0.35rem',
          borderRadius: '5px',
          fontSize: '0.82em',
          fontFamily: 'var(--font-mono)',
          color: '#6366f1',
          border: '1px solid #e2e8f0'
        }}>{match[4]}</code>
      );
    } else if (match[5]) {
      // *italic*
      parts.push(<em key={idx++} style={{ fontStyle: 'italic', color: '#64748b' }}>{match[6]}</em>);
    } else if (match[7]) {
      parts.push(<span key={idx++}>{match[7]}</span>);
    }
  }

  return parts.length > 0 ? parts : text;
}


export default function AICopilot({ selectedRoom }) {
  const [activeTab, setActiveTab] = useState('report'); // 'report' | 'chat'
  const [isExpanded, setIsExpanded] = useState(true);

  // Report state
  const [report, setReport] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportSource, setReportSource] = useState('');

  // Chat state
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);

  const chatEndRef = useRef(null);
  const inputRef = useRef(null);

  // Fetch AI insights report
  const fetchReport = useCallback(async () => {
    setReportLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/ai/insights/${selectedRoom}?range=week`);
      if (res.ok) {
        const data = await res.json();
        setReport(data.report);
        setReportSource(data.source === 'gemini' ? `Google Gemini (${data.model})` : 'Local Analytics Engine');
      }
    } catch (err) {
      console.error('[AI Copilot] Error fetching report:', err);
      setReport('⚠️ Could not connect to the AI backend. Make sure the server is running on port 5000.');
    } finally {
      setReportLoading(false);
    }
  }, [selectedRoom]);

  // Fetch suggested questions
  const fetchSuggestions = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/ai/suggestions/${selectedRoom}`);
      if (res.ok) {
        const data = await res.json();
        setSuggestions(data.suggestions || []);
      }
    } catch (err) {
      console.error('[AI Copilot] Error fetching suggestions:', err);
    }
  }, [selectedRoom]);

  // Load report and suggestions when room changes
  useEffect(() => {
    fetchReport();
    fetchSuggestions();
    setMessages([]);
  }, [selectedRoom, fetchReport, fetchSuggestions]);

  // Auto-scroll chat
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Send chat message
  const sendMessage = async (questionText) => {
    const question = questionText || inputValue.trim();
    if (!question || chatLoading) return;

    setInputValue('');
    const userMsg = { role: 'user', text: question, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setChatLoading(true);

    try {
      // Build conversation history for context
      const history = messages.map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        text: m.text
      }));

      const res = await fetch(`${API_BASE}/api/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room_id: selectedRoom,
          question,
          history
        })
      });

      if (res.ok) {
        const data = await res.json();
        const aiMsg = {
          role: 'model',
          text: data.answer,
          source: data.source,
          timestamp: data.timestamp
        };
        setMessages(prev => [...prev, aiMsg]);
      } else {
        setMessages(prev => [...prev, {
          role: 'model',
          text: '⚠️ Sorry, I couldn\'t process that request. Please try again.',
          source: 'error',
          timestamp: new Date().toISOString()
        }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'model',
        text: '⚠️ Connection error. Make sure the backend server is running.',
        source: 'error',
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="pastel-card ai-copilot-card" style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '0',
      overflow: 'hidden',
      padding: 0,
      position: 'relative'
    }}>
      {/* Gradient accent bar */}
      <div style={{
        height: '4px',
        background: 'linear-gradient(90deg, #6366f1, #8b5cf6, #a78bfa, #c084fc)',
        borderRadius: '20px 20px 0 0'
      }} />

      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '1rem 1.35rem 0.75rem',
        borderBottom: '1px solid #f1f5f9'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #e0e7ff, #c7d2fe)',
            border: '1px solid #a5b4fc',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(99, 102, 241, 0.15)'
          }}>
            <Sparkles size={18} color="#6366f1" />
          </div>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', lineHeight: 1.2, letterSpacing: '-0.01em' }}>
              RoomPulse AI
            </h3>
            <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
              Building Intelligence Copilot
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className="badge badge-lavender" style={{ fontSize: '0.7rem', padding: '0.2rem 0.55rem' }}>
            <Zap size={10} />
            {reportSource || 'AI'}
          </span>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            style={{
              background: 'none',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              cursor: 'pointer',
              padding: '0.3rem',
              display: 'flex',
              alignItems: 'center',
              color: '#94a3b8',
              transition: 'all 0.2s ease'
            }}
          >
            <ChevronDown size={16} style={{
              transform: isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)',
              transition: 'transform 0.25s ease'
            }} />
          </button>
        </div>
      </div>

      {isExpanded && (
        <>
          {/* Tab Switcher */}
          <div style={{
            display: 'flex',
            padding: '0.5rem 1.35rem',
            gap: '0.35rem',
            borderBottom: '1px solid #f1f5f9'
          }}>
            <button
              onClick={() => setActiveTab('report')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.4rem 0.85rem',
                borderRadius: '9px',
                fontSize: '0.82rem',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.18s ease',
                fontFamily: 'var(--font-main)',
                background: activeTab === 'report' ? '#e0e7ff' : 'transparent',
                color: activeTab === 'report' ? '#4338ca' : '#64748b',
                boxShadow: activeTab === 'report' ? '0 1px 4px rgba(99, 102, 241, 0.12)' : 'none'
              }}
            >
              <FileText size={14} />
              Intelligence Report
            </button>
            <button
              onClick={() => setActiveTab('chat')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.4rem 0.85rem',
                borderRadius: '9px',
                fontSize: '0.82rem',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.18s ease',
                fontFamily: 'var(--font-main)',
                background: activeTab === 'chat' ? '#e0e7ff' : 'transparent',
                color: activeTab === 'chat' ? '#4338ca' : '#64748b',
                boxShadow: activeTab === 'chat' ? '0 1px 4px rgba(99, 102, 241, 0.12)' : 'none'
              }}
            >
              <MessageCircle size={14} />
              Ask AI
            </button>
          </div>

          {/* Content Area */}
          <div style={{ flex: 1, minHeight: 0 }}>

            {/* ========== REPORT TAB ========== */}
            {activeTab === 'report' && (
              <div style={{ padding: '1rem 1.35rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {/* Refresh button */}
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    onClick={fetchReport}
                    disabled={reportLoading}
                    className="btn btn-secondary"
                    style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem', gap: '0.35rem' }}
                  >
                    <RefreshCw size={13} style={{
                      animation: reportLoading ? 'spin 1s linear infinite' : 'none'
                    }} />
                    {reportLoading ? 'Generating...' : 'Regenerate Report'}
                  </button>
                </div>

                {/* Report content */}
                {reportLoading ? (
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '3rem 1rem',
                    gap: '1rem'
                  }}>
                    <div className="ai-thinking-dots">
                      <span /><span /><span />
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#6366f1', fontWeight: 600 }}>
                      Analyzing room sensor data...
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                      Computing occupancy patterns, energy metrics & anomalies
                    </div>
                  </div>
                ) : report ? (
                  <div style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '14px',
                    padding: '1.25rem',
                    fontSize: '0.84rem',
                    color: '#334155',
                    maxHeight: '520px',
                    overflowY: 'auto',
                    lineHeight: 1.6
                  }}>
                    {renderMarkdown(report)}
                  </div>
                ) : null}
              </div>
            )}

            {/* ========== CHAT TAB ========== */}
            {activeTab === 'chat' && (
              <div style={{ display: 'flex', flexDirection: 'column', height: '520px' }}>
                {/* Suggestion pills (show when no messages) */}
                {messages.length === 0 && (
                  <div style={{ padding: '1rem 1.35rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    <div style={{
                      textAlign: 'center',
                      padding: '1.5rem 1rem 0.5rem'
                    }}>
                      <div style={{
                        width: '52px',
                        height: '52px',
                        borderRadius: '16px',
                        background: 'linear-gradient(135deg, #e0e7ff, #c7d2fe)',
                        border: '1px solid #a5b4fc',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 0.75rem',
                        boxShadow: '0 6px 20px rgba(99, 102, 241, 0.15)'
                      }}>
                        <Bot size={26} color="#6366f1" />
                      </div>
                      <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '1rem' }}>
                        Ask about {selectedRoom.replace('room', 'Room ')}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                        I can analyze occupancy patterns, energy usage, anomalies, and more
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem', justifyContent: 'center' }}>
                      {suggestions.map((q, i) => (
                        <button
                          key={i}
                          onClick={() => sendMessage(q)}
                          style={{
                            background: '#ffffff',
                            border: '1px solid #e2e8f0',
                            borderRadius: '20px',
                            padding: '0.45rem 0.85rem',
                            fontSize: '0.78rem',
                            color: '#4338ca',
                            cursor: 'pointer',
                            fontFamily: 'var(--font-main)',
                            fontWeight: 500,
                            transition: 'all 0.18s ease',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.background = '#e0e7ff';
                            e.currentTarget.style.borderColor = '#a5b4fc';
                            e.currentTarget.style.transform = 'translateY(-1px)';
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.background = '#ffffff';
                            e.currentTarget.style.borderColor = '#e2e8f0';
                            e.currentTarget.style.transform = 'translateY(0)';
                          }}
                        >
                          <Lightbulb size={12} />
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Messages */}
                {messages.length > 0 && (
                  <div style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '1rem 1.35rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem'
                  }}>
                    {messages.map((msg, i) => (
                      <div key={i} style={{
                        display: 'flex',
                        gap: '0.65rem',
                        alignItems: 'flex-start',
                        flexDirection: msg.role === 'user' ? 'row-reverse' : 'row'
                      }}>
                        {/* Avatar */}
                        <div style={{
                          width: '30px',
                          height: '30px',
                          borderRadius: '10px',
                          background: msg.role === 'user'
                            ? 'linear-gradient(135deg, #e0f2fe, #bae6fd)'
                            : 'linear-gradient(135deg, #e0e7ff, #c7d2fe)',
                          border: `1px solid ${msg.role === 'user' ? '#7dd3fc' : '#a5b4fc'}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          {msg.role === 'user'
                            ? <User size={14} color="#0284c7" />
                            : <Sparkles size={14} color="#6366f1" />
                          }
                        </div>

                        {/* Message bubble */}
                        <div style={{
                          background: msg.role === 'user' ? '#e0f2fe' : '#f8fafc',
                          border: `1px solid ${msg.role === 'user' ? '#bae6fd' : '#e2e8f0'}`,
                          borderRadius: msg.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                          padding: '0.75rem 1rem',
                          maxWidth: '85%',
                          fontSize: '0.84rem',
                          color: '#334155',
                          lineHeight: 1.55
                        }}>
                          {msg.role === 'user' ? msg.text : renderMarkdown(msg.text)}
                          {msg.source && msg.role !== 'user' && (
                            <div style={{
                              fontSize: '0.65rem',
                              color: '#94a3b8',
                              marginTop: '0.45rem',
                              paddingTop: '0.35rem',
                              borderTop: '1px solid #e2e8f0'
                            }}>
                              Powered by {msg.source === 'gemini' ? 'Google Gemini' : 'Local Analytics Engine'}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}

                    {/* Thinking indicator */}
                    {chatLoading && (
                      <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'flex-start' }}>
                        <div style={{
                          width: '30px',
                          height: '30px',
                          borderRadius: '10px',
                          background: 'linear-gradient(135deg, #e0e7ff, #c7d2fe)',
                          border: '1px solid #a5b4fc',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          <Sparkles size={14} color="#6366f1" />
                        </div>
                        <div style={{
                          background: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          borderRadius: '14px 14px 14px 4px',
                          padding: '0.75rem 1rem'
                        }}>
                          <div className="ai-thinking-dots">
                            <span /><span /><span />
                          </div>
                        </div>
                      </div>
                    )}

                    <div ref={chatEndRef} />
                  </div>
                )}

                {/* Input bar */}
                <div style={{
                  padding: '0.75rem 1.35rem',
                  borderTop: '1px solid #f1f5f9',
                  display: 'flex',
                  gap: '0.5rem',
                  alignItems: 'center',
                  background: '#ffffff'
                }}>
                  {messages.length > 0 && (
                    <button
                      onClick={() => setMessages([])}
                      title="Clear conversation"
                      style={{
                        background: 'none',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        padding: '0.45rem',
                        display: 'flex',
                        alignItems: 'center',
                        color: '#94a3b8',
                        flexShrink: 0,
                        transition: 'all 0.15s ease'
                      }}
                      onMouseEnter={e => { e.currentTarget.style.color = '#e11d48'; e.currentTarget.style.borderColor = '#fecdd3'; }}
                      onMouseLeave={e => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
                    >
                      <X size={14} />
                    </button>
                  )}
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={e => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask about occupancy, energy, anomalies..."
                    disabled={chatLoading}
                    style={{
                      flex: 1,
                      padding: '0.6rem 0.9rem',
                      borderRadius: '12px',
                      border: '1px solid #e2e8f0',
                      fontSize: '0.84rem',
                      fontFamily: 'var(--font-main)',
                      outline: 'none',
                      color: '#0f172a',
                      background: '#f8fafc',
                      transition: 'border-color 0.2s ease, box-shadow 0.2s ease'
                    }}
                    onFocus={e => {
                      e.target.style.borderColor = '#a5b4fc';
                      e.target.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.08)';
                    }}
                    onBlur={e => {
                      e.target.style.borderColor = '#e2e8f0';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                  <button
                    onClick={() => sendMessage()}
                    disabled={!inputValue.trim() || chatLoading}
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '12px',
                      border: 'none',
                      cursor: inputValue.trim() && !chatLoading ? 'pointer' : 'not-allowed',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      transition: 'all 0.18s ease',
                      background: inputValue.trim() && !chatLoading
                        ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                        : '#f1f5f9',
                      color: inputValue.trim() && !chatLoading ? '#ffffff' : '#94a3b8',
                      boxShadow: inputValue.trim() && !chatLoading
                        ? '0 4px 12px rgba(99, 102, 241, 0.3)'
                        : 'none'
                    }}
                  >
                    <Send size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
