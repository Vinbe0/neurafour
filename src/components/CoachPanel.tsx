import React, { useMemo, useState } from 'react';
import { ArrowLeft, Brain, ChevronLeft, ChevronRight, Crown, Info } from 'lucide-react';
import type { MoveAnalysis, MoveGrade, PlayerType } from '../types';
import { playClick } from '../sound';
import { COLS, ROWS } from '../ai';

interface CoachPanelProps {
  analyses: MoveAnalysis[];
  isPro: boolean;
  onOpenPro: () => void;
  onClose: () => void;
}

const GRADE_LABELS: Record<MoveGrade, string> = {
  perfect: 'Perfect',
  great: 'Great',
  good: 'Good',
  mistake: 'Inaccuracy',
  blunder: 'Blunder',
};

const GRADE_RU: Record<MoveGrade, string> = {
  perfect: 'Идеально',
  great: 'Отлично',
  good: 'Хорошо',
  mistake: 'Неточность',
  blunder: 'Ошибка',
};

const GRADE_SYMBOLS: Record<MoveGrade, string> = {
  perfect: '★',
  great: '!',
  good: '✓',
  mistake: '?',
  blunder: '!!',
};

const getPlayerLabel = (player: PlayerType) => (player === 'red' ? 'Red / Красные' : 'Blue / Синие');

export const CoachPanel: React.FC<CoachPanelProps> = ({
  analyses,
  isPro,
  onOpenPro,
  onClose,
}) => {
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
          <h2>Analysis unavailable</h2>
          <p>Finish at least one move before opening the coach.</p>
          <button className="glass-button active" onClick={onClose}>Back to game</button>
        </div>
      </section>
    );
  }

  const playedRow = findChangedRow(currentAnalysis.boardStateBefore, currentAnalysis.boardStateAfter, currentAnalysis.column);
  const recommendedRow = findDropRow(currentAnalysis.boardStateBefore, currentAnalysis.recommendedColumn);
  const recommendedPlayer = currentAnalysis.player;
  const recommendationAvailable = currentAnalysis.recommendedColumn >= 0 && recommendedRow >= 0;
  const commentaryParts = currentAnalysis.commentary.split('|').map((part) => part.trim()).filter(Boolean);

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
            Game
          </button>
          <div>
            <span className="coach-kicker">AI Coach</span>
            <h2>Post-game review</h2>
            <p>Move-by-move decisions, missed threats, and practical next moves.</p>
          </div>
          {!isPro && (
            <button className="glass-button coach-pro" onClick={() => { playClick(); onOpenPro(); }}>
              <Crown size={16} />
              Deeper review
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
                <h3>{summary.accuracy >= 85 ? 'Sharp match' : summary.accuracy >= 70 ? 'Solid match' : 'Training match'}</h3>
                <p>{analyses.length} moves analyzed</p>
              </div>
            </div>

            <div className="grade-list">
              {(Object.keys(GRADE_LABELS) as MoveGrade[]).map((grade) => (
                <div key={grade} className={`grade-row grade-${grade}`}>
                  <span>{GRADE_SYMBOLS[grade]} {GRADE_RU[grade]}</span>
                  <strong>{summary.counts[grade]}</strong>
                </div>
              ))}
            </div>

            {!isPro && (
              <div className="coach-upgrade">
                <strong>PRO review</strong>
                <span>Unlock deeper search depth and all skins for the complete training loop.</span>
                <button onClick={() => { playClick(); onOpenPro(); }}>Upgrade</button>
              </div>
            )}
          </aside>

          <main className="coach-main glass-panel">
            <div className="turn-strip">
              <button className="turn-arrow" onClick={goPrevious} disabled={selectedTurn <= 1} aria-label="Previous move">
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
              <button className="turn-arrow" onClick={goNext} disabled={selectedTurn >= analyses.length} aria-label="Next move">
                <ChevronRight size={18} />
              </button>
            </div>

            <div className="move-detail">
              <div className="move-title">
                <span>Move {currentAnalysis.turn}</span>
                <h3 className={`grade-text grade-${currentAnalysis.grade}`}>
                  {GRADE_LABELS[currentAnalysis.grade]} / {GRADE_RU[currentAnalysis.grade]}
                </h3>
              </div>
              <span className={`player-chip ${currentAnalysis.player}`}>
                {getPlayerLabel(currentAnalysis.player)}
              </span>
            </div>

            <div className={`coach-comment grade-${currentAnalysis.grade}`}>
              <p>{commentaryParts[0] ?? currentAnalysis.commentary}</p>
              {commentaryParts[1] && <small>{commentaryParts[1]}</small>}
            </div>

            <div className="move-comparison">
              <div>
                <span>Played</span>
                <strong>Column {currentAnalysis.column + 1}</strong>
              </div>
              <div>
                <span>Recommended</span>
                <strong>{recommendationAvailable ? `Column ${currentAnalysis.recommendedColumn + 1}` : 'No legal move'}</strong>
              </div>
              <div>
                <span>Eval shift</span>
                <strong>{formatEval(currentAnalysis.evalAfter - currentAnalysis.evalBefore)}</strong>
              </div>
            </div>
          </main>

          <aside className="coach-board-card glass-panel">
            <div className="coach-board-title">
              <h3>Position after move</h3>
              <span><Info size={13} /> Played token is outlined. Recommended move appears as a ghost.</span>
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
