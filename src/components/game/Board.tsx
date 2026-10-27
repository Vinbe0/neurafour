import React from 'react';
import { COLS, ROWS, getAvailableRow, isColumnAvailable } from '../../rules';
import type { HistoryStep } from '../../aiRequests';
import type { BoardType, PlayerType } from '../../types';
import { useI18n } from '../../i18n';

const SKIN_CLASSES: Record<string, string> = {
  'retro-arcade': 'skin-retro',
  'space-obsidian': 'skin-obsidian',
  'royal-gold': 'skin-gold',
};

interface BoardProps {
  board: BoardType;
  skin: string;
  currentPlayer: PlayerType;
  winner: PlayerType | null;
  winningCells: [number, number][];
  isGameOver: boolean;
  lastMove: HistoryStep | undefined;
  // Whether the player may drop a token right now (their turn, game not over)
  canPlay: boolean;
  hoveredColumn: number | null;
  hintColumn: number | null;
  onHover: (column: number | null) => void;
  onColumnClick: (column: number) => void;
}

// The 7×6 grid: column buttons on top (mouse, keyboard focus and screen readers),
// tokens with a landing preview, the last move marked and the winning line highlighted
export const Board: React.FC<BoardProps> = ({
  board, skin, currentPlayer, winner, winningCells, isGameOver, lastMove,
  canPlay, hoveredColumn, hintColumn, onHover, onColumnClick,
}) => {
  const { t } = useI18n();
  const previewColumn = canPlay && hoveredColumn !== null && isColumnAvailable(board, hoveredColumn) ? hoveredColumn : null;
  const previewRow = previewColumn !== null ? getAvailableRow(board, previewColumn) : -1;
  const lastRow = lastMove ? getAvailableRow(lastMove.boardBefore, lastMove.column) : -1;

  return (
    <div className={`c4-board-wrapper ${canPlay ? '' : 'board-waiting'}`}>
      <div className={`c4-board ${SKIN_CLASSES[skin] ?? 'skin-neon'}`} onMouseLeave={() => onHover(null)}>
        {Array.from({ length: COLS }, (_, c) => (
          <button
            key={`indicator-${c}`}
            className={`column-indicator ${hoveredColumn === c ? 'is-active' : ''} ${hintColumn === c ? 'is-hint' : ''}`}
            style={{
              gridColumn: c + 1,
              '--indicator-color': hintColumn === c
                ? 'var(--accent-green)'
                : currentPlayer === 'red' ? 'var(--accent-pink)' : 'var(--accent-cyan)',
            } as React.CSSProperties}
            onClick={() => onColumnClick(c)}
            onMouseEnter={() => onHover(c)}
            onFocus={() => onHover(c)}
            aria-label={t('moves.column', { col: c + 1 })}
            disabled={!isColumnAvailable(board, c)}
          >
            <span className="column-number">{c + 1}</span>
            <div className="column-indicator-circle" />
          </button>
        ))}

        {Array.from({ length: ROWS }, (_, r) => Array.from({ length: COLS }, (_, c) => {
          const cell = board[r][c];
          const isWinning = winningCells.some(([wr, wc]) => wr === r && wc === c);
          const isLast = !isGameOver && lastMove?.column === c && lastRow === r;
          const isPreview = previewColumn === c && previewRow === r;

          return (
            <div
              key={`${r}-${c}`}
              className={`c4-cell ${isWinning ? 'winning-cell' : ''} ${hoveredColumn === c ? 'c4-col-hovered' : ''} ${winner && !isWinning ? 'dimmed' : ''}`}
              style={{ gridRow: r + 2, gridColumn: c + 1 }}
              onClick={() => onColumnClick(c)}
              onMouseEnter={() => onHover(c)}
            >
              {cell && (
                <div className={`c4-token ${cell} ${isLast ? 'last-move' : ''}`} style={{ '--drop-row': r } as React.CSSProperties} />
              )}
              {!cell && isPreview && <div className={`c4-token ghost ${currentPlayer}`} />}
            </div>
          );
        }))}
      </div>
    </div>
  );
};
