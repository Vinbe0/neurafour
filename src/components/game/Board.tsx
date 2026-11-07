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
  // Shown to the left of the grid (the evaluation bar)
  aside?: React.ReactNode;
}

const cells = Array.from({ length: ROWS * COLS }, (_, i) => [Math.floor(i / COLS), i % COLS] as const);

// The board is three stacked layers: discs at the back, the blue face with holes cut
// out by a CSS mask in front of them (so a dropped disc falls behind the face), and
// transparent click targets on top. Column buttons above the board serve keyboard
// focus and screen readers.
export const Board: React.FC<BoardProps> = ({
  board, skin, currentPlayer, winner, winningCells, isGameOver, lastMove,
  canPlay, hoveredColumn, hintColumn, onHover, onColumnClick, aside,
}) => {
  const { t } = useI18n();
  const previewColumn = canPlay && hoveredColumn !== null && isColumnAvailable(board, hoveredColumn) ? hoveredColumn : null;
  const previewRow = previewColumn !== null ? getAvailableRow(board, previewColumn) : -1;
  const lastRow = lastMove ? getAvailableRow(lastMove.boardBefore, lastMove.column) : -1;
  const isWinning = (r: number, c: number) => winningCells.some(([wr, wc]) => wr === r && wc === c);

  return (
    <div className={`board ${SKIN_CLASSES[skin] ?? 'skin-classic'} ${canPlay ? '' : 'board-waiting'} ${aside ? 'has-aside' : ''}`} onMouseLeave={() => onHover(null)}>
      {aside && <div className="board-aside">{aside}</div>}
      <div className="board-columns">
        {Array.from({ length: COLS }, (_, c) => (
          <button
            key={c}
            className={`column-indicator ${hoveredColumn === c ? 'is-active' : ''} ${hintColumn === c ? 'is-hint' : ''}`}
            onClick={() => onColumnClick(c)}
            onMouseEnter={() => onHover(c)}
            onFocus={() => onHover(c)}
            aria-label={t('moves.column', { col: c + 1 })}
            disabled={!isColumnAvailable(board, c)}
          >
            <span className={`column-disc ${currentPlayer}`} />
            <span className="column-number">{c + 1}</span>
          </button>
        ))}
      </div>

      <div className="board-grid">
        <div className="board-discs">
          {cells.map(([r, c]) => {
            const cell = board[r][c];
            const winning = isWinning(r, c);
            const isLast = !isGameOver && lastMove?.column === c && lastRow === r;
            const isPreview = !cell && previewColumn === c && previewRow === r;
            return (
              <div key={`${r}-${c}`} className="disc-slot">
                {cell && (
                  <div
                    className={`c4-token ${cell} ${winning ? 'winning' : ''} ${winner && !winning ? 'dimmed' : ''} ${isLast ? 'last-move' : ''}`}
                    style={{ '--drop-row': r } as React.CSSProperties}
                  />
                )}
                {isPreview && <div className={`c4-token ghost ${currentPlayer}`} />}
              </div>
            );
          })}
        </div>

        <div className="board-face" aria-hidden="true" />

        <div className="board-hits">
          {cells.map(([r, c]) => (
            <div
              key={`${r}-${c}`}
              className={`c4-cell ${isWinning(r, c) ? 'winning-cell' : ''} ${hoveredColumn === c ? 'is-hovered' : ''} ${hintColumn === c ? 'is-hint' : ''}`}
              onClick={() => onColumnClick(c)}
              onMouseEnter={() => onHover(c)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
