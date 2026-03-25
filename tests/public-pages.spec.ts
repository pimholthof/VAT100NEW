import { test, expect } from '@playwright/test';

test.describe('Publieke paginas', () => {
  test('root pagina redirect naar dashboard of login', async ({ page }) => {
    await page.goto('/');
    // Ongeauthenticeerd → redirect naar login
    await expect(page).toHaveURL(/\/(login|dashboard)/);
  });

  test('onbekende routes geven 404', async ({ page }) => {
    const response = await page.goto('/deze-pagina-bestaat-niet');
    expect(response?.status()).toBe(404);
  });
});

test.describe('Dashboard secties (ongeauthenticeerd)', () => {
  const routes = [
    '/dashboard/quotes',
    '/dashboard/clients',
    '/dashboard/receipts',
    '/dashboard/bank',
    '/dashboard/tax',
  ];

  for (const route of routes) {
    test(`${route} redirect naar login`, async ({ page }) => {
      await page.goto(route);
      await expect(page).toHaveURL(/.*\/login/);
    });
  }
});
