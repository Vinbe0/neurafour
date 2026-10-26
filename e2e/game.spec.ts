import { expect, test } from '@playwright/test';
import { dropInColumn, moveList, preparePlayer } from './fixtures';

test.beforeEach(async ({ context }) => {
  await preparePlayer(context, 'Tester');
});

test('the AI answers a move and undo takes both back', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.status-title')).toHaveText('Your turn');

  await dropInColumn(page, 4);
  await expect(moveList(page)).toHaveCount(2);
  await expect(moveList(page).nth(1)).toContainText('AI · Medium');
  await expect(page.locator('.status-title')).toHaveText('Your turn');

  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(moveList(page)).toHaveCount(0);
});

test('keyboard plays a local game to a win and offers the AI Coach', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('tab', { name: 'Local' }).click();
  await page.locator('body').click({ position: { x: 5, y: 5 } });

  for (const key of ['1', '2', '1', '2', '1', '2', '1']) {
    await page.keyboard.press(key);
  }

  await expect(page.locator('.status-title')).toHaveText('Red wins!');
  await expect(page.locator('.winning-cell')).toHaveCount(4);

  await page.getByRole('button', { name: 'Open review' }).click();
  await expect(page.getByRole('heading', { name: 'Post-game review' })).toBeVisible();

  // Coming back from the review shows the same finished game, not a new one
  await page.getByRole('button', { name: 'Game', exact: true }).click();
  await expect(page.locator('.status-title')).toHaveText('Red wins!');
  await expect(page.locator('.winning-cell')).toHaveCount(4);
  await expect(moveList(page)).toHaveCount(7);
});

test('the language switch translates the interface', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Switch language' }).click();
  await expect(page.locator('.status-title')).toHaveText('Ваш ход');
  await expect(page.getByRole('tab', { name: 'Против ИИ' })).toBeVisible();
});

test('the theme follows the system setting until the player picks one', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByRole('button', { name: 'Light theme' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(page.getByRole('button', { name: 'Dark theme' })).toBeVisible();
});
