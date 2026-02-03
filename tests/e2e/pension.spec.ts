import { test, expect } from "@playwright/test";

test.describe("Pension Income Events", () => {
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

  test("should be able to create a pension income event", async ({ page }) => {
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

    // Click on "Pension Income" event type
    await page.locator("text=Pension Income").click();

    // Fill out the pension form
    await expect(page.locator("text=Pension Details")).toBeVisible();

    // Fill in pension plan name
    await page.fill(
      'input[placeholder*="Pension Plan"]',
      "State Teachers Retirement System"
    );

    // Fill in source/organization
    await page.fill(
      'input[placeholder*="Teachers"]',
      "State of California Teachers Retirement"
    );

    // Set start date (month and year)
    await page.selectOption("select", "01"); // January
    await page.fill('input[placeholder*="2030"]', "2035");

    // Fill in annual pension amount
    await page.fill('input[placeholder*="36000"]', "42000");

    // Enable COLA adjustments
    await page.check('input[type="checkbox"]');

    // Save the event
    const saveButton = page.locator(
      'button:has-text("Save"), button:has-text("Create")'
    );
    await saveButton.click();

    // Verify the event was created
    await expect(page.locator("text=Teachers")).toBeVisible({ timeout: 5000 });
  });

  test("should display pension income in projections", async ({ page }) => {
    // Create a pension event first
    const addEventButton = page
      .locator(
        'button:has-text("Add Event"), button[aria-label*="Add"], button:has-text("+")'
      )
      .first();
    await addEventButton.click();

    await page.locator("text=Income & Consumption Events").click();
    await page.locator("text=Pension Income").click();

    // Fill minimal required fields
    await page.fill('input[placeholder*="Pension Plan"]', "Corporate DB Plan");
    await page.fill('input[placeholder*="Teachers"]', "IBM Pension Plan");
    await page.selectOption("select", "01");
    await page.fill('input[placeholder*="2030"]', "2040");
    await page.fill('input[placeholder*="36000"]', "36000");

    const saveButton = page.locator(
      'button:has-text("Save"), button:has-text("Create")'
    );
    await saveButton.click();

    // Navigate to projections view
    const chartsTab = page
      .locator('button:has-text("Charts"), text=Charts, text=Projections')
      .first();
    if (await chartsTab.isVisible()) {
      await chartsTab.click();
    }

    // Verify pension appears in projections
    await expect(
      page.locator("text=Corporate, text=IBM, text=Pension")
    ).toBeVisible({ timeout: 10000 });
  });

  test("should support COLA adjustments for pension", async ({ page }) => {
    const addEventButton = page
      .locator(
        'button:has-text("Add Event"), button[aria-label*="Add"], button:has-text("+")'
      )
      .first();
    await addEventButton.click();

    await page.locator("text=Income & Consumption Events").click();
    await page.locator("text=Pension Income").click();

    // Fill basic pension info
    await page.fill('input[placeholder*="Pension Plan"]', "COLA Test Pension");
    await page.fill('input[placeholder*="Teachers"]', "Test Organization");
    await page.selectOption("select", "01");
    await page.fill('input[placeholder*="2030"]', "2030");
    await page.fill('input[placeholder*="36000"]', "24000");

    // Verify COLA checkbox is present and can be toggled
    const colaCheckbox = page.locator('input[type="checkbox"]');
    await expect(colaCheckbox).toBeVisible();

    // Check COLA adjustment
    await colaCheckbox.check();
    await expect(colaCheckbox).toBeChecked();

    // Verify COLA description is present
    await expect(page.locator("text=cost-of-living")).toBeVisible();

    const saveButton = page.locator(
      'button:has-text("Save"), button:has-text("Create")'
    );
    await saveButton.click();

    // Verify the event was saved
    await expect(page.locator("text=COLA Test")).toBeVisible({ timeout: 5000 });
  });
});
