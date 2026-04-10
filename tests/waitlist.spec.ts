import { test, expect } from '@playwright/test';

test.describe('Wachtlijst formulier', () => {
  test('wachtlijst sectie is zichtbaar op de landingspagina', async ({ page }) => {
    await page.goto('/');

    // Scroll naar het wachtlijst formulier
    const waitlistForm = page.locator('form').filter({ has: page.locator('#waitlist-name') });
    await waitlistForm.scrollIntoViewIfNeeded();

    // Controleer dat het formulier zichtbaar is
    await expect(waitlistForm).toBeVisible();
  });

  test('wachtlijst formulier bevat naam- en e-mailvelden met labels', async ({ page }) => {
    await page.goto('/');

    // Controleer de velden
    await expect(page.locator('#waitlist-name')).toBeVisible();
    await expect(page.locator('#waitlist-email')).toBeVisible();

    // Controleer labels
    await expect(page.getByLabel('Naam')).toBeVisible();
    await expect(page.getByLabel('E-mail')).toBeVisible();
  });

  test('wachtlijst formulier heeft correcte placeholders', async ({ page }) => {
    await page.goto('/');

    const nameInput = page.locator('#waitlist-name');
    const emailInput = page.locator('#waitlist-email');

    await expect(nameInput).toHaveAttribute('placeholder', 'Je volledige naam');
    await expect(emailInput).toHaveAttribute('placeholder', 'je@naam.nl');
  });

  test('wachtlijst formulier vereist verplichte velden (validatie)', async ({ page }) => {
    await page.goto('/');

    const waitlistForm = page.locator('form').filter({ has: page.locator('#waitlist-name') });
    await waitlistForm.scrollIntoViewIfNeeded();

    // Beide velden zijn required
    const nameInput = page.locator('#waitlist-name');
    const emailInput = page.locator('#waitlist-email');

    await expect(nameInput).toHaveAttribute('required', '');
    await expect(emailInput).toHaveAttribute('required', '');
    await expect(emailInput).toHaveAttribute('type', 'email');
  });

  test('wachtlijst formulier toont validatiefout bij leeg verzenden', async ({ page }) => {
    await page.goto('/');

    const waitlistForm = page.locator('form').filter({ has: page.locator('#waitlist-name') });
    await waitlistForm.scrollIntoViewIfNeeded();

    // Probeer het formulier in te dienen zonder velden in te vullen
    const submitButton = waitlistForm.getByRole('button', { name: 'Houd me op de hoogte' });
    await expect(submitButton).toBeVisible();
    await submitButton.click();

    // Het formulier moet niet verzonden zijn (HTML5 validatie blokkeert)
    // De naam input moet nog steeds zichtbaar zijn (niet vervangen door succesmelding)
    await expect(page.locator('#waitlist-name')).toBeVisible();
  });

  test('wachtlijst verzendknop is aanwezig en actief', async ({ page }) => {
    await page.goto('/');

    const waitlistForm = page.locator('form').filter({ has: page.locator('#waitlist-name') });
    await waitlistForm.scrollIntoViewIfNeeded();

    const submitButton = waitlistForm.getByRole('button', { name: 'Houd me op de hoogte' });
    await expect(submitButton).toBeVisible();
    await expect(submitButton).toBeEnabled();
  });

  test('wachtlijst formulier verzendt succesvol met geldige gegevens', async ({ page }) => {
    await page.goto('/');

    const waitlistForm = page.locator('form').filter({ has: page.locator('#waitlist-name') });
    await waitlistForm.scrollIntoViewIfNeeded();

    // Vul het formulier in
    await page.locator('#waitlist-name').fill('Test Gebruiker');
    await page.locator('#waitlist-email').fill('test@voorbeeld.nl');

    // Verzend het formulier
    const submitButton = waitlistForm.getByRole('button', { name: 'Houd me op de hoogte' });
    await submitButton.click();

    // Na succesvolle indiening toont het formulier een bevestigingsmelding
    // met de succestekst en positie-informatie
    await expect(page.getByText('Je staat op de lijst')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('We sturen je een bericht zodra er nieuws is.')).toBeVisible();
  });
});
