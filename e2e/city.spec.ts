import { test, expect, type Page } from '@playwright/test';
type CityDebug = { getState(): { time: number; shipStage: 'aboard' | 'outside' | 'hidden'; claims: { id: string }[]; inventory: string[]; installed: string[]; launched: boolean; access: Record<string, boolean>; conversations: Record<string, { text: string }[]> }; getTarget(): { id: string } | null; teleport(x: number, z: number, lookX: number, lookZ: number): void };
declare global { interface Window { __cityDebug: CityDebug } }

test('city time keeps pace with real time while traffic renders', async ({ page }) => {
  await page.goto('/?debug=1');
  await page.locator('#enter').click();
  await page.evaluate(() => window.__cityDebug.teleport(0, -30, 0, 50));
  const before = await page.evaluate(() => window.__cityDebug.getState().time);
  await page.waitForTimeout(2400);
  const after = await page.evaluate(() => window.__cityDebug.getState().time);
  expect(after - before).toBeGreaterThan(1.5);
});
test('the hatch button enters the ship and the cockpit button leaves it again', async ({ page }) => {
  await page.goto('/?debug=1');
  await page.getByRole('button', { name: 'EXIT SHIP' }).click();
  await page.evaluate(() => window.__cityDebug.teleport(-20, -168, -20, -171));
  await expect.poll(() => page.evaluate(() => window.__cityDebug.getTarget()?.id)).toBe('hatch');
  await expect(page.getByRole('button', { name: 'ENTER SHIP' })).toBeVisible();
  await page.getByRole('button', { name: 'ENTER SHIP' }).click();
  await expect.poll(() => page.evaluate(() => window.__cityDebug.getState().shipStage)).toBe('aboard');
  await expect(page.locator('#entry-title')).toContainText('SHIP');
  await page.reload();
  await expect(page.locator('#entry-title')).toContainText('SHIP');
  await expect.poll(() => page.evaluate(() => window.__cityDebug.getState().shipStage)).toBe('aboard');
  await expect(page.getByRole('button', { name: 'EXIT SHIP' })).toBeVisible();
  await page.getByRole('button', { name: 'EXIT SHIP' }).click();
  await expect.poll(() => page.evaluate(() => window.__cityDebug.getState().shipStage)).toBe('outside');
  await expect(page.getByRole('button', { name: 'ENTER SHIP' })).toBeHidden();
  await page.evaluate(() => window.__cityDebug.teleport(-20, -168, -20, -171));
  await expect.poll(() => page.evaluate(() => window.__cityDebug.getTarget()?.id)).toBe('hatch');
  await page.keyboard.press('e');
  await expect.poll(() => page.evaluate(() => window.__cityDebug.getState().shipStage)).toBe('aboard');
});
async function aim(page: Page, id: string, x: number, z: number, fromX: number, fromZ: number) {
  await page.evaluate(({ x, z, fromX, fromZ }) => window.__cityDebug.teleport(fromX, fromZ, x, z), { x, z, fromX, fromZ });
  await expect.poll(() => page.evaluate(() => window.__cityDebug.getTarget()?.id)).toBe(id);
}
test('the explorer hears city claims, records a theory, repairs the ship, and escapes', async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto('/?debug=1');
  expect(await page.evaluate(() => window.__cityDebug.getState().shipStage)).toBe('aboard');
  await expect(page.getByRole('button', { name: 'EXIT SHIP' })).toBeVisible();
  await expect(page.locator('.cockpit-shell')).toBeVisible();
  await page.getByRole('button', { name: 'EXIT SHIP' }).click();
  expect(await page.evaluate(() => window.__cityDebug.getState().shipStage)).toBe('outside');
  await expect(page.locator('#location-label')).toContainText('CRASH SITE');
  await aim(page, 'cloak', -19, -165, -17, -162); await page.keyboard.press('e');
  expect(await page.evaluate(() => window.__cityDebug.getState().shipStage)).toBe('hidden');
  await expect(page.locator('#objective')).toContainText('FIND HELP');
  await aim(page, 'mara', -20, -9, -20, -12); await page.keyboard.press('e');
  await expect(page.getByRole('dialog', { name: 'Conversation' })).toBeVisible();
  await expect(page.locator('#question')).toHaveValue('');
  await page.locator('#question').fill('Where is a power cell?');
  await page.getByRole('button', { name: 'SEND', exact: true }).click();
  await expect(page.locator('#conversation-line')).toContainText('workshop cabinet');
  await page.getByRole('button', { name: 'Close conversation' }).click();
  await page.keyboard.press('j');
  await expect(page.getByRole('dialog', { name: 'City journal' })).toBeVisible();
  await expect(page.locator('#claims')).toContainText('Mara Voss');
  await page.locator('#assumption-evidence').selectOption('mechanic-power');
  await page.getByRole('button', { name: 'RECORD ASSUMPTION' }).click();
  await expect(page.locator('#assumptions')).toContainText('Power cell');
  await page.getByRole('button', { name: 'ANALYZE EVIDENCE' }).click();
  await expect(page.locator('#analysis-status')).toContainText('SUGGESTED: power-cell at workshop');
  await page.getByRole('button', { name: 'Close journal' }).click();
  await aim(page, 'workshop', -17, -8, -17, -11); await page.keyboard.press('e');
  await aim(page, 'power-cell', -26, -8, -26, -11); await page.keyboard.press('e');
  await expect.poll(() => page.evaluate(() => window.__cityDebug.getState().inventory.includes('power-cell'))).toBe(true);
  await aim(page, 'thermal-shield', 27, -18, 27, -21); await page.keyboard.press('e');
  await expect.poll(() => page.evaluate(() => window.__cityDebug.getState().inventory.includes('thermal-shield'))).toBe(true);
  await aim(page, 'transit-depot', 17, 28, 17, 25); await page.keyboard.press('e');
  await expect.poll(() => page.evaluate(() => window.__cityDebug.getState().access['transit-depot'])).toBe(true);
  await aim(page, 'navigation-relay', 22, 28, 22, 25); await page.keyboard.press('e');
  await expect.poll(() => page.evaluate(() => window.__cityDebug.getState().inventory.includes('navigation-relay'))).toBe(true);
  await aim(page, 'cloak', -19, -165, -17, -162); await page.keyboard.press('e');
  expect(await page.evaluate(() => window.__cityDebug.getState().shipStage)).toBe('outside');
  await aim(page, 'ship', -27, -168, -27, -171);
  for (let i = 0; i < 3; i++) await page.keyboard.press('e');
  await expect.poll(() => page.evaluate(() => window.__cityDebug.getState().installed.length)).toBe(3);
  await expect(page.locator('#objective-detail')).toContainText('Return to the ship console and launch');
  await page.keyboard.press('e');
  await expect(page.getByRole('dialog', { name: 'Escape complete' })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('alien-ecosystem:city:v2'))).toBeTruthy();
  expect(await page.evaluate(() => localStorage.getItem('alien-ecosystem:expedition:v1'))).toBeNull();
});
test('unknown question adds no claim', async ({ page }) => {
  await page.goto('/?debug=1'); await page.locator('#enter').click();
  await aim(page, 'mara', -20, -9, -20, -12); await page.keyboard.press('e');
  await page.locator('#question').fill('What is purple?');
  await page.getByRole('button', { name: 'SEND', exact: true }).click();
  await expect(page.locator('#conversation-line')).toContainText('What do you need?');
  expect(await page.evaluate(() => window.__cityDebug.getState().claims.length)).toBe(0);
});

test('a resident keeps a multi-turn chat when the explorer walks away and returns', async ({ page }) => {
  await page.goto('/?debug=1'); await page.locator('#enter').click();
  await aim(page, 'mara', -20, -9, -20, -12); await page.keyboard.press('e');
  await page.locator('#question').fill('Where is a power cell?'); await page.locator('#question-form button').click();
  await expect(page.locator('#conversation-history')).toContainText('Where is a power cell?');
  await expect(page.locator('#conversation-history')).toContainText('workshop cabinet');
  await page.locator('#question').fill('How are you doing?'); await page.locator('#question-form button').click();
  await expect(page.locator('#conversation-history .chat-turn')).toHaveCount(4);
  await expect(page.locator('#conversation-history')).toContainText('motor');
  await expect(page.locator('#speaker-portrait')).toHaveAttribute('src', '/portraits/mara.jpg');
  await page.locator('#conversation-close').click();
  await page.keyboard.press('e');
  await expect(page.locator('#conversation-history .chat-turn')).toHaveCount(4);
  expect(await page.evaluate(() => window.__cityDebug.getState().conversations.mara.length)).toBe(4);
});

test('a chat outage shows the selected sourced account and keeps the repair clue', async ({ page }) => {
  await page.route('**/api/city-chat', route => route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"outage"}' }));
  await page.goto('/?debug=1'); await page.locator('#enter').click();
  await aim(page, 'mara', -20, -9, -20, -12); await page.keyboard.press('e');
  await page.locator('#question').fill('Where is a power cell?'); await page.locator('#question-form button').click();
  await expect(page.locator('#conversation-status')).toContainText('VOICE LINK INTERRUPTED');
  await expect(page.locator('#conversation-history')).toContainText('workshop cabinet');
  expect(await page.evaluate(() => window.__cityDebug.getState().claims.some(claim => claim.id === 'mechanic-power'))).toBe(true);
  await page.unroute('**/api/city-chat');
  await page.locator('#question').fill('How is your day?'); await page.locator('#question-form button').click();
  await expect(page.locator('#conversation-history .chat-turn')).toHaveCount(4);
  await expect(page.locator('#chat-mode')).toContainText('TEST SIMULATION');
});

test('closing conversation discards a late OpenAI reply', async ({ page }) => {
  let releaseReply = () => {};
  const replyGate = new Promise<void>(resolve => { releaseReply = resolve; });
  await page.route('**/api/city-chat', async route => { await replyGate; await route.continue(); });
  await page.goto('/?debug=1'); await page.locator('#enter').click();
  await aim(page, 'mara', -20, -9, -20, -12); await page.keyboard.press('e');
  await page.locator('#question').fill('Where is a power cell?'); await page.locator('#question-form button').click();
  await expect(page.locator('#conversation-status')).toContainText('WAITING FOR REPLY');
  const reply = page.waitForResponse('**/api/city-chat');
  await page.locator('#conversation-close').click();
  releaseReply();
  await reply;
  await page.waitForTimeout(100);
  expect(await page.evaluate(() => window.__cityDebug.getState().claims.length)).toBe(0);
  expect(await page.evaluate(() => window.__cityDebug.getState().conversations.mara.length)).toBe(0);
});

test('a closed conversation ignores a late Jev reply', async ({ page }) => {
  let releaseReply = () => {};
  let markRequestSeen = () => {};
  const replyGate = new Promise<void>(resolve => { releaseReply = resolve; });
  const requestSeen = new Promise<void>(resolve => { markRequestSeen = resolve; });
  await page.route('**/api/city-choice', async route => {
    if (route.request().postDataJSON()?.kind === 'dialogue') { markRequestSeen(); await replyGate; }
    await route.continue();
  });
  await page.goto('/?debug=1'); await page.locator('#enter').click();
  await aim(page, 'mara', -20, -9, -20, -12); await page.keyboard.press('e');
  await page.locator('#question').fill('power cell'); await page.locator('#question-form button').click();
  await requestSeen;
  const reply = page.waitForResponse(response => response.url().includes('/api/city-choice') && response.request().postDataJSON()?.kind === 'dialogue');
  await page.locator('#conversation-close').click();
  releaseReply();
  await reply;
  expect(await page.evaluate(() => window.__cityDebug.getState().claims.length)).toBe(0);
});

test('the city remains walkable through a Jev outage and retries', async ({ page }) => {
  await page.route('**/api/city-choice', route => route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"outage"}' }));
  await page.goto('/?debug=1'); await page.locator('#enter').click();
  await aim(page, 'mara', -20, -9, -20, -12); await page.keyboard.press('e');
  await page.locator('#question').fill('power cell'); await page.locator('#question-form button').click();
  await expect(page.locator('#link-warning')).toBeVisible();
  await page.locator('#conversation-close').click();
  await page.evaluate(() => window.__cityDebug.teleport(3, 7, 3, 9));
  await expect(page.locator('#location-label')).toContainText('SOUTH DISTRICT');
  await page.unroute('**/api/city-choice');
  await page.locator('#link-retry').click();
  await expect(page.locator('#link-warning')).toBeHidden();
});

test('a material pickup prompt appears only within collection reach', async ({ page }) => {
  await page.goto('/?debug=1'); await page.locator('#enter').click();
  await page.evaluate(() => window.__cityDebug.teleport(-26, -12.5, -26, -8));
  await page.waitForTimeout(100);
  expect(await page.evaluate(() => window.__cityDebug.getTarget()?.id)).not.toBe('power-cell');
});

test('arrival diagnostics name damaged systems before revealing the needed materials', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#diagnostics')).toContainText('POWER BUS');
  await expect(page.locator('#diagnostics')).not.toContainText('POWER CELL');
});
