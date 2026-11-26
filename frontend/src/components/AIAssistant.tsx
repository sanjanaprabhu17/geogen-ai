import React, { useState, useRef, useEffect } from 'react';
import {
  X, Send, Sparkles, RefreshCw, ChevronRight
} from 'lucide-react';
import type { TripItinerary } from '../types';
import { api } from '../services/api';

interface AIAssistantProps {
  trip?: TripItinerary | null;
  theme?: 'dark' | 'light';
}

interface ChatMessageItem {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  suggestedFollowups?: string[];
}

export const AIAssistant: React.FC<AIAssistantProps> = ({ trip, theme: _theme = 'dark' }) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [input, setInput] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const defaultDest = trip?.destination?.split(',')[0] || 'your destination';

  const DEFAULT_SUGGESTIONS = trip ? [
    `What is the best time to visit ${defaultDest}?`,
    `Are there dress codes for temples in ${defaultDest}?`,
    `How do I launch Google Maps navigation?`,
    `What local culinary specialties should I try?`
  ] : [
    "How does the Origin to Destination routing work?",
    "Can I plan trips to any city across India?",
    "How do I navigate routes in Google Maps?",
    "What are the luggage and packing essentials for India?"
  ];

  // Auto-scroll to latest message
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setUnreadCount(0);
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, messages]);

  // Initial welcome message
  useEffect(() => {
    if (messages.length === 0) {
      const greeting = trip 
        ? `Namaste! I am your **GeoGen AI Travel Concierge**. I am here to help with your upcoming journey from **${trip.source_location || 'your origin'}** to **${trip.destination}**.\n\nYou can ask me about temple dress codes, ticket bookings, Google Maps GPS handoff, packing tips, or local food recommendations.`
        : `Namaste! I am your **GeoGen AI Travel Concierge**. Ask me anything about Indian travel planning, nationwide destination recommendations, live Mapbox navigation, or customer support queries.`;

      setMessages([
        {
          id: 'welcome_msg',
          role: 'assistant',
          content: greeting,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          suggestedFollowups: DEFAULT_SUGGESTIONS
        }
      ]);
    }
  }, [trip]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || loading) return;

    const userMsg: ChatMessageItem = {
      id: `usr_${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const tripContext = trip ? {
        source_location: trip.source_location || 'Current Location',
        destination: trip.destination,
        duration_days: trip.duration_days,
        travellers: trip.travellers,
        transport_mode: trip.transport_mode,
        stops: trip.days.flatMap(d => d.stops.map(s => s.place.name)),
        budget: trip.budget_breakdown?.total_estimated
      } : undefined;

      const history = messages.slice(-4).map(m => ({
        role: m.role,
        content: m.content
      }));

      const res = await api.chatWithAssistant(text, tripContext, history);

      const assistantMsg: ChatMessageItem = {
        id: `ast_${Date.now()}`,
        role: 'assistant',
        content: res.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestedFollowups: res.suggested_followups
      };

      setMessages(prev => [...prev, assistantMsg]);
      if (!isOpen) {
        setUnreadCount(c => c + 1);
      }
    } catch (err: any) {
      const errorMsg: ChatMessageItem = {
        id: `err_${Date.now()}`,
        role: 'assistant',
        content: "I'm temporarily having trouble connecting to live services, but I can help you with Google Maps navigation, monument dress codes, and trip export. Please ask again or select one of the suggested prompts below.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestedFollowups: DEFAULT_SUGGESTIONS
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: `init_${Date.now()}`,
        role: 'assistant',
        content: `Chat history cleared. How can I assist you with ${trip ? trip.destination : 'your travel plans'}?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestedFollowups: DEFAULT_SUGGESTIONS
      }
    ]);
  };

  // Simple Markdown renderer helper for bolding and bullet points
  const renderFormattedContent = (content: string) => {
    const lines = content.split('\n');
    return lines.map((line, idx) => {
      // Bold text formatting
      const parts = line.split(/(\*\*.*?\*\*)/g);
      const parsedLine = parts.map((part, pIdx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={pIdx}>{part.slice(2, -2)}</strong>;
        }
        return part;
      });

      if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        return (
          <div key={idx} style={{ display: 'flex', gap: '0.4rem', marginTop: '0.25rem', marginBottom: '0.25rem' }}>
            <span style={{ color: 'var(--accent-primary)' }}>•</span>
            <span>{parsedLine}</span>
          </div>
        );
      }

      if (line.trim().startsWith('1. ') || line.trim().startsWith('2. ') || line.trim().startsWith('3. ') || line.trim().startsWith('4. ')) {
        return (
          <div key={idx} style={{ marginTop: '0.25rem', marginBottom: '0.25rem' }}>
            <span>{parsedLine}</span>
          </div>
        );
      }

      return (
        <p key={idx} style={{ margin: line.trim() ? '0.35rem 0' : '0.5rem 0' }}>
          {parsedLine}
        </p>
      );
    });
  };

  return (
    <>
      {/* FLOATING TRIGGER BUTTON */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            padding: '0.75rem 1.25rem',
            backgroundColor: 'var(--text-main)',
            color: 'var(--bg-primary)',
            borderRadius: '9999px',
            border: '2px solid var(--accent-primary)',
            boxShadow: '0 8px 24px rgba(56, 189, 248, 0.35)',
            cursor: 'pointer',
            fontWeight: 700,
            fontSize: '0.88rem',
            transition: 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)'
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.05)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        >
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Sparkles size={18} color="#F97316" />
            <div style={{
              position: 'absolute',
              top: '-3px',
              right: '-3px',
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: '#10B981',
              boxShadow: '0 0 6px #10B981'
            }} />
          </div>
          <span>AI Travel Concierge</span>
          {unreadCount > 0 && (
            <span style={{
              backgroundColor: '#EF4444',
              color: '#FFFFFF',
              borderRadius: '9999px',
              padding: '0.1rem 0.45rem',
              fontSize: '0.72rem',
              fontWeight: 800
            }}>
              {unreadCount}
            </span>
          )}
        </button>
      )}

      {/* FLOATING CHAT WINDOW */}
      {isOpen && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 9999,
          width: 'clamp(320px, 92vw, 420px)',
          height: '560px',
          maxHeight: 'calc(100vh - 48px)',
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-dark)',
          borderRadius: '16px',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.45)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          {/* HEADER */}
          <div style={{
            padding: '1rem 1.25rem',
            borderBottom: '1px solid var(--border-dark)',
            backgroundColor: 'var(--bg-card)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <div style={{
                width: '34px',
                height: '34px',
                borderRadius: '50%',
                backgroundColor: 'rgba(56, 189, 248, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid var(--accent-primary)'
              }}>
                <Sparkles size={17} color="#38BDF8" />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-main)' }}>
                    GeoGen AI Concierge
                  </span>
                  <div style={{
                    width: '7px',
                    height: '7px',
                    borderRadius: '50%',
                    backgroundColor: '#10B981',
                    boxShadow: '0 0 5px #10B981'
                  }} />
                </div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  {trip ? `Assisting with ${trip.destination.split(',')[0]}` : 'Real-time Travel Intelligence'}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <button
                type="button"
                onClick={handleClearChat}
                title="Clear conversation"
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '0.35rem',
                  borderRadius: '4px'
                }}
              >
                <RefreshCw size={14} />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                title="Close Assistant"
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-main)',
                  cursor: 'pointer',
                  padding: '0.35rem',
                  borderRadius: '4px'
                }}
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* MESSAGE THREAD */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            backgroundColor: 'var(--bg-primary)'
          }}>
            {messages.map((msg) => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={msg.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: isUser ? 'flex-end' : 'flex-start',
                    maxWidth: '100%'
                  }}
                >
                  <div style={{
                    maxWidth: '85%',
                    padding: '0.75rem 1rem',
                    borderRadius: isUser ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                    backgroundColor: isUser ? 'var(--text-main)' : 'var(--bg-surface)',
                    color: isUser ? 'var(--bg-primary)' : 'var(--text-main)',
                    border: isUser ? 'none' : '1px solid var(--border-dark)',
                    fontSize: '0.85rem',
                    lineHeight: 1.5,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
                  }}>
                    {isUser ? msg.content : renderFormattedContent(msg.content)}
                    <div style={{
                      fontSize: '0.65rem',
                      textAlign: isUser ? 'right' : 'left',
                      marginTop: '0.35rem',
                      opacity: 0.65
                    }}>
                      {msg.timestamp}
                    </div>
                  </div>

                  {/* Follow-up question chips for assistant messages */}
                  {!isUser && msg.suggestedFollowups && msg.suggestedFollowups.length > 0 && (
                    <div style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '0.35rem',
                      marginTop: '0.5rem',
                      maxWidth: '92%'
                    }}>
                      {msg.suggestedFollowups.map((q, qIdx) => (
                        <button
                          key={qIdx}
                          onClick={() => handleSendMessage(q)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            padding: '0.3rem 0.6rem',
                            backgroundColor: 'var(--bg-card)',
                            border: '1px solid var(--border-dark)',
                            borderRadius: '9999px',
                            fontSize: '0.72rem',
                            color: 'var(--accent-primary)',
                            fontWeight: 600,
                            cursor: 'pointer',
                            textAlign: 'left',
                            transition: 'all 0.15s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'var(--bg-card-hover)';
                            e.currentTarget.style.borderColor = 'var(--accent-primary)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'var(--bg-card)';
                            e.currentTarget.style.borderColor = 'var(--border-dark)';
                          }}
                        >
                          <ChevronRight size={11} />
                          <span>{q}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {loading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                <Sparkles size={14} color="#38BDF8" className="animate-spin" />
                <span>GeoGen AI is thinking...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* INPUT FORM */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            style={{
              padding: '0.85rem 1rem',
              backgroundColor: 'var(--bg-surface)',
              borderTop: '1px solid var(--border-dark)',
              display: 'flex',
              gap: '0.5rem',
              alignItems: 'center'
            }}
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about tickets, Google Maps, food, customs..."
              disabled={loading}
              style={{
                flex: 1,
                padding: '0.65rem 0.9rem',
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-dark)',
                borderRadius: '8px',
                color: 'var(--text-main)',
                fontSize: '0.85rem'
              }}
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              style={{
                padding: '0.65rem 0.85rem',
                backgroundColor: input.trim() ? 'var(--text-main)' : 'var(--bg-card)',
                color: input.trim() ? 'var(--bg-primary)' : 'var(--text-muted)',
                border: '1px solid var(--border-dark)',
                borderRadius: '8px',
                cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Send size={15} />
            </button>
          </form>
        </div>
      )}
    </>
  );
};
