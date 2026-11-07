import React from 'react';
import type { Evaluation } from '../../ai';
import type { PlayerType } from '../../types';
import { useI18n } from '../../i18n';

interface EvalBarProps {
  // Latest engine evaluation (from Red's side); null while the first one is computed
  evaluation: Evaluation | null;
  // Once the game is over the bar shows the result instead
  result: { winner: PlayerType | null } | null;
  // Colour shown at the bottom, matching the player at the bottom of the panel
  bottom: PlayerType;
}

// How far the heuristic score moves the bar: an open three (~100) is a clear edge
const SCALE = 250;

// Vertical bar beside the board, like a chess engine's evaluation bar
export const EvalBar: React.FC<EvalBarProps> = ({ evaluation, result, bottom }) => {
  const { t } = useI18n();
  const name = (player: PlayerType) => (player === 'red' ? t('player.red') : t('player.yellow'));

  let redShare = 0.5;
  let text = '0.0';
  let description = t('eval.level');

  if (result) {
    redShare = result.winner === 'red' ? 1 : result.winner === 'yellow' ? 0 : 0.5;
    text = result.winner ? '1–0' : '½';
    description = result.winner ? t('eval.won', { side: name(result.winner) }) : t('status.draw');
  } else if (evaluation?.winner) {
    redShare = evaluation.winner === 'red' ? 1 : 0;
    text = `M${evaluation.movesToWin}`;
    description = t('eval.mate', { side: name(evaluation.winner), n: evaluation.movesToWin ?? 0 });
  } else if (evaluation) {
    redShare = 0.5 + 0.5 * Math.tanh(evaluation.score / SCALE);
    const pawns = evaluation.score / 100;
    text = `${pawns > 0 ? '+' : ''}${pawns.toFixed(1)}`;
    if (Math.abs(pawns) >= 0.3) description = t('eval.better', { side: name(pawns > 0 ? 'red' : 'yellow') });
  }

  const bottomShare = bottom === 'red' ? redShare : 1 - redShare;
  const leader: PlayerType | null = redShare > 0.5 ? 'red' : redShare < 0.5 ? 'yellow' : null;

  return (
    <div
      className={`eval-bar ${evaluation || result ? '' : 'loading'}`}
      role="img"
      aria-label={`${t('eval.label')}: ${description} (${text})`}
      title={description}
    >
      <div className={`eval-fill ${bottom}`} style={{ height: `${bottomShare * 100}%` }} />
      <span className={`eval-text ${leader === bottom || !leader ? 'at-bottom' : 'at-top'}`}>{text}</span>
    </div>
  );
};
