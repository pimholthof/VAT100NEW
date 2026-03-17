import { test, expect } from '@playwright/test';

test('login page renders correctly', async ({ page }) => {
  await page.goto('/login');
  
  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/VAT100/);

  // Expect login form to be visible
  await expect(page.locator('form')).toBeVisible();
  await expect(page.getByPlaceholder('e-mailadres')).toBeVisible();
  await expect(page.locator('button[type="submit"]')).toContainText('Inloggen');
});

test('unauthenticated users are redirected from dashboard to login', async ({ page }) => {
  await page.goto('/dashboard');
  
  // Should hit the redirect from the layout/middleware
  await expect(page).toHaveURL(/.*\/login/);
});
