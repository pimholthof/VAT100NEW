import { test, expect } from '@playwright/test';

test('login page renders correctly', async ({ page }) => {
  await page.goto('/login');
  
  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/VAT100/);

  // Expect login form to be visible
  await expect(page.locator('form')).toBeVisible();
  await expect(page.getByLabel('E-mail')).toBeVisible();
  await expect(page.getByLabel('Wachtwoord')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Inloggen' })).toBeVisible();
});

test('unauthenticated users are redirected from dashboard to login', async ({ page }) => {
  await page.goto('/dashboard');
  
  // Should hit the redirect from the layout/middleware
  await expect(page).toHaveURL(/.*\/login/);
});
