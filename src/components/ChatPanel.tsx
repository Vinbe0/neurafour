import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MessageSquare, Send } from 'lucide-react';
import type { ChatMessage } from '../types';
import { playClick } from '../sound';
import { useI18n } from '../i18n';

interface ChatPanelProps {
  messages: ChatMessage[];
  // Messages from this name are shown on the right as your own
  ownName: string;
  onSend: (text: string) => void;
  disabled?: boolean;
  // Smaller version for the side column during a game
  compact?: boolean;
}

// Room chat, used in the lobby while waiting and next to the board during an online game
export const ChatPanel: React.FC<ChatPanelProps> = ({ messages, ownName, onSend, disabled = false, compact = false }) => {
  const { t, lang } = useI18n();
  const [text, setText] = useState('');
  const timeFormat = useMemo(() => new Intl.DateTimeFormat(lang, { hour: '2-digit', minute: '2-digit' }), [lang]);
  const timeOf = (msg: ChatMessage) => (msg.sentAt ? timeFormat.format(msg.sentAt) : msg.time ?? '');
  const listRef = useRef<HTMLDivElement>(null);

  // Keep the newest message in view without scrolling the whole page
  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    playClick();
    onSend(text.trim());
    setText('');
  };

  return (
    <section className={`glass-panel chat-panel ${compact ? 'compact' : ''}`}>
      <header className="chat-header">
        <MessageSquare size={compact ? 14 : 18} />
        <h4 className="display-font">{t('lobby.chat')}</h4>
      </header>

      <div className="chat-messages" ref={listRef} aria-live="polite">
        {messages.length === 0 ? (
          <p className="chat-empty">{t('lobby.chatEmpty')}</p>
        ) : (
          messages.map((msg) => {
            const isSelf = msg.username === ownName;
            return (
              <div key={msg.id} className={`chat-message ${isSelf ? 'self' : ''}`}>
                <span className="chat-avatar">{msg.avatar}</span>
                <div>
                  <span className="chat-meta">{msg.username} • {timeOf(msg)}</span>
                  <p className="chat-bubble">{msg.text}</p>
                </div>
              </div>
            );
          })
        )}
      </div>

      <form className="chat-form" onSubmit={handleSubmit}>
        <input
          type="text"
          className="cyber-input"
          placeholder={t('lobby.chatPlaceholder')}
          aria-label={t('lobby.chatPlaceholder')}
          value={text}
          maxLength={300}
          onChange={(e) => setText(e.target.value)}
          disabled={disabled}
        />
        <button type="submit" className="glass-button active" disabled={disabled} aria-label={t('lobby.send')}>
          <Send size={16} />
        </button>
      </form>
    </section>
  );
};
