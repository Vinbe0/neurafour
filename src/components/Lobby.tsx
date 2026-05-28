import React, { useState, useEffect, useRef } from 'react';
import { Send, Copy, Check, Users, ShieldAlert, ArrowLeft, Loader2, MessageSquare } from 'lucide-react';
import type { UserProfile, ChatMessage } from '../types';
import { playClick } from '../sound';

interface LobbyProps {
  profile: UserProfile;
  roomCode: string | null;
  side: 'red' | 'yellow' | null;
  opponent: { username: string; avatar: string } | null;
  chatHistory: ChatMessage[];
  onConnectWebSocket: (roomCode: string | null, action: 'create' | 'join') => void;
  onSendChatMessage: (text: string) => void;
  onLeaveLobby: () => void;
}

export const Lobby: React.FC<LobbyProps> = ({
  profile,
  roomCode,
  side,
  opponent,
  chatHistory,
  onConnectWebSocket,
  onSendChatMessage,
  onLeaveLobby,
}) => {
  const [inputCode, setInputCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [chatText, setChatText] = useState('');
  const [connecting, setConnecting] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  // Read URL search params on mount to auto-fill join code
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) {
      setInputCode(roomParam.toUpperCase());
    }
  }, []);

  const handleCreate = () => {
    playClick();
    setConnecting(true);
    onConnectWebSocket(null, 'create');
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputCode.trim()) return;
    playClick();
    setConnecting(true);
    onConnectWebSocket(inputCode.trim().toUpperCase(), 'join');
  };

  // Turn off spinner when room details arrive
  useEffect(() => {
    if (roomCode) {
      setConnecting(false);
    }
  }, [roomCode]);

  const handleCopyLink = () => {
    playClick();
    if (!roomCode) return;
    const joinUrl = `${window.location.origin}${window.location.pathname}?room=${roomCode}`;
    navigator.clipboard.writeText(joinUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatText.trim()) return;
    playClick();
    onSendChatMessage(chatText.trim());
    setChatText('');
  };

  return (
    <div style={{ width: '100%', maxWidth: '800px', margin: '0 auto' }}>
      
      {/* NO ROOM CONNECTED (LOBBY HUB) */}
      {!roomCode ? (
        <div className="glass-panel" style={{ padding: '40px 30px', textAlign: 'center', position: 'relative' }}>
          <Users className="neon-text-cyan" size={48} style={{ margin: '0 auto 15px', animation: 'blink-glow 2s infinite' }} />
          <h2 className="display-font" style={{ fontSize: '1.8rem', background: 'linear-gradient(to right, #00f0ff, #ff007f)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '10px' }}>
            МУЛЬТИПЛЕЕР АРЕНА / MULTIPLAYER DUEL
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: '500px', margin: '0 auto 30px', lineHeight: '1.5' }}>
            Сразитесь с друзьями в реальном времени! Создайте приватную комнату или подключитесь по коду.
          </p>

          {connecting ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px', padding: '20px' }}>
              <Loader2 className="animate-spin" size={36} style={{ animation: 'rotate-dash 1.5s linear infinite', color: 'var(--accent-cyan)' }} />
              <span className="display-font" style={{ fontSize: '0.85rem', color: 'var(--accent-cyan)' }}>
                ПОДКЛЮЧЕНИЕ К СЕТИ / SECURING CHANNEL...
              </span>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', maxWidth: '600px', margin: '0 auto', textAlign: 'left' }}>
              
              {/* Option A: Create Room */}
              <div className="glass-panel" style={{ padding: '25px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(0, 240, 255, 0.1)' }}>
                <h3 className="display-font neon-text-cyan" style={{ fontSize: '1rem', marginBottom: '10px' }}>
                  СОЗДАТЬ БОЙ / HOST GAME
                </h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '20px', minHeight: '36px' }}>
                  Получите уникальную ссылку и отправьте её другу для мгновенного подключения.
                </p>
                <button className="glass-button active" onClick={handleCreate} style={{ width: '100%', justifyContent: 'center' }}>
                  Создать Лобби
                </button>
              </div>

              {/* Option B: Join Room */}
              <div className="glass-panel" style={{ padding: '25px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255, 0, 127, 0.1)' }}>
                <h3 className="display-font neon-text-pink" style={{ fontSize: '1rem', marginBottom: '10px' }}>
                  ВОЙТИ В БОЙ / JOIN LOBBY
                </h3>
                <form onSubmit={handleJoin}>
                  <label className="cyber-label" style={{ fontSize: '0.65rem' }}>Код Комнаты / Room Code</label>
                  <input
                    type="text"
                    maxLength={5}
                    value={inputCode}
                    onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                    className="cyber-input"
                    placeholder="ABCDE"
                    style={{ marginBottom: '15px', textTransform: 'uppercase', textAlign: 'center', letterSpacing: '0.2em', fontSize: '1.1rem' }}
                    required
                  />
                  <button type="submit" className="glass-button pink" style={{ width: '100%', justifyContent: 'center' }}>
                    Подключиться
                  </button>
                </form>
              </div>

            </div>
          )}

          {/* Quick Troubleshooting reminder */}
          <div style={{ marginTop: '35px', display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            <ShieldAlert size={14} />
            <span>Убедитесь, что сервер мультиплеера запущен локально на порту 5001 (`npm run server`).</span>
          </div>

        </div>
      ) : (
        /* CONNECTED ROOM CONTAINER */
        <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '20px' }}>
          
          {/* Left panel: Room info & Player Slots */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Room Lobby Details */}
            <div className="glass-panel" style={{ padding: '20px' }}>
              <button 
                onClick={() => { playClick(); onLeaveLobby(); }}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', cursor: 'pointer', marginBottom: '15px' }}
              >
                <ArrowLeft size={14} />
                <span>Покинуть / Exit</span>
              </button>

              <span className="cyber-label" style={{ fontSize: '0.65rem' }}>Комната / Room</span>
              <h2 className="display-font neon-text-cyan" style={{ fontSize: '1.8rem', letterSpacing: '0.05em', marginBottom: '15px', textAlign: 'center' }}>
                {roomCode}
              </h2>

              {/* Copy room invite links */}
              <button
                className="glass-button"
                onClick={handleCopyLink}
                style={{ width: '100%', justifyContent: 'center', fontSize: '0.75rem', padding: '8px 12px' }}
              >
                {copied ? (
                  <>
                    <Check size={14} style={{ color: 'var(--accent-green)' }} />
                    <span>ССЫЛКА СКОПИРОВАНА</span>
                  </>
                ) : (
                  <>
                    <Copy size={14} />
                    <span>КОПИРОВАТЬ ССЫЛКУ</span>
                  </>
                )}
              </button>
            </div>

            {/* Players Slots Card */}
            <div className="glass-panel" style={{ padding: '20px', flex: 1 }}>
              <h4 className="display-font neon-text-pink" style={{ fontSize: '0.8rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '6px', marginBottom: '15px' }}>
                БОЙЦЫ / FIGHTERS
              </h4>

              {/* Player 1 Slot */}
              <div className="glass-panel" style={{
                display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 15px',
                borderLeft: '4px solid var(--accent-pink)', background: 'rgba(0,0,0,0.15)', marginBottom: '12px'
              }}>
                <span style={{ fontSize: '1.2rem' }}>
                  {side === 'red' ? profile.avatar : (opponent?.avatar || '🤖')}
                </span>
                <div>
                  <span className="display-font" style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>
                    {side === 'red' ? profile.username : (opponent?.username || 'Оппонент')}
                  </span>
                  <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Хозяин / Host (Красные)</div>
                </div>
              </div>

              {/* Player 2 Slot */}
              {opponent || side === 'yellow' ? (
                <div className="glass-panel" style={{
                  display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 15px',
                  borderLeft: '4px solid var(--accent-cyan)', background: 'rgba(0,0,0,0.15)'
                }}>
                  <span style={{ fontSize: '1.2rem' }}>
                    {side === 'yellow' ? profile.avatar : (opponent?.avatar || '🤖')}
                  </span>
                  <div>
                    <span className="display-font" style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>
                      {side === 'yellow' ? profile.username : (opponent?.username || 'Оппонент')}
                    </span>
                    <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Гость / Challenger (Синие)</div>
                  </div>
                </div>
              ) : (
                <div className="glass-panel" style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '15px',
                  border: '1px dashed rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.05)', textAlign: 'center'
                }}>
                  <Loader2 className="animate-spin" size={14} style={{ animation: 'rotate-dash 1.5s linear infinite', color: 'var(--accent-cyan)' }} />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                    Ожидание соперника...
                  </span>
                </div>
              )}
            </div>

          </div>

          {/* Right panel: Live Duel Chat room */}
          <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', height: '400px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '10px', marginBottom: '15px' }}>
              <MessageSquare className="neon-text-cyan" size={18} />
              <h4 className="display-font" style={{ fontSize: '0.85rem' }}>
                ЛОКАЛЬНЫЙ РАДИОКАНАЛ / LIVE GRID CHAT
              </h4>
            </div>

            {/* Chat message thread container */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              paddingRight: '4px',
              marginBottom: '15px'
            }}>
              {chatHistory.length === 0 ? (
                <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--text-secondary)', fontStyle: 'italic', fontSize: '0.8rem' }}>
                  Канал пуст. Напишите приветствие!
                </div>
              ) : (
                chatHistory.map((msg) => {
                  const isSelf = msg.username === profile.username;
                  return (
                    <div
                      key={msg.id}
                      style={{
                        display: 'flex',
                        gap: '8px',
                        alignSelf: isSelf ? 'flex-end' : 'flex-start',
                        maxWidth: '80%',
                        flexDirection: isSelf ? 'row-reverse' : 'row'
                      }}
                    >
                      {/* Avatar */}
                      <div style={{
                        width: '26px', height: '26px', borderRadius: '50%',
                        background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.85rem', flexShrink: 0,
                        border: isSelf ? '1px solid var(--accent-pink)' : '1px solid var(--accent-cyan)'
                      }}>
                        {msg.avatar}
                      </div>

                      {/* Text Bubble */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: isSelf ? 'flex-end' : 'flex-start' }}>
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginBottom: '2px' }}>
                          {msg.username} • {msg.time}
                        </span>
                        <div style={{
                          padding: '8px 12px',
                          borderRadius: '12px',
                          borderTopRightRadius: isSelf ? '2px' : '12px',
                          borderTopLeftRadius: isSelf ? '12px' : '2px',
                          background: isSelf ? 'rgba(255, 0, 127, 0.1)' : 'rgba(0, 240, 255, 0.1)',
                          border: isSelf ? '1px solid rgba(255, 0, 127, 0.2)' : '1px solid rgba(0, 240, 255, 0.2)',
                          fontSize: '0.85rem',
                          color: '#fff',
                          wordBreak: 'break-word'
                        }}>
                          {msg.text}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input Message Form */}
            <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                className="cyber-input"
                placeholder="Сообщение на сетку... / Say something..."
                value={chatText}
                onChange={(e) => setChatText(e.target.value)}
                style={{ fontSize: '0.85rem' }}
                disabled={!opponent && side === 'red'} // Host cannot chat until opponent joins
              />
              <button
                type="submit"
                className="glass-button active"
                style={{ padding: '10px', aspectRatio: '1', width: '42px', height: '42px', justifyContent: 'center' }}
                disabled={!opponent && side === 'red'}
              >
                <Send size={16} />
              </button>
            </form>
          </div>

        </div>
      )}

    </div>
  );
};
