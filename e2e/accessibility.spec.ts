import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { preparePlayer } from './fixtures';

// Automated WCAG 2.1 A/AA checks with axe-core. A failure lists each rule,
// the elements that break it and a link explaining the fix.
const expectNoViolations = async (page: Page, label: string) => {
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  const summary = results.violations.map((v) => ({
    rule: v.id,
    impact: v.impact,
    help: v.helpUrl,
    targets: v.nodes.slice(0, 5).map((n) => n.target.join(' ')),
  }));
  expect(summary, `${label}: accessibility violations`).toEqual([]);
};

test.beforeEach(async ({ context }) => {
  await preparePlayer(context, 'Tester');
});

for (const colorScheme of ['dark', 'light'] as const) {
  test(`game screen has no violations (${colorScheme} theme)`, async ({ page }) => {
    await page.emulateMedia({ colorScheme });
    await page.goto('/');
    await expect(page.locator('.status-title')).toHaveText('Your turn');
    await expectNoViolations(page, `game, ${colorScheme}`);
  });
}

test('online lobby has no violations', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('tab', { name: 'Online 1v1' }).click();
  await expect(page.getByRole('button', { name: 'Create room' })).toBeVisible();
  await expectNoViolations(page, 'lobby');
});

test('dialogs have no violations', async ({ page }) => {
  await page.goto('/');
  for (const [button, heading] of [['Leaderboard', 'Leaderboard'], ['Shop', 'Skin shop'], ['Upgrade', 'NeuraFour PRO'], ['Sign in', 'Sign in']]) {
    await page.getByRole('button', { name: button, exact: true }).click();
    await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
    await expectNoViolations(page, `${heading} dialog`);
    await page.getByRole('button', { name: 'Close' }).click();
  }
  await page.locator('.header-profile').click();
  await expect(page.getByRole('heading', { name: 'Tester' })).toBeVisible();
  await expectNoViolations(page, 'profile dialog');
});

test('finished game and AI Coach review have no violations', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('tab', { name: 'Local' }).click();
  await page.locator('body').click({ position: { x: 5, y: 5 } });
  for (const key of ['1', '2', '1', '2', '1', '2', '1']) await page.keyboard.press(key);
  await expect(page.locator('.status-title')).toHaveText('Red wins!');
  await expectNoViolations(page, 'finished game');

  await page.getByRole('button', { name: 'Open review' }).click();
  await expect(page.getByRole('heading', { name: 'Post-game review' })).toBeVisible();
  await expectNoViolations(page, 'coach review');
});
