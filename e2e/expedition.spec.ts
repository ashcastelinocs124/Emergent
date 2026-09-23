import { test, expect } from '@playwright/test';

test('helmet visor shows suit resources and expedition objective', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('visor-air')).toBeVisible();
  await expect(page.getByTestId('visor-power')).toBeVisible();
  await expect(page.getByTestId('visor-objective')).toContainText('REPAIR');
  await expect(page.getByText('SHIP SIGNAL')).toBeVisible();
});
