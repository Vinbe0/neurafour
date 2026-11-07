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

  const playerSlot = (slotSide: 'red' | 'yellow') => {
    const isMe = side === slotSide;
    const filled = isMe || !!opponent;
    if (!filled) {
      return (
        <div className="lobby-slot waiting">
          <Loader2 className="spin" size={14} />
          <span>{t('lobby.waiting')}</span>
        </div>
      );
    }
    return (
      <div className={`lobby-slot ${slotSide}`}>
        <span className="lobby-slot-avatar">{isMe ? profile.avatar : opponent?.avatar || '🤖'}</span>
        <div>
          <strong>{isMe ? profile.username : opponent?.username || t('player.opponent')}</strong>
          <span>{slotSide === 'red' ? t('lobby.host') : t('lobby.guest')}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="lobby">
      {!roomCode ? (
        <div className="panel lobby-hub">
          <div className="lobby-icon"><Users size={22} /></div>
          <h2>{t('lobby.title')}</h2>
          <p className="lobby-subtitle">{t('lobby.subtitle')}</p>

          {connecting ? (
            <div className="lobby-connecting">
              <Loader2 className="spin" size={22} />
              <span>{t('lobby.connecting')}</span>
            </div>
          ) : (
            <div className="lobby-options">
              <div className="panel lobby-option">
                <h3>{t('lobby.hostTitle')}</h3>
                <p>{t('lobby.hostBody')}</p>
                <button className="btn primary block" onClick={handleCreate}>
                  {t('lobby.hostButton')}
                </button>
              </div>

              <div className="panel lobby-option">
                <h3>{t('lobby.joinTitle')}</h3>
                <form onSubmit={handleJoin}>
                  <label className="field-label" htmlFor="lobby-room-code">{t('lobby.roomCode')}</label>
                  <input
                    id="lobby-room-code"
                    type="text"
                    maxLength={5}
                    value={inputCode}
                    onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                    className="input room-code-input"
                    placeholder="ABCDE"
                    required
                  />
                  <button type="submit" className="btn block">
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

          <p className="lobby-note">
            <ShieldAlert size={13} />
            <span>{t('lobby.serverNote')}</span>
          </p>
        </div>
      ) : (
        <div className="lobby-room">
          <div className="lobby-room-side">
            <div className="panel lobby-room-card">
              <button className="btn ghost small lobby-leave" onClick={() => { playClick(); onLeaveLobby(); }}>
                <ArrowLeft size={14} />
                <span>{t('lobby.leave')}</span>
              </button>

              <span className="panel-label">{t('lobby.room')}</span>
              <h2>{roomCode}</h2>

              <button className="btn block" onClick={handleCopyLink}>
                {copied ? <Check size={14} /> : <Copy size={14} />}
                <span>{copied ? t('lobby.copied') : t('lobby.copy')}</span>
              </button>
            </div>

            <div className="panel lobby-players">
              <span className="panel-label">{t('lobby.players')}</span>
              {playerSlot('red')}
              {playerSlot('yellow')}
            </div>
          </div>

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
