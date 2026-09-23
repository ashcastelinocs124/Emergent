import { test, expect } from '@playwright/test';

test.use({ browserName: 'firefox' });

test('Escape releases the first-person pointer lock', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Enter expedition' }).click();
  await expect.poll(() => page.evaluate(() => Boolean(document.pointerLockElement))).toBe(true);
  await page.keyboard.press('Escape');
  await expect.poll(() => page.evaluate(() => Boolean(document.pointerLockElement))).toBe(false);
});
