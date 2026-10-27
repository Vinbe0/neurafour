import React, { useState } from 'react';
import { Check, Copy, LogOut } from 'lucide-react';
import { playClick } from '../../sound';
import { useI18n } from '../../i18n';

interface RoomBarProps {
  roomCode: string;
  onLeave: () => void;
}

// Room code with copy-invite and leave buttons, shown during an online game
export const RoomBar: React.FC<RoomBarProps> = ({ roomCode, onLeave }) => {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);

  const copyInvite = () => {
    playClick();
    void navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}?room=${roomCode}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="glass-panel room-card">
      <div>
        <span className="panel-label">{t('lobby.room')}</span>
        <strong className="room-code">{roomCode}</strong>
      </div>
      <div className="room-actions">
        <button className="glass-button" onClick={copyInvite} title={t('lobby.copy')} aria-label={t('lobby.copy')}>
          {copied ? <Check size={14} /> : <Copy size={14} />}
        </button>
        <button className="glass-button" onClick={onLeave} title={t('lobby.leave')} aria-label={t('lobby.leave')}>
          <LogOut size={14} />
        </button>
      </div>
    </section>
  );
};
