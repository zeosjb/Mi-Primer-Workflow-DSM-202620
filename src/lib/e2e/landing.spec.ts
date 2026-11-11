import { expect, test } from "@playwright/test";

test("la landing de Rockdex funciona", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /descubre el mundo de las rocas/i }),
  ).toBeVisible();
});

test("permite navegar a privacidad", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: /política de privacidad/i }).click();
  await expect(page).toHaveURL(/\/privacidad/);
  await expect(
    page.getByRole("heading", { name: /política de privacidad/i }),
  ).toBeVisible();
});
