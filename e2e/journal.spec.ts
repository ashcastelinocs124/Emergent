import { test, expect } from '@playwright/test';

test('field journal lets the explorer write and review a hypothesis', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('j');
  await expect(page.getByRole('heading', { name: 'Field Journal' })).toBeVisible();
  await page.getByLabel('When').fill('I carry a guardian egg');
  await page.getByLabel('I expect').fill('the guardian advances');
  await page.getByRole('button', { name: 'Record hypothesis' }).click();
  await expect(page.getByText('I carry a guardian egg')).toBeVisible();
  await expect(page.getByText('the guardian advances')).toBeVisible();
  await page.getByRole('button', { name: 'Close journal' }).click();
  await expect(page.getByRole('heading', { name: 'Field Journal' })).not.toBeVisible();
});
