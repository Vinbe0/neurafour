import React, { useEffect, useRef } from 'react';
import type { HistoryStep } from '../../aiRequests';
import { useI18n } from '../../i18n';

interface MoveListProps {
  history: HistoryStep[];
}

// Moves in numbered pairs, like a chess score sheet; the newest is highlighted and kept in view
export const MoveList: React.FC<MoveListProps> = ({ history }) => {
  const { t } = useI18n();
  const listRef = useRef<HTMLOListElement | null>(null);

  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [history.length]);

  if (history.length === 0) {
    return <p className="moves-empty">{t('moves.empty')}</p>;
  }

  const rows = Array.from({ length: Math.ceil(history.length / 2) }, (_, i) => history.slice(i * 2, i * 2 + 2));

  return (
    // Focusable so keyboard users can scroll a long list
    <ol className="move-list" ref={listRef} tabIndex={0} aria-label={t('moves.title')}>
      {rows.map((pair, i) => (
        <li key={i} className="move-row">
          <span className="move-number">{i + 1}</span>
          {pair.map((step, j) => {
            const index = i * 2 + j;
            return (
              <span
                key={index}
                className={`move ${index === history.length - 1 ? 'latest' : ''}`}
                data-player={step.player}
                title={t('moves.column', { col: step.column + 1 })}
              >
                <span className={`move-disc ${step.player}`} aria-hidden="true" />
                {step.column + 1}
              </span>
            );
          })}
        </li>
      ))}
    </ol>
  );
};
