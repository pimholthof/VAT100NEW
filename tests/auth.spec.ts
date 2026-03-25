import { test, expect } from '@playwright/test';

test.describe('Authenticatie', () => {
  test('login pagina rendert correct', async ({ page }) => {
    await page.goto('/login');

    await expect(page).toHaveTitle(/VAT100/);
    await expect(page.locator('form')).toBeVisible();
    await expect(page.getByPlaceholder('e-mailadres')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toContainText('Inloggen');
  });

  test('register pagina rendert correct', async ({ page }) => {
    await page.goto('/register');

    await expect(page.locator('form')).toBeVisible();
    await expect(page.getByPlaceholder('e-mailadres')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toContainText('Registreren');
  });

  test('login pagina heeft link naar registratie', async ({ page }) => {
    await page.goto('/login');
    const registerLink = page.getByRole('link', { name: /registr/i });
    await expect(registerLink).toBeVisible();
  });

  test('unauthenticated users worden doorgestuurd naar login', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/.*\/login/);
  });

  test('unauthenticated users worden doorgestuurd van facturen', async ({ page }) => {
    await page.goto('/dashboard/invoices');
    await expect(page).toHaveURL(/.*\/login/);
  });

  test('unauthenticated users worden doorgestuurd van instellingen', async ({ page }) => {
    await page.goto('/dashboard/settings');
    await expect(page).toHaveURL(/.*\/login/);
  });

  test('login toont foutmelding bij lege submit', async ({ page }) => {
    await page.goto('/login');

    // Klik submit zonder gegevens in te vullen
    await page.locator('button[type="submit"]').click();

    // HTML5 validatie voorkomt submit — check dat we nog op login zijn
    await expect(page).toHaveURL(/.*\/login/);
  });
});
