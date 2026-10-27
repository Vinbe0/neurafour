import React from 'react';
import type { AIDifficulty } from '../../types';
import { useI18n } from '../../i18n';

const DIFFICULTIES: AIDifficulty[] = ['easy', 'medium', 'hard', 'expert'];

interface AISettingsProps {
  difficulty: AIDifficulty;
  aiFirst: boolean;
  onDifficultyChange: (difficulty: AIDifficulty) => void;
  onFirstMoveChange: (aiFirst: boolean) => void;
}

// Difficulty and who moves first, shown in vs-AI mode
export const AISettings: React.FC<AISettingsProps> = ({ difficulty, aiFirst, onDifficultyChange, onFirstMoveChange }) => {
  const { t } = useI18n();
  return (
    <section className="glass-panel settings-card">
      <span className="panel-label">{t('settings.difficulty')}</span>
      <div className="segmented">
        {DIFFICULTIES.map((d) => (
          <button key={d} onClick={() => onDifficultyChange(d)} className={difficulty === d ? 'selected' : ''} aria-pressed={difficulty === d}>
            {t(`settings.${d}`)}
          </button>
        ))}
      </div>

      <span className="panel-label">{t('settings.firstMove')}</span>
      <div className="segmented">
        {([false, true] as const).map((value) => (
          <button key={String(value)} onClick={() => onFirstMoveChange(value)} className={aiFirst === value ? 'selected' : ''} aria-pressed={aiFirst === value}>
            {value ? t('settings.aiFirst') : t('settings.youFirst')}
          </button>
        ))}
      </div>
    </section>
  );
};
