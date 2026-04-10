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

test.describe('Juridische paginas', () => {
  test('privacy pagina laadt met correcte titel', async ({ page }) => {
    await page.goto('/privacy');

    await expect(page).toHaveTitle(/Privacybeleid/);
    await expect(page.getByRole('heading', { level: 1, name: 'Privacybeleid' })).toBeVisible();
  });

  test('privacy pagina toont "Laatst bijgewerkt" datum', async ({ page }) => {
    await page.goto('/privacy');

    await expect(page.getByText(/Laatst bijgewerkt/)).toBeVisible();
  });

  test('privacy pagina heeft een "Terug" link naar /', async ({ page }) => {
    await page.goto('/privacy');

    const terugLink = page.getByRole('link', { name: /Terug/ });
    await expect(terugLink).toBeVisible();
    await expect(terugLink).toHaveAttribute('href', '/');
  });

  test('voorwaarden pagina laadt met correcte titel', async ({ page }) => {
    await page.goto('/voorwaarden');

    await expect(page).toHaveTitle(/Algemene Voorwaarden/);
    await expect(page.getByRole('heading', { level: 1, name: 'Algemene Voorwaarden' })).toBeVisible();
  });

  test('voorwaarden pagina toont "Laatst bijgewerkt" datum', async ({ page }) => {
    await page.goto('/voorwaarden');

    await expect(page.getByText(/Laatst bijgewerkt/)).toBeVisible();
  });

  test('voorwaarden pagina heeft een "Terug" link naar /', async ({ page }) => {
    await page.goto('/voorwaarden');

    const terugLink = page.getByRole('link', { name: /Terug/ });
    await expect(terugLink).toBeVisible();
    await expect(terugLink).toHaveAttribute('href', '/');
  });
});
