import { test, expect } from '@playwright/test';

test('pauses after Jev outage, preserves the expedition, and retries without local decisions', async ({ page }) => {
  test.setTimeout(35_000);
  await page.route('**/api/decision', route => route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"outage"}' }));
  await page.goto('/?debug=1');
  await expect(page.getByText('Decision link lost')).toBeVisible({ timeout: 20_000 });
  const saved = await page.evaluate(() => localStorage.getItem('alien-ecosystem:expedition:v1'));
  expect(saved).toBeTruthy();
  const savedTime = JSON.parse(saved!).world.time as number;
  await page.unroute('**/api/decision');
  await page.getByRole('button', { name: 'Retry connection' }).click();
  await expect(page.getByText('Decision link lost')).not.toBeVisible();
  await expect(page.locator('#visor-status')).toHaveText('LINK ACTIVE');
  await page.reload();
  expect(await page.evaluate(() => (window as unknown as { __alienDebug: { getWorld(): { time: number } } }).__alienDebug.getWorld().time)).toBeGreaterThanOrEqual(savedTime);
});
