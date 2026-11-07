import React, { useEffect, useState } from 'react';
import { isGameOver, newGame, playMove } from '../../game';
import { requestBestMove, requestEvaluation } from '../../aiClient';
import type { Evaluation } from '../../ai';
import { Board } from '../game/Board';
import { EvalBar } from '../game/EvalBar';
import { useI18n } from '../../i18n';

// Engine vs engine on the home page: Hard (red) plays Medium (yellow), with a
// random opening so every game is different, and a new game starts after each result
export const DemoGame: React.FC = () => {
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
    }, over ? 3500 : 850);
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

  return (
    <div className="demo-game panel" aria-label={t('home.demoLabel')} role="group">
      <div className="demo-header">
        <span className="live-dot" aria-hidden="true" />
        <span>{t('home.demoTitle')}</span>
        <span className="demo-moves">{t('home.demoMoves', { n: game.history.length })}</span>
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
      <div className="demo-players">
        <span><i className="player-disc red" /> {t('home.demoRed')}</span>
        <span><i className="player-disc yellow" /> {t('home.demoYellow')}</span>
      </div>
    </div>
  );
};
