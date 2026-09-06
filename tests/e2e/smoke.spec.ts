import { test, expect } from "@playwright/test";

test.describe("public pages", () => {
  test("home page loads", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("LPUGPT")).first()).toBeVisible();
  });

  test("login page loads", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("button", { name: /log in|sign in|continue/i })).toBeVisible();
  });
});

test.describe("authenticated chat", () => {
  test("student can log in and open chat", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel(/email/i).fill("student@lpu.in");
    await page.getByLabel(/password/i).fill("Student123!");
    await page.getByRole("button", { name: /continue/i }).click();
    await page.waitForURL(/\/app/, { timeout: 15_000 });
    await expect(page.getByPlaceholder(/message lpugpt/i)).toBeVisible({ timeout: 10_000 });
  });
});
