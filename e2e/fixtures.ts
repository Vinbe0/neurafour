import type { BrowserContext, Page } from '@playwright/test';

// Starts each page in English with a named guest profile, so tests do not depend
// on the browser language or on what an earlier test left in localStorage
export const preparePlayer = async (context: BrowserContext, username: string) => {
  await context.addInitScript((name) => {
    if (sessionStorage.getItem('e2e-ready')) return;
    sessionStorage.setItem('e2e-ready', '1');
    localStorage.clear();
    localStorage.setItem('neurafour_lang', 'en');
    localStorage.setItem('neurafour_user_profile_v2', JSON.stringify({
      username: name,
      city: 'London',
      avatar: '🤖',
      points: 150,
      isPro: false,
      unlockedSkins: ['cyber-neon'],
      activeSkin: 'cyber-neon',
      stats: { wins: 0, losses: 0, draws: 0 },
    }));
  }, username);
};

// Clicks the column button above the board (1-based, as shown on screen)
export const dropInColumn = (page: Page, column: number) =>
  page.getByRole('button', { name: `Column ${column}`, exact: true }).click();

export const moveList = (page: Page) => page.locator('.move-list li');
