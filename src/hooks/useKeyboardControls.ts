import { useEffect } from 'react';
import { COLS } from '../rules';

interface KeyboardControls {
  // False while another screen covers the game or the online lobby is shown
  enabled: boolean;
  selectedColumn: number | null;
  onSelect: (update: (current: number | null) => number) => void;
  onPlay: (column: number) => void;
  onUndo: () => void;
}

// 1-7 drop a token, ← → move the selected column, Enter/Space drop there, U undoes.
// Ignored while typing in a field or while a dialog is open.
export const useKeyboardControls = ({ enabled, selectedColumn, onSelect, onPlay, onUndo }: KeyboardControls) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable)) return;
      if (!enabled || document.querySelector('.modal-overlay')) return;

      if (e.key >= '1' && e.key <= String(COLS)) {
        e.preventDefault();
        onPlay(Number(e.key) - 1);
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        const step = e.key === 'ArrowLeft' ? -1 : 1;
        onSelect((current) => ((current ?? Math.floor(COLS / 2) - step) + step + COLS) % COLS);
      } else if ((e.key === 'Enter' || e.key === ' ') && selectedColumn !== null && target?.tagName !== 'BUTTON') {
        e.preventDefault();
        onPlay(selectedColumn);
      } else if (e.key.toLowerCase() === 'u') {
        onUndo();
      }
    };

    // Re-subscribed every render so the handlers always see the current game
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });
};
