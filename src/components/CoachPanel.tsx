import React, { useMemo, useState } from 'react';
import { ArrowLeft, Brain, ChevronLeft, ChevronRight, Crown, Info } from 'lucide-react';
import type { MoveAnalysis, MoveGrade, PlayerType } from '../types';
import { playClick } from '../sound';
import { COLS, ROWS } from '../ai';
import { useI18n } from '../i18n';

interface CoachPanelProps {
  analyses: MoveAnalysis[];
  isPro: boolean;
  onOpenPro: () => void;
  onClose: () => void;
}

const GRADES: MoveGrade[] = ['perfect', 'great', 'good', 'mistake', 'blunder'];

const GRADE_SYMBOLS: Record<MoveGrade, string> = {
  perfect: '★',
  great: '!',
  good: '✓',
  mistake: '?',
  blunder: '!!',
};


export const CoachPanel: React.FC<CoachPanelProps> = ({
  analyses,
  isPro,
  onOpenPro,
  onClose,
}) => {
  const { t, lang } = useI18n();
  const getPlayerLabel = (player: PlayerType) => (player === 'red' ? t('player.red') : t('player.blue'));
  const [selectedTurn, setSelectedTurn] = useState(analyses[0]?.turn ?? 1);

  const currentAnalysis = analyses.find((a) => a.turn === selectedTurn) ?? analyses[0];

  const summary = useMemo(() => {
    const counts = analyses.reduce<Record<MoveGrade, number>>(
      (acc, item) => {
        acc[item.grade] += 1;
        return acc;
      },
      { perfect: 0, great: 0, good: 0, mistake: 0, blunder: 0 }
    );

    const penalties = counts.blunder * 1 + counts.mistake * 0.45;
    const accuracy = analyses.length ? Math.max(0, Math.round(((analyses.length - penalties) / analyses.length) * 100)) : 0;
    return { counts, accuracy };
  }, [analyses]);

  if (!currentAnalysis) {
    return (
      <section className="coach-page">
        <div className="coach-empty glass-panel">
          <Brain size={34} />
          <h2>{t('coach.unavailable')}</h2>
          <p>{t('coach.unavailableBody')}</p>
          <button className="glass-button active" onClick={onClose}>{t('coach.backToGame')}</button>
        </div>
      </section>
    );
  }

  const playedRow = findChangedRow(currentAnalysis.boardStateBefore, currentAnalysis.boardStateAfter, currentAnalysis.column);
  const recommendedRow = findDropRow(currentAnalysis.boardStateBefore, currentAnalysis.recommendedColumn);
  const recommendedPlayer = currentAnalysis.player;
  const recommendationAvailable = currentAnalysis.recommendedColumn >= 0 && recommendedRow >= 0;

  const selectTurn = (turn: number) => {
    playClick();
    setSelectedTurn(turn);
  };

  const goPrevious = () => {
    if (selectedTurn <= 1) return;
    selectTurn(selectedTurn - 1);
  };

  const goNext = () => {
    if (selectedTurn >= analyses.length) return;
    selectTurn(selectedTurn + 1);
  };

  return (
    <section className="coach-page">
      <div className="coach-shell">
        <header className="coach-header glass-panel">
          <button className="glass-button coach-back" onClick={() => { playClick(); onClose(); }}>
            <ArrowLeft size={16} />
            {t('coach.game')}
          </button>
          <div>
            <span className="coach-kicker">{t('coach.kicker')}</span>
            <h2>{t('coach.title')}</h2>
            <p>{t('coach.subtitle')}</p>
          </div>
          {!isPro && (
            <button className="glass-button coach-pro" onClick={() => { playClick(); onOpenPro(); }}>
              <Crown size={16} />
              {t('coach.deeper')}
            </button>
          )}
        </header>

        <div className="coach-grid">
          <aside className="coach-summary glass-panel">
            <div className="accuracy-card">
              <div className="accuracy-ring" style={{ '--accuracy': `${summary.accuracy}%` } as React.CSSProperties}>
                <span>{summary.accuracy}%</span>
              </div>
              <div>
                <h3>{summary.accuracy >= 85 ? t('coach.sharp') : summary.accuracy >= 70 ? t('coach.solid') : t('coach.training')}</h3>
                <p>{t('coach.analyzed', { count: analyses.length })}</p>
              </div>
            </div>

            <div className="grade-list">
              {GRADES.map((grade) => (
                <div key={grade} className={`grade-row grade-${grade}`}>
                  <span>{GRADE_SYMBOLS[grade]} {t(`grade.${grade}`)}</span>
                  <strong>{summary.counts[grade]}</strong>
                </div>
              ))}
            </div>

            {!isPro && (
              <div className="coach-upgrade">
                <strong>{t('coach.proTitle')}</strong>
                <span>{t('coach.proBody')}</span>
                <button onClick={() => { playClick(); onOpenPro(); }}>{t('coach.upgrade')}</button>
              </div>
            )}
          </aside>

          <main className="coach-main glass-panel">
            <div className="turn-strip">
              <button className="turn-arrow" onClick={goPrevious} disabled={selectedTurn <= 1} aria-label={t('coach.prev')}>
                <ChevronLeft size={18} />
              </button>
              <div className="turn-list">
                {analyses.map((item) => (
                  <button
                    key={item.turn}
                    className={`turn-pill grade-${item.grade} ${item.turn === selectedTurn ? 'selected' : ''}`}
                    onClick={() => selectTurn(item.turn)}
                  >
                    <span>#{item.turn}</span>
                    <b>{GRADE_SYMBOLS[item.grade]}</b>
                  </button>
                ))}
              </div>
              <button className="turn-arrow" onClick={goNext} disabled={selectedTurn >= analyses.length} aria-label={t('coach.next')}>
                <ChevronRight size={18} />
              </button>
            </div>

            <div className="move-detail">
              <div className="move-title">
                <span>{t('coach.move', { n: currentAnalysis.turn })}</span>
                <h3 className={`grade-text grade-${currentAnalysis.grade}`}>
                  {t(`grade.${currentAnalysis.grade}`)}
                </h3>
              </div>
              <span className={`player-chip ${currentAnalysis.player}`}>
                {getPlayerLabel(currentAnalysis.player)}
              </span>
            </div>

            <div className={`coach-comment grade-${currentAnalysis.grade}`}>
              <p>{currentAnalysis.commentary[lang]}</p>
            </div>

            <div className="move-comparison">
              <div>
                <span>{t('coach.played')}</span>
                <strong>{t('moves.column', { col: currentAnalysis.column + 1 })}</strong>
              </div>
              <div>
                <span>{t('coach.recommended')}</span>
                <strong>{recommendationAvailable ? t('moves.column', { col: currentAnalysis.recommendedColumn + 1 }) : t('coach.noLegal')}</strong>
              </div>
              <div>
                <span>{t('coach.evalShift')}</span>
                <strong>{formatEval(currentAnalysis.evalAfter - currentAnalysis.evalBefore)}</strong>
              </div>
            </div>
          </main>

          <aside className="coach-board-card glass-panel">
            <div className="coach-board-title">
              <h3>{t('coach.boardTitle')}</h3>
              <span><Info size={13} /> {t('coach.boardHint')}</span>
            </div>
            <div className="coach-board">
              {Array.from({ length: ROWS }).map((_, row) => (
                Array.from({ length: COLS }).map((_, col) => {
                  const cell = currentAnalysis.boardStateAfter[row][col];
                  const isPlayed = row === playedRow && col === currentAnalysis.column;
                  const isRecommendation = recommendationAvailable && row === recommendedRow && col === currentAnalysis.recommendedColumn;
                  const ghostPlayer = isRecommendation && !cell ? recommendedPlayer : null;

                  return (
                    <div
                      key={`${row}-${col}`}
                      className={`coach-slot ${isPlayed ? 'played' : ''} ${isRecommendation ? 'recommended' : ''}`}
                    >
                      {(cell || ghostPlayer) && (
                        <span className={`coach-token ${cell ?? ghostPlayer} ${ghostPlayer ? 'ghost' : ''}`}>
                          {isPlayed ? 'P' : isRecommendation ? 'R' : ''}
                        </span>
                      )}
                    </div>
                  );
                })
              ))}
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
};

function findChangedRow(before: MoveAnalysis['boardStateBefore'], after: MoveAnalysis['boardStateAfter'], col: number) {
  if (col < 0) return -1;
  for (let row = 0; row < ROWS; row += 1) {
    if (before[row]?.[col] !== after[row]?.[col]) return row;
  }
  return findDropRow(before, col);
}

function findDropRow(board: MoveAnalysis['boardStateBefore'], col: number) {
  if (col < 0 || col >= COLS) return -1;
  for (let row = ROWS - 1; row >= 0; row -= 1) {
    if (board[row]?.[col] === null) return row;
  }
  return -1;
}

function formatEval(value: number) {
  if (!Number.isFinite(value)) return '0';
  if (value > 0) return `+${Math.round(value)}`;
  return String(Math.round(value));
}
