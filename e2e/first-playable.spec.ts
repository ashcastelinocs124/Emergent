import { test, expect, type Page } from '@playwright/test';

type Debug = { getWorld(): { items: { id: string; position: { x: number; z: number } }[];
  shipPosition: { x: number; z: number }; player: { inventory: { kind: string }[] };
  componentInstalled: boolean; creatures: { speciesId: string; currentIntent: { action: string } | null }[] };
  teleport(x: number, z: number, lookX: number, lookZ: number): void };
declare global { interface Window { __alienDebug: Debug } }

async function faceItem(page: Page, id: string): Promise<void> {
  await page.evaluate(itemId => {
    const item = window.__alienDebug.getWorld().items.find(candidate => candidate.id === itemId)!;
    window.__alienDebug.teleport(item.position.x, item.position.z + 2, item.position.x, item.position.z);
  }, id);
  await page.waitForTimeout(180);
}

test('explorer observes two guardian responses, journals a theory, repairs and escapes', async ({ page }) => {
  test.setTimeout(45_000);
  await page.goto('/?debug=1');
  await expect(page.getByRole('button', { name: 'Enter expedition' })).toBeVisible();
  await page.getByRole('button', { name: 'Enter expedition' }).click();
  await page.evaluate(() => document.querySelector('#entry')?.classList.add('hidden'));

  await faceItem(page, 'egg-1');
  await page.keyboard.press('e');
  await expect.poll(() => page.evaluate(() => window.__alienDebug.getWorld().player.inventory.some(item => item.kind === 'egg'))).toBe(true);
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

  await faceItem(page, 'ship-component');
  await page.keyboard.press('e');
  await expect.poll(() => page.evaluate(() => window.__alienDebug.getWorld().player.inventory.some(item => item.kind === 'component'))).toBe(true);
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
