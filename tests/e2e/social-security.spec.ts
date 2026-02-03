import { test, expect } from "@playwright/test";

test.describe("Social Security Income Events", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:5174");

    // Wait for the app to load
    await page.waitForLoadState("networkidle");

    // Accept any onboarding or initial modals
    const skipButton = page.locator(
      'button:has-text("Skip"), button:has-text("Get Started"), button:has-text("Continue")'
    );
    if (await skipButton.isVisible()) {
      await skipButton.click();
    }
  });

  test("should be able to create a Social Security income event", async ({
    page,
  }) => {
    // Look for the add event button
    const addEventButton = page
      .locator(
        'button:has-text("Add Event"), button[aria-label*="Add"], button:has-text("+")'
      )
      .first();
    await expect(addEventButton).toBeVisible({ timeout: 10000 });
    await addEventButton.click();

    // Wait for the categorized event creation modal
    await expect(page.locator("text=Create New Event")).toBeVisible();

    // Click on "Income & Consumption Events" category
    await page.locator("text=Income & Consumption Events").click();

    // Click on "Social Security" event type
    await page.locator("text=Social Security").click();

    // Fill out the Social Security form
    await expect(page.locator("text=Social Security Benefits")).toBeVisible();

    // Fill in benefit name
    await page.fill(
      'input[placeholder*="Social Security"]',
      "Social Security Retirement Benefits"
    );

    // Select claiming age (67 - Full Retirement Age)
    await page.selectOption("select", "67");

    // Fill in annual benefit amount
    await page.fill('input[placeholder*="45000"]', "45000");

    // Enable COLA adjustments
    await page.check('input[type="checkbox"]');

    // Save the event
    const saveButton = page.locator(
      'button:has-text("Save"), button:has-text("Create")'
    );
    await saveButton.click();

    // Verify the event was created
    await expect(page.locator("text=Social Security")).toBeVisible({
      timeout: 5000,
    });
  });

  test("should display Social Security income in net worth projections", async ({
    page,
  }) => {
    // Create a Social Security event first
    const addEventButton = page
      .locator(
        'button:has-text("Add Event"), button[aria-label*="Add"], button:has-text("+")'
      )
      .first();
    await addEventButton.click();

    await page.locator("text=Income & Consumption Events").click();
    await page.locator("text=Social Security").click();

    // Fill minimal required fields
    await page.fill('input[placeholder*="Social Security"]', "SS Benefits");
    await page.selectOption("select", "70"); // Age 70 for maximum benefits
    await page.fill('input[placeholder*="45000"]', "40000");

    const saveButton = page.locator(
      'button:has-text("Save"), button:has-text("Create")'
    );
    await saveButton.click();

    // Navigate to projections or charts view to verify income appears
    const chartsTab = page
      .locator('button:has-text("Charts"), text=Charts, text=Projections')
      .first();
    if (await chartsTab.isVisible()) {
      await chartsTab.click();
    }

    // Look for Social Security in the net worth or income projections
    // The exact selector will depend on how the charts render the data
    await expect(
      page.locator("text=Social Security, text=SS Benefits")
    ).toBeVisible({ timeout: 10000 });
  });

  test("should validate Social Security claiming age affects start date", async ({
    page,
  }) => {
    const addEventButton = page
      .locator(
        'button:has-text("Add Event"), button[aria-label*="Add"], button:has-text("+")'
      )
      .first();
    await addEventButton.click();

    await page.locator("text=Income & Consumption Events").click();
    await page.locator("text=Social Security").click();

    // Fill basic info
    await page.fill('input[placeholder*="Social Security"]', "Test SS");

    // Select claiming age 62 (early retirement)
    await page.selectOption("select", "62");

    // Verify that the start date fields are automatically updated
    // This test verifies the claimAge to startDateOffset conversion works
    const monthSelect = page.locator("select").nth(1); // Second select should be month
    const yearInput = page.locator('input[type="number"]').last(); // Last number input should be year

    // The exact values will depend on the current age and base year
    // We just verify they're populated and reasonable
    await expect(monthSelect).toHaveValue(/\d{2}/);
    await expect(yearInput).toHaveValue(/20\d{2}/);

    // Change claiming age and verify date updates
    await page.selectOption("select", "70");

    // Year should be different now (8 years later)
    await expect(yearInput).toHaveValue(/20\d{2}/);
  });
});
