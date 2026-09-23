import { test, expect } from '@playwright/test';

test('labels the deterministic test service', async ({ page, request }) => {
  await page.goto('/');
  await expect(page.getByText('TEST SIMULATION')).toBeVisible();
  const health = await request.get('/api/health');
  expect(health.ok()).toBe(true);
  expect(await health.json()).toMatchObject({ mode: 'fake' });
});
