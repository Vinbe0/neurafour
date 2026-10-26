import { expect, test } from '@playwright/test';
import type { Browser } from '@playwright/test';
import { dropInColumn, moveList, preparePlayer } from './fixtures';

// Two separate browser contexts, so each player has their own storage
const openTwoPlayers = async (browser: Browser) => {
  const hostContext = await browser.newContext();
  const guestContext = await browser.newContext();
  await preparePlayer(hostContext, 'Alice');
  await preparePlayer(guestContext, 'Bob');
  return { host: await hostContext.newPage(), guest: await guestContext.newPage(), contexts: [hostContext, guestContext] };
};

// Two players play each other through the real multiplayer server
test('two players create, join and finish an online game', async ({ browser }) => {
  const { host, guest, contexts } = await openTwoPlayers(browser);

  // Host creates a room and sees its code while waiting
  await host.goto('/');
  await host.getByRole('tab', { name: 'Online 1v1' }).click();
  await host.getByRole('button', { name: 'Create room' }).click();
  await expect(host.getByText('Waiting for an opponent…')).toBeVisible();
  const roomCode = (await host.locator('.lobby-room h2').textContent())?.trim() ?? '';
  expect(roomCode).toMatch(/^[A-Z2-9]{5}$/);

  // Guest opens the invite link: Online mode is preselected with the code filled in
  await guest.goto(`/?room=${roomCode}`);
  await expect(guest.getByRole('textbox')).toHaveValue(roomCode);
  await guest.getByRole('button', { name: 'Join', exact: true }).click();

  // Both see the board, the room code and each other
  for (const page of [host, guest]) {
    await expect(page.locator('.room-code')).toHaveText(roomCode);
    await expect(page.locator('.player-card.red')).toContainText('Alice');
    await expect(page.locator('.player-card.yellow')).toContainText('Bob');
  }
  await expect(host.locator('.status-title')).toHaveText('Your turn');
  await expect(guest.locator('.status-title')).toHaveText("Opponent's turn");

  // Chat works during the game, and typing digits in it does not drop tokens
  const chatBox = host.getByRole('textbox', { name: 'Say something…' });
  await chatBox.fill('gl hf 1234');
  await chatBox.press('Enter');
  await expect(guest.locator('.chat-panel .chat-bubble')).toHaveText('gl hf 1234');
  await expect(moveList(host)).toHaveCount(0);

  // Alice wins on the bottom row while Bob stacks in column 7
  const moves: [typeof host, number][] = [
    [host, 1], [guest, 7], [host, 2], [guest, 7], [host, 3], [guest, 7], [host, 4],
  ];
  for (const [index, [page, column]] of moves.entries()) {
    await expect(page.locator('.status-title')).toHaveText('Your turn');
    await dropInColumn(page, column);
    await expect(moveList(host)).toHaveCount(index + 1);
    await expect(moveList(guest)).toHaveCount(index + 1);
  }

  await expect(host.locator('.status-title')).toHaveText('You win!');
  await expect(guest.locator('.status-title')).toHaveText('Opponent wins');

  await Promise.all(contexts.map((c) => c.close()));
});

test('a player who reloads the page rejoins the same game', async ({ browser }) => {
  const { host, guest, contexts } = await openTwoPlayers(browser);

  await host.goto('/');
  await host.getByRole('tab', { name: 'Online 1v1' }).click();
  await host.getByRole('button', { name: 'Create room' }).click();
  const roomCode = (await host.locator('.lobby-room h2').textContent())?.trim() ?? '';
  await guest.goto(`/?room=${roomCode}`);
  await guest.getByRole('button', { name: 'Join', exact: true }).click();

  for (const [page, column] of [[host, 4], [guest, 4], [host, 3]] as const) {
    await expect(page.locator('.status-title')).toHaveText('Your turn');
    await dropInColumn(page, column);
  }
  await expect(moveList(guest)).toHaveCount(3);

  // Bob's page reloads mid-game
  await guest.reload();
  await expect(guest.locator('.room-code')).toHaveText(roomCode);
  await expect(moveList(guest)).toHaveCount(3);
  await expect(guest.locator('.player-card.red')).toContainText('Alice');
  await expect(guest.locator('.status-title')).toHaveText('Your turn');
  await expect(host.getByText('Your opponent is back.')).toBeVisible();

  // ...and the game carries on for both
  await dropInColumn(guest, 5);
  await expect(moveList(host)).toHaveCount(4);
  await expect(host.locator('.status-title')).toHaveText('Your turn');

  await Promise.all(contexts.map((c) => c.close()));
});
