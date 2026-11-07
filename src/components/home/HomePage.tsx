import React, { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import type { AIDifficulty, StartPreset } from '../../types';
import type { TranslationKey } from '../../i18n';
import { useI18n } from '../../i18n';
import { playClick } from '../../sound';
import { createEmptyBoard } from '../../rules';
import { Board } from '../game/Board';
import { EngineRoom } from './EngineRoom';

interface HomePageProps {
  onStart: (preset: StartPreset) => void;
}

// How many plies each level searches, drawn as discs in a board column
const LEVELS: { difficulty: AIDifficulty; plies: number; label: TranslationKey }[] = [
  { difficulty: 'easy', plies: 2, label: 'home.levelEasy' },
  { difficulty: 'medium', plies: 4, label: 'home.levelMedium' },
  { difficulty: 'hard', plies: 6, label: 'home.levelHard' },
  { difficulty: 'expert', plies: 14, label: 'home.levelExpert' },
];

const NOTES: { title: TranslationKey; body: TranslationKey }[] = [
  { title: 'home.noteEngineTitle', body: 'home.noteEngineBody' },
  { title: 'home.noteEvalTitle', body: 'home.noteEvalBody' },
  { title: 'home.noteCoachTitle', body: 'home.noteCoachBody' },
  { title: 'home.noteOnlineTitle', body: 'home.noteOnlineBody' },
];

const emptyBoard = createEmptyBoard();
const COLUMN_HEIGHT = 6;

// The home page is built around the board: drop a disc to start playing, pick an
// opponent by how deep it searches, and watch the engine play itself
export const HomePage: React.FC<HomePageProps> = ({ onStart }) => {
  const { t } = useI18n();
  const [hovered, setHovered] = useState<number | null>(null);

  const start = (preset: StartPreset) => {
    playClick();
    onStart(preset);
  };

  return (
    <div className="home">
      <section className="hero">
        <div className="hero-text">
          <h1 className="hero-title">
            <span>{t('home.titleLine1')}</span>
            <span className="hero-title-quiet">{t('home.titleLine2')}</span>
          </h1>
          <p className="hero-lead">{t('home.lead')}</p>

          <p className="hero-prompt">
            <i className="disc red" aria-hidden="true" />
            {t('home.prompt')}
          </p>

          <div className="hero-links">
            <button className="text-link" onClick={() => start({ mode: 'multiplayer' })}>
              {t('home.linkOnline')} <ArrowRight size={14} />
            </button>
            <button className="text-link" onClick={() => start({ mode: 'local' })}>
              {t('home.linkLocal')} <ArrowRight size={14} />
            </button>
          </div>
        </div>

        <div className="hero-board">
          <div className="hero-board-caption">
            <span><i className="disc red" /> {t('player.you')}</span>
            <span className="engine-vs">vs</span>
            <span><i className="disc yellow" /> {t('home.heroOpponent')}</span>
          </div>
          <Board
            board={emptyBoard}
            skin="cyber-neon"
            currentPlayer="red"
            winner={null}
            winningCells={[]}
            isGameOver={false}
            lastMove={undefined}
            canPlay
            hoveredColumn={hovered}
            hintColumn={null}
            onHover={setHovered}
            onColumnClick={(column) => start({ mode: 'ai', difficulty: 'medium', firstMove: column })}
          />
        </div>
      </section>

      <section className="home-band" aria-labelledby="levels-title">
        <div className="band-head">
          <h2 id="levels-title">{t('home.levelsTitle')}</h2>
          <p>{t('home.levelsLead')}</p>
        </div>

        <div className="depth-columns">
          {LEVELS.map(({ difficulty, plies, label }) => {
            const shown = Math.min(plies, COLUMN_HEIGHT);
            return (
              <button
                key={difficulty}
                className={`depth-column ${plies > COLUMN_HEIGHT ? 'overflow' : ''}`}
                onClick={() => start({ mode: 'ai', difficulty })}
              >
                <span className="depth-stack" aria-hidden="true">
                  {plies > COLUMN_HEIGHT && <span className="depth-more">+{plies - COLUMN_HEIGHT}</span>}
                  {Array.from({ length: COLUMN_HEIGHT }, (_, i) => {
                    const fromBottom = COLUMN_HEIGHT - 1 - i;
                    const filled = fromBottom < shown;
                    return (
                      <span
                        key={i}
                        className={`depth-hole ${filled ? (fromBottom % 2 === 0 ? 'red' : 'yellow') : ''}`}
                        style={{ '--i': fromBottom } as React.CSSProperties}
                      />
                    );
                  })}
                </span>
                <span className="depth-name">{t(`settings.${difficulty}`)}</span>
                <span className="depth-plies">{t(label)}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="home-band" aria-labelledby="engine-title">
        <div className="band-head">
          <h2 id="engine-title">{t('home.engineTitle')}</h2>
          <p>{t('home.engineLead')}</p>
        </div>
        <EngineRoom />
      </section>

      <section className="home-band" aria-labelledby="notes-title">
        <div className="band-head">
          <h2 id="notes-title">{t('home.notesTitle')}</h2>
          <p>{t('home.notesLead')}</p>
        </div>
        <ol className="notes">
          {NOTES.map(({ title, body }, i) => (
            <li key={title}>
              <span className="note-number">{String(i + 1).padStart(2, '0')}</span>
              <h3>{t(title)}</h3>
              <p>{t(body)}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
};
