import { test, expect, type Page } from '@playwright/test';

type Debug = { getWorld(): { items: { id: string; position: { x: number; z: number } }[];
  shipPosition: { x: number; z: number }; player: { position: { x: number; z: number }; inventory: { kind: string }[] };
  componentExposed: boolean; componentInstalled: boolean; creatures: { speciesId: string; currentIntent: { action: string } | null }[] };
  getTarget(): { id: string } | null;
  teleport(x: number, z: number, lookX: number, lookZ: number): void };
declare global { interface Window { __alienDebug: Debug } }

async function faceItem(page: Page, id: string): Promise<void> {
  for (const [dx, dz] of [[0, 2], [2, 0], [-2, 0], [0, -2]]) {
    await page.evaluate(({ itemId, dx, dz }) => {
      const item = window.__alienDebug.getWorld().items.find(candidate => candidate.id === itemId)!;
      window.__alienDebug.teleport(item.position.x + dx, item.position.z + dz, item.position.x, item.position.z);
    }, { itemId: id, dx, dz });
    await page.waitForTimeout(180);
    if (await page.evaluate(itemId => window.__alienDebug.getTarget()?.id === itemId, id)) return;
  }
  throw new Error(`Cannot aim at ${id}`);
}

async function collectItem(page: Page, id: string, kind: string): Promise<void> {
  for (let attempt = 0; attempt < 4; attempt++) {
    await faceItem(page, id);
    await page.keyboard.press('e');
    if (await page.evaluate(expected => window.__alienDebug.getWorld().player.inventory.some(item => item.kind === expected), kind)) return;
  }
  await expect.poll(() => page.evaluate(expected => window.__alienDebug.getWorld().player.inventory.some(item => item.kind === expected), kind)).toBe(true);
}

test('explorer observes two guardian responses, journals a theory, repairs and escapes', async ({ page }) => {
  test.setTimeout(45_000);
  await page.goto('/?debug=1');
  await expect(page.getByRole('button', { name: 'Enter expedition' })).toBeVisible();
  await page.getByRole('button', { name: 'Enter expedition' }).click();
  await page.evaluate(() => document.querySelector('#entry')?.classList.add('hidden'));

  await collectItem(page, 'egg-1', 'egg');
  await expect.poll(() => page.evaluate(() => window.__alienDebug.getWorld().creatures.some(creature =>
    creature.speciesId === 'guardian' && creature.currentIntent?.action === 'DEFEND')), { timeout: 8_000 }).toBe(true);
  await page.keyboard.press('r');
  await expect.poll(() => page.evaluate(() => window.__alienDebug.getWorld().player.inventory.some(item => item.kind === 'egg'))).toBe(false);
  await expect.poll(() => page.evaluate(() => window.__alienDebug.getWorld().creatures.some(creature =>
    creature.speciesId === 'guardian' && creature.currentIntent?.action === 'FOLLOW')), { timeout: 8_000 }).toBe(true);

  await page.keyboard.press('j');
  await page.getByLabel('When').fill('I carry a guardian egg');
  await page.getByLabel('I expect').fill('the guardian advances');
  await page.getByRole('button', { name: 'Record hypothesis' }).click();
  await expect(page.getByText('I carry a guardian egg')).toBeVisible();
  await page.getByRole('button', { name: 'Close journal' }).click();
  await page.evaluate(() => document.querySelector('#entry')?.classList.add('hidden'));

  await collectItem(page, 'ship-component', 'component');
  await page.evaluate(() => {
    const ship = window.__alienDebug.getWorld().shipPosition;
    window.__alienDebug.teleport(ship.x + 2, ship.z + 2.4, ship.x + 2, ship.z);
  });
  await page.waitForTimeout(180);
  await page.keyboard.press('e');
  await expect.poll(() => page.evaluate(() => window.__alienDebug.getWorld().componentInstalled)).toBe(true);
  await page.keyboard.press('e');
  await expect(page.getByRole('heading', { name: 'Expedition complete' })).toBeVisible();
});
