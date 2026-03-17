import { test, expect } from '@playwright/test';

// Skip fully authenticated flows for now unless we mock Supabase auth
test.describe('Dashboard Navigation', () => {
  // We can add mock authentication here in the future
  test.skip('navigate to new invoice page', async ({ page }) => {
    // Assuming user is logged in
    await page.goto('/dashboard');
    
    // Click on "Nieuwe factuur" button
    await page.click('text=Nieuwe Factuur');
    
    // Check if we are on the new invoice page
    await expect(page).toHaveURL(/.*\/invoices\/new/);
    await expect(page.locator('h1')).toContainText('Nieuwe Factuur');
  });
});
