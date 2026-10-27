import React from 'react';
import type { PlayerType } from '../../types';
import { useI18n } from '../../i18n';

export interface PlayerLabel {
  name: string;
  avatar: string;
}

interface StatusCardProps {
  text: string;
  tone: PlayerType | 'draw';
  isThinking: boolean;
  players: Record<PlayerType, PlayerLabel>;
  // Player whose card is highlighted; null once the game is over
  activePlayer: PlayerType | null;
  winner: PlayerType | null;
}

// Whose turn it is (or the result) and a card for each player
export const StatusCard: React.FC<StatusCardProps> = ({ text, tone, isThinking, players, activePlayer, winner }) => {
  const { t } = useI18n();
  return (
    <section className={`status-card glass-panel tone-${tone}`} aria-live="polite">
      <span className="panel-label">{t('status.label')}</span>
      <h2 className="status-title display-font">
        {text}
        {isThinking && <span className="thinking-dots" aria-hidden="true"><i /><i /><i /></span>}
      </h2>

      <div className="player-cards">
        {(['red', 'yellow'] as const).map((color) => (
          <div key={color} className={`player-card ${color} ${activePlayer === color ? 'active' : ''} ${winner === color ? 'won' : ''}`}>
            <span className="player-avatar">{players[color].avatar}</span>
            <span className="player-name">{players[color].name}</span>
            <span className={`player-chip-dot ${color}`} />
          </div>
        ))}
      </div>
    </section>
  );
};
