import { test, expect } from '@playwright/test';

test('accepting a Jev action does not issue a duplicate request', async ({ page }) => {
  test.setTimeout(25_000);
  await page.goto('/?debug=1&creatures=20');
  const counters = async () => page.locator('#debug-state').innerText().then(text => ({
    accepted: Number(text.match(/ACCEPTED (\d+)/)?.[1] ?? 0),
    stale: Number(text.match(/STALE (\d+)/)?.[1] ?? 0),
  }));
  await expect.poll(async () => (await counters()).accepted, { timeout: 20_000 }).toBeGreaterThan(20);
  const { accepted, stale } = await counters();
  expect(stale).toBeLessThan(accepted / 3);
});
