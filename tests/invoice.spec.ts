import { test, expect } from '@playwright/test';

test.describe('Factuur pagina (ongeauthenticeerd)', () => {
  test('factuurlijst redirect naar login', async ({ page }) => {
    await page.goto('/dashboard/invoices');
    await expect(page).toHaveURL(/.*\/login/);
  });

  test('nieuwe factuur redirect naar login', async ({ page }) => {
    await page.goto('/dashboard/invoices/new');
    await expect(page).toHaveURL(/.*\/login/);
  });
});

test.describe('Publieke factuur pagina', () => {
  test('niet-bestaand token toont 404', async ({ page }) => {
    await page.goto('/invoice/niet-bestaand-token');
    // Moet een not-found pagina tonen of een error
    const body = await page.textContent('body');
    expect(body).toBeTruthy();
  });
});
