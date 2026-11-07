import React, { useEffect, useState } from 'react';
import { isGameOver, newGame, playMove } from '../../game';
import { requestBestMove, requestEvaluation } from '../../aiClient';
import type { Evaluation } from '../../ai';
import { Board } from '../game/Board';
import { EvalBar } from '../game/EvalBar';
import { useI18n } from '../../i18n';

const numberFormat = new Intl.NumberFormat('en-US');

// Engine vs engine with the search's own numbers beside it, like an analysis panel on
// a chess site. Hard (red) plays Medium (yellow) from a random opening; a new game
// starts a few seconds after each result.
export const EngineRoom: React.FC = () => {
  const { t } = useI18n();
  const [game, setGame] = useState(newGame);
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const over = isGameOver(game);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      if (over) {
        setGame(newGame());
        setEvaluation(null);
        return;
      }
      const column = game.history.length < 2
        ? 2 + Math.floor(Math.random() * 3)
        : await requestBestMove(game.board, game.currentPlayer === 'red' ? 'hard' : 'medium', game.currentPlayer);
      const outcome = cancelled ? null : playMove(game, column);
      if (outcome) setGame(outcome.state);
    }, over ? 3500 : 1100);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [game, over]);

  useEffect(() => {
    if (over) return;
    let cancelled = false;
    void requestEvaluation(game.board, game.currentPlayer).then((result) => {
      if (!cancelled) setEvaluation(result);
    });
    return () => {
      cancelled = true;
    };
  }, [game, over]);

  const side = (player: 'red' | 'yellow') => (player === 'red' ? t('player.red') : t('player.yellow'));
  const evalText = !evaluation
    ? '…'
    : evaluation.winner
      ? t('home.readoutMate', { side: side(evaluation.winner), n: evaluation.movesToWin ?? 0 })
      : `${evaluation.score >= 0 ? '+' : ''}${(evaluation.score / 100).toFixed(2)}`;

  const rows: [string, string][] = [
    [t('home.readoutMove'), String(game.history.length + (over ? 0 : 1))],
    [t('home.readoutToMove'), over ? '—' : side(game.currentPlayer)],
    [t('home.readoutDepth'), evaluation ? t('home.readoutPlies', { n: evaluation.depth }) : '…'],
    [t('home.readoutPositions'), evaluation ? numberFormat.format(evaluation.positions) : '…'],
    [t('home.readoutEval'), evalText],
    [t('home.readoutBest'), evaluation && !over ? t('moves.column', { col: evaluation.bestColumn + 1 }) : '—'],
    [t('home.readoutResult'), over ? (game.winner ? t('eval.won', { side: side(game.winner) }) : t('status.draw')) : t('home.readoutPlaying')],
  ];

  return (
    <div className="engine-room-grid">
      <div className="engine-board" role="group" aria-label={t('home.demoLabel')}>
        <div className="engine-board-caption">
          <span><i className="disc red" /> {t('home.demoRed')}</span>
          <span className="engine-vs">vs</span>
          <span><i className="disc yellow" /> {t('home.demoYellow')}</span>
        </div>
        <Board
          board={game.board}
          skin="cyber-neon"
          currentPlayer={game.currentPlayer}
          winner={game.winner}
          winningCells={game.winningCells}
          isGameOver={over}
          lastMove={game.history[game.history.length - 1]}
          canPlay={false}
          hoveredColumn={null}
          hintColumn={null}
          onHover={() => {}}
          onColumnClick={() => {}}
          interactive={false}
          aside={<EvalBar evaluation={evaluation} result={over ? { winner: game.winner } : null} bottom="red" />}
        />
      </div>

      <div className="readout" aria-live="off">
        <div className="readout-title">
          <span className="live-dot" aria-hidden="true" />
          {t('home.readoutTitle')}
        </div>
        <dl>
          {rows.map(([label, value]) => (
            <div key={label} className="readout-row">
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
        <p className="readout-note">{t('home.readoutNote')}</p>
      </div>
    </div>
  );
};
