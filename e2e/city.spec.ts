import { test, expect, type Page } from '@playwright/test';
type CityDebug = { getState(): { claims: { id: string }[]; inventory: string[]; installed: string[]; launched: boolean; access: Record<string, boolean> }; getTarget(): { id: string } | null; teleport(x: number, z: number, lookX: number, lookZ: number): void };
declare global { interface Window { __cityDebug: CityDebug } }
async function aim(page: Page, id: string, x: number, z: number, fromX: number, fromZ: number) {
  await page.evaluate(({ x, z, fromX, fromZ }) => window.__cityDebug.teleport(fromX, fromZ, x, z), { x, z, fromX, fromZ });
  await expect.poll(() => page.evaluate(() => window.__cityDebug.getTarget()?.id)).toBe(id);
}
test('the explorer hears city claims, records a theory, repairs the ship, and escapes', async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto('/?debug=1');
  await expect(page.getByRole('button', { name: 'ENTER THE CITY' })).toBeVisible();
  await page.getByRole('button', { name: 'ENTER THE CITY' }).click();
  await aim(page, 'mara', -20, -9, -20, -12); await page.keyboard.press('e');
  await expect(page.getByRole('dialog', { name: 'Conversation' })).toBeVisible();
  await page.getByPlaceholder('Where can I find a power cell?').fill('Where is a power cell?');
  await page.getByRole('button', { name: 'ASK', exact: true }).click();
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
  await aim(page, 'ship', 0, -27, 0, -30);
  for (let i = 0; i < 3; i++) await page.keyboard.press('e');
  await expect.poll(() => page.evaluate(() => window.__cityDebug.getState().installed.length)).toBe(3);
  await page.keyboard.press('e');
  await expect(page.getByRole('dialog', { name: 'Escape complete' })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('alien-ecosystem:city:v1'))).toBeTruthy();
  expect(await page.evaluate(() => localStorage.getItem('alien-ecosystem:expedition:v1'))).toBeNull();
});
test('unknown question adds no claim', async ({ page }) => {
  await page.goto('/?debug=1'); await page.locator('#enter').click();
  await aim(page, 'mara', -20, -9, -20, -12); await page.keyboard.press('e');
  await page.getByPlaceholder('Where can I find a power cell?').fill('What is purple?');
  await page.getByRole('button', { name: 'ASK', exact: true }).click();
  await expect(page.locator('#conversation-line')).toContainText('What do you need?');
  expect(await page.evaluate(() => window.__cityDebug.getState().claims.length)).toBe(0);
});

test('a closed conversation ignores a late Jev reply', async ({ page }) => {
  await page.route('**/api/city-choice', async route => {
    if (route.request().postDataJSON()?.kind === 'dialogue') await new Promise(resolve => setTimeout(resolve, 700));
    await route.continue();
  });
  await page.goto('/?debug=1'); await page.locator('#enter').click();
  await aim(page, 'mara', -20, -9, -20, -12); await page.keyboard.press('e');
  await page.locator('#question').fill('power cell'); await page.locator('#question-form button').click();
  await page.locator('#conversation-close').click();
  await page.waitForTimeout(1000);
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
