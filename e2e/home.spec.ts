import { expect, test } from '@playwright/test';
import { moveList, preparePlayer } from './fixtures';

test.beforeEach(async ({ context }) => {
  await preparePlayer(context, 'Tester');
});

test('the home page shows the engine playing itself', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Four in a row.');
  const demo = page.getByRole('group', { name: /Live demo/ });
  await expect(demo).toBeVisible();
  // The demo plays on its own: moves keep appearing
  await expect(demo.locator('.c4-token:not(.ghost)').nth(2)).toBeVisible({ timeout: 10_000 });
});

test('dropping a disc on the home board starts a game with that move', async ({ page }) => {
  await page.goto('/');
  await page.locator('.hero-board').getByRole('button', { name: 'Column 3', exact: true }).click();
  await expect(page).toHaveURL(/#\/play$/);
  await expect(page.locator('.player-card.yellow')).toContainText('AI · Medium');
  // Your disc in column 3, then the AI answers
  await expect(moveList(page).first()).toContainText('3');
  await expect(moveList(page)).toHaveCount(2);
});

test('an opponent column opens the game with that level, and back returns home', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /^Expert/ }).click();
  await expect(page).toHaveURL(/#\/play$/);
  await expect(page.locator('.player-card.yellow')).toContainText('AI · Expert');
  await expect(page.getByRole('button', { name: 'Expert', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(moveList(page)).toHaveCount(0);

  await page.goBack();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});

test('the logo goes home and Play opens the game', async ({ page }) => {
  await page.goto('/#/play');
  await expect(page.locator('.status-title')).toHaveText('Your turn');
  await page.getByRole('button', { name: 'NeuraFour' }).click();
  await expect(page).toHaveURL(/#\/$/);
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(page.locator('.status-title')).toHaveText('Your turn');
});
