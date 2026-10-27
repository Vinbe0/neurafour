import React, { useEffect, useRef } from 'react';
import { ListOrdered } from 'lucide-react';
import type { HistoryStep } from '../../aiRequests';
import type { PlayerType } from '../../types';
import { useI18n } from '../../i18n';

interface MoveListProps {
  history: HistoryStep[];
  playerName: (player: PlayerType) => string;
}

// Every move of the current game, newest kept in view
export const MoveList: React.FC<MoveListProps> = ({ history, playerName }) => {
  const { t } = useI18n();
  const listRef = useRef<HTMLOListElement | null>(null);

  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [history.length]);

  return (
    <section className="glass-panel moves-card">
      <span className="panel-label"><ListOrdered size={13} /> {t('moves.title')}</span>
      {history.length === 0 ? (
        <p className="moves-empty">{t('moves.empty')}</p>
      ) : (
        <ol className="move-list" ref={listRef}>
          {history.map((step, i) => (
            <li key={i} className={i === history.length - 1 ? 'latest' : ''}>
              <span className="move-number">{i + 1}</span>
              <span className={`player-chip-dot ${step.player}`} />
              <span className="move-player">{playerName(step.player)}</span>
              <span className="move-col">{t('moves.column', { col: step.column + 1 })}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
};
