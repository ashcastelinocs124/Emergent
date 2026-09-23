import { test, expect } from '@playwright/test';

test('opens a first-person habitat', async ({ page }) => {
  const renderWarnings: string[] = [];
  page.on('console', message => {
    if (message.type() === 'warning' && message.text().includes('THREE.')) {
      renderWarnings.push(message.text());
    }
  });
  await page.goto('/');
  await expect(page.locator('canvas')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Enter expedition' })).toBeVisible();
  expect(renderWarnings).toEqual([]);
});

test('explains when the browser refuses pointer lock', async ({ page }) => {
  await page.addInitScript(() => {
    HTMLCanvasElement.prototype.requestPointerLock = () => Promise.reject(new Error('denied'));
  });
  const pageErrors: string[] = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.goto('/');
  await page.getByRole('button', { name: 'Enter expedition' }).click();
  await expect(page.locator('#game-hint')).toContainText('Pointer lock unavailable');
  expect(pageErrors).toEqual([]);
});
