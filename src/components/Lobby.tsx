import React, { useState, useEffect } from 'react';
import { Copy, Check, Users, ShieldAlert, ArrowLeft, Loader2 } from 'lucide-react';
import type { UserProfile, ChatMessage } from '../types';
import { playClick } from '../sound';
import { useI18n } from '../i18n';
import { ChatPanel } from './ChatPanel';

interface LobbyProps {
  profile: UserProfile;
  roomCode: string | null;
  side: 'red' | 'yellow' | null;
  opponent: { username: string; avatar: string } | null;
  chatHistory: ChatMessage[];
  onConnectWebSocket: (roomCode: string | null, action: 'create' | 'join') => void;
  onSendChatMessage: (text: string) => void;
  onLeaveLobby: () => void;
  connectionError: string | null;
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
  connectionError,
}) => {
  const { t } = useI18n();
  const [inputCode, setInputCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [connecting, setConnecting] = useState(false);



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

  // Turn off spinner when room details arrive or the connection fails
  useEffect(() => {
    if (roomCode || connectionError) {
      setConnecting(false);
    }
  }, [roomCode, connectionError]);

  const handleCopyLink = () => {
    playClick();
    if (!roomCode) return;
    const joinUrl = `${window.location.origin}${window.location.pathname}?room=${roomCode}`;
    navigator.clipboard.writeText(joinUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };


  return (
    <div style={{ width: '100%', maxWidth: '800px', margin: '0 auto' }}>
      
      {/* NO ROOM CONNECTED (LOBBY HUB) */}
      {!roomCode ? (
        <div className="glass-panel" style={{ padding: '40px 30px', textAlign: 'center', position: 'relative' }}>
          <Users className="neon-text-cyan" size={48} style={{ margin: '0 auto 15px', animation: 'blink-glow 2s infinite' }} />
          <h2 className="display-font gradient-title" style={{ fontSize: '1.8rem', marginBottom: '10px' }}>
            {t('lobby.title')}
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: '500px', margin: '0 auto 30px', lineHeight: '1.5' }}>
            {t('lobby.subtitle')}
          </p>

          {connecting ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px', padding: '20px' }}>
              <Loader2 className="animate-spin" size={36} style={{ animation: 'rotate-dash 1.5s linear infinite', color: 'var(--accent-cyan)' }} />
              <span className="display-font" style={{ fontSize: '0.85rem', color: 'var(--accent-cyan)' }}>
                {t('lobby.connecting')}
              </span>
            </div>
          ) : (
            <div className="lobby-options">
              
              {/* Option A: Create Room */}
              <div className="glass-panel lobby-option">
                <h3 className="display-font neon-text-cyan" style={{ fontSize: '1rem', marginBottom: '10px' }}>
                  {t('lobby.hostTitle')}
                </h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '20px', minHeight: '36px' }}>
                  {t('lobby.hostBody')}
                </p>
                <button className="glass-button active" onClick={handleCreate} style={{ width: '100%', justifyContent: 'center' }}>
                  {t('lobby.hostButton')}
                </button>
              </div>

              {/* Option B: Join Room */}
              <div className="glass-panel lobby-option">
                <h3 className="display-font neon-text-pink" style={{ fontSize: '1rem', marginBottom: '10px' }}>
                  {t('lobby.joinTitle')}
                </h3>
                <form onSubmit={handleJoin}>
                  <label className="cyber-label" style={{ fontSize: '0.65rem' }}>{t('lobby.roomCode')}</label>
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
                    {t('lobby.joinButton')}
                  </button>
                </form>
              </div>

            </div>
          )}

          {connectionError && !connecting && (
            <div className="lobby-error" role="alert">
              <ShieldAlert size={14} />
              <span>{connectionError}</span>
            </div>
          )}

          {/* Quick Troubleshooting reminder */}
          <div style={{ marginTop: '35px', display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            <ShieldAlert size={14} />
            <span>{t('lobby.serverNote')}</span>
          </div>

        </div>
      ) : (
        /* CONNECTED ROOM CONTAINER */
        <div className="lobby-room">
          
          {/* Left panel: Room info & Player Slots */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Room Lobby Details */}
            <div className="glass-panel" style={{ padding: '20px' }}>
              <button 
                onClick={() => { playClick(); onLeaveLobby(); }}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', cursor: 'pointer', marginBottom: '15px' }}
              >
                <ArrowLeft size={14} />
                <span>{t('lobby.leave')}</span>
              </button>

              <span className="cyber-label" style={{ fontSize: '0.65rem' }}>{t('lobby.room')}</span>
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
                    <span>{t('lobby.copied')}</span>
                  </>
                ) : (
                  <>
                    <Copy size={14} />
                    <span>{t('lobby.copy')}</span>
                  </>
                )}
              </button>
            </div>

            {/* Players Slots Card */}
            <div className="glass-panel" style={{ padding: '20px', flex: 1 }}>
              <h4 className="display-font neon-text-pink" style={{ fontSize: '0.8rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '6px', marginBottom: '15px' }}>
                {t('lobby.players')}
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
                    {side === 'red' ? profile.username : (opponent?.username || t('player.opponent'))}
                  </span>
                  <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>{t('lobby.host')}</div>
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
                      {side === 'yellow' ? profile.username : (opponent?.username || t('player.opponent'))}
                    </span>
                    <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>{t('lobby.guest')}</div>
                  </div>
                </div>
              ) : (
                <div className="glass-panel" style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '15px',
                  border: '1px dashed rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.05)', textAlign: 'center'
                }}>
                  <Loader2 className="animate-spin" size={14} style={{ animation: 'rotate-dash 1.5s linear infinite', color: 'var(--accent-cyan)' }} />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                    {t('lobby.waiting')}
                  </span>
                </div>
              )}
            </div>

          </div>

          {/* Right panel: room chat */}
          <ChatPanel
            messages={chatHistory}
            ownName={profile.username}
            onSend={onSendChatMessage}
            disabled={!opponent && side === 'red'} // the host cannot chat until someone joins
          />

        </div>
      )}

    </div>
  );
};
