import React from 'react';
import type { PlayerType } from '../../types';

export interface PlayerLabel {
  name: string;
  avatar: string;
  // Second line, e.g. the AI difficulty or "Host"
  detail?: string;
}

interface PlayerCardProps {
  color: PlayerType;
  player: PlayerLabel;
  // Highlighted while it is this player's turn
  active: boolean;
  won: boolean;
  thinking?: boolean;
}

// One player above or below the move list, like the clocks on a chess site
export const PlayerCard: React.FC<PlayerCardProps> = ({ color, player, active, won, thinking = false }) => (
  <div className={`player-card ${color} ${active ? 'active' : ''} ${won ? 'won' : ''}`}>
    <span className={`player-disc ${color}`} aria-hidden="true" />
    <span className="player-avatar">{player.avatar}</span>
    <div className="player-text">
      <span className="player-name">{player.name}</span>
      {player.detail && <span className="player-detail">{player.detail}</span>}
    </div>
    {thinking && <span className="thinking-dots" aria-hidden="true"><i /><i /><i /></span>}
  </div>
);
