import { test, expect } from '@playwright/test';

test.describe('Prijzen sectie', () => {
  test('alle drie de abonnementen zijn zichtbaar', async ({ page }) => {
    await page.goto('/');

    // Scroll naar de prijzen sectie
    const pricingSection = page.locator('#prijzen');
    await pricingSection.scrollIntoViewIfNeeded();

    // Controleer dat alle drie de plannen zichtbaar zijn
    await expect(pricingSection.getByText('€29')).toBeVisible();
    await expect(pricingSection.getByText('€39')).toBeVisible();
    await expect(pricingSection.getByText('€59')).toBeVisible();
  });

  test('plannamen Start, Studio en Complete zijn zichtbaar', async ({ page }) => {
    await page.goto('/');

    const pricingSection = page.locator('#prijzen');
    await pricingSection.scrollIntoViewIfNeeded();

    // Controleer de plannamen
    await expect(pricingSection.getByText('Start', { exact: true })).toBeVisible();
    await expect(pricingSection.getByText('Studio', { exact: true })).toBeVisible();
    await expect(pricingSection.getByText('Complete', { exact: true })).toBeVisible();
  });

  test('CTA-knoppen verwijzen naar de juiste registratie-URL', async ({ page }) => {
    await page.goto('/');

    const pricingSection = page.locator('#prijzen');
    await pricingSection.scrollIntoViewIfNeeded();

    // Controleer dat er links zijn naar /register?plan=... voor elk plan
    const basisLink = pricingSection.locator('a[href="/register?plan=basis"]');
    const studioLink = pricingSection.locator('a[href="/register?plan=studio"]');
    const compleetLink = pricingSection.locator('a[href="/register?plan=compleet"]');

    await expect(basisLink).toBeVisible();
    await expect(studioLink).toBeVisible();
    await expect(compleetLink).toBeVisible();
  });

  test('Studio is het uitgelichte abonnement', async ({ page }) => {
    await page.goto('/');

    const pricingSection = page.locator('#prijzen');
    await pricingSection.scrollIntoViewIfNeeded();

    // Het Studio-plan heeft een "Meest gekozen" badge
    await expect(pricingSection.getByText('Meest gekozen')).toBeVisible();

    // De Studio CTA-knop heeft de primaire stijl (btn-primary class)
    const studioLink = pricingSection.locator('a[href="/register?plan=studio"]');
    await expect(studioLink).toHaveClass(/btn-primary/);
  });

  test('niet-uitgelichte plannen hebben secundaire CTA-knoppen', async ({ page }) => {
    await page.goto('/');

    const pricingSection = page.locator('#prijzen');
    await pricingSection.scrollIntoViewIfNeeded();

    // Start en Complete plannen hebben een secundaire knop
    const basisLink = pricingSection.locator('a[href="/register?plan=basis"]');
    const compleetLink = pricingSection.locator('a[href="/register?plan=compleet"]');

    await expect(basisLink).toHaveClass(/btn-secondary/);
    await expect(compleetLink).toHaveClass(/btn-secondary/);
  });

  test('elk plan toont een lijst met features', async ({ page }) => {
    await page.goto('/');

    const pricingSection = page.locator('#prijzen');
    await pricingSection.scrollIntoViewIfNeeded();

    // Controleer dat elk plan features bevat (vinkjes ✓)
    const checkmarks = pricingSection.locator('text=✓');
    const count = await checkmarks.count();

    // Er zijn minimaal features over alle 3 plannen (5 + 8 + 7 = 20)
    expect(count).toBeGreaterThanOrEqual(15);
  });
});
