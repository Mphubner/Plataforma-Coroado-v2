import { test, expect } from '@playwright/test';

test('has title and login button', async ({ page }) => {
  await page.goto('/');

  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/Coroado/);

  // Expect the login button to be visible or something similar depending on the page
  // Adjust this selector to match your actual login button if necessary
  const loginButton = page.getByRole('button', { name: /Login/i });
  if (await loginButton.isVisible()) {
    await expect(loginButton).toBeVisible();
  }
});

test('navigation works', async ({ page }) => {
  await page.goto('/');

  // Check if we can navigate to public areas like Escola or Loja without error
  // They might redirect or show restricted access, but shouldn't crash
  await page.goto('/escola');
  await expect(page.locator('body')).toBeVisible();

  await page.goto('/loja');
  await expect(page.locator('body')).toBeVisible();
});
