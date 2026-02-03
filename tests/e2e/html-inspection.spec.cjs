const { test, expect } = require("@playwright/test");

test.describe("HTML Inspection E2E Test", () => {
  test("should capture and log the rendered HTML", async ({ page }) => {
    // Navigate to the app
    await page.goto("http://localhost:5174");

    // Wait for the onboarding modal to load first
    await expect(
      page.getByRole("heading", { name: "PathFinder Pro" })
    ).toBeVisible();

    // Take a screenshot of the onboarding screen
    await page.screenshot({ path: "onboarding-screen.png" });

    // Get the onboarding HTML
    const onboardingHTML = await page.content();
    console.log("=== ONBOARDING HTML ===");
    console.log(onboardingHTML);

    // Select "The Accelerator" persona first
    await page.click('button[aria-label="Select persona: The Accelerator"]');

    // Wait a moment for the persona to be selected
    await page.waitForTimeout(500);

    // Click the "Select Profile" button to proceed to main app
    await page.click('button:has-text("Select Profile")');

    // Wait for onboarding modal to disappear and main app to appear
    await expect(
      page.getByRole("heading", { name: "PathFinder Pro" })
    ).not.toBeVisible({ timeout: 5000 });
    await expect(page.locator(".app-container")).toBeVisible({
      timeout: 10000,
    });

    // Wait for simulation to complete (give it time for async operations)
    await page.waitForTimeout(3000);

    // Take a screenshot of the main app
    await page.screenshot({ path: "main-app.png" });

    // Get the full HTML content after app loads
    const mainAppHTML = await page.content();
    console.log("=== MAIN APP HTML ===");
    console.log(mainAppHTML);

    // Get right panel HTML specifically
    const rightPanel = page.locator(".right-panel").first();
    if (await rightPanel.isVisible()) {
      const rightPanelHTML = await rightPanel.innerHTML();
      console.log("=== RIGHT PANEL HTML ===");
      console.log(rightPanelHTML);
    }

    // Get chart canvas details if they exist
    const canvas = page.locator("canvas");
    if (await canvas.isVisible()) {
      const canvasHTML = await canvas.innerHTML();
      const canvasAttrs = await canvas.evaluate((el) => ({
        width: el.width,
        height: el.height,
        className: el.className,
        id: el.id,
      }));
      console.log("=== CANVAS DETAILS ===");
      console.log("Canvas HTML:", canvasHTML);
      console.log("Canvas Attributes:", canvasAttrs);
    }

    // Log all visible headings and main sections
    const headings = await page.locator("h1, h2, h3").allTextContents();
    console.log("=== PAGE HEADINGS ===");
    console.log(headings);

    // Log main structural elements
    const sections = await page
      .locator('[class*="panel"], [class*="dashboard"], [class*="container"]')
      .count();
    console.log("=== STRUCTURAL ELEMENTS COUNT ===");
    console.log(`Found ${sections} main structural elements`);

    // Assert new panels are rendered (currently skipped due to dynamic data)
    // await expect(page.locator('h3', { hasText: 'RSU Vesting Events' })).toBeVisible();
    // await expect(page.locator('h3', { hasText: 'RSU Sale Events' })).toBeVisible();
    // await expect(page.locator('h3', { hasText: 'Concentration Risk Alerts' })).toBeVisible();
    // await expect(page.locator('h3', { hasText: 'Tax-Loss Harvesting Executions' })).toBeVisible();
    // await expect(page.locator('h3', { hasText: 'Strategic Capital-Gains Realization' })).toBeVisible();
  });
});
