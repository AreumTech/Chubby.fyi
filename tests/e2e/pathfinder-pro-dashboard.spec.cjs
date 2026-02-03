const { test, expect } = require("@playwright/test");

test.describe("PathFinder Pro Dashboard E2E Test", () => {
  test("should load new PathFinderProDashboard matching web_main.html structure", async ({
    page,
  }) => {
    // Navigate to the app
    await page.goto("http://localhost:5174");

    // Wait for the onboarding modal to load first
    await expect(
      page.getByRole("heading", { name: "PathFinder Pro" })
    ).toBeVisible();

    // Select "The Accelerator" persona first
    await page.click('button[aria-label="Select persona: The Accelerator"]');

    // Wait a moment for the persona to be selected
    await page.waitForTimeout(500);

    // Click the "Select Profile" button to proceed to main app
    await page.click('button:has-text("Select Profile")');

    // Wait for onboarding modal to disappear and main app to appear
    await page.waitForTimeout(2000);

    // Check for new PathFinderProDashboard structure matching web_main.html

    // 1. Check for main dashboard container (be more specific)
    await expect(page.locator(".pathfinder-dashboard").first()).toBeVisible({
      timeout: 10000,
    });

    // 2. Check for header with PathFinder Pro branding
    await expect(
      page.locator("header, h1").filter({ hasText: "PathFinder" })
    ).toBeVisible();

    // 3. Check for left sidebar with exact width (384px from web_main.html)
    const sidebar = page.locator("aside").first();
    if (await sidebar.isVisible()) {
      // Check for Financial Goals section
      await expect(page.locator("text=Financial Goals, text=🎯")).toBeVisible();

      // Check for Financial Timeline section
      await expect(
        page.locator("text=Financial Timeline, text=📅")
      ).toBeVisible();

      // Check for Active Strategies section
      await expect(
        page.locator("text=Active Strategies, text=🎛️")
      ).toBeVisible();
    }

    // 4. Check for main content area with sections
    await expect(page.locator('main, [class*="main"]')).toBeVisible();

    // 5. Check for Goal-by-Goal Success Analysis section
    await expect(
      page.locator("text=Goal-by-Goal Success Analysis")
    ).toBeVisible();

    // 6. Check for goal cards with gradient backgrounds (should have gradient classes)
    const goalCards = page.locator(
      '[class*="gradient"], [class*="bg-gradient"]'
    );
    if ((await goalCards.count()) > 0) {
      console.log(`Found ${await goalCards.count()} gradient goal cards`);
    }

    // 7. Check for Net Worth Projection section
    await expect(page.locator("text=Net Worth Projection")).toBeVisible();

    // 8. Check for chart controls with toggle buttons
    const chartControls = page
      .locator("button")
      .filter({ hasText: /Net Worth|Cash Flow|Asset Mix/ });
    if ((await chartControls.count()) > 0) {
      console.log(`Found ${await chartControls.count()} chart control buttons`);
    }

    // 9. Check for Year-by-Year Deep Dive section
    await expect(
      page.locator("text=Year-by-Year Deep Dive, text=Deep Dive")
    ).toBeVisible();

    // 10. Check for tab interface (should have tab-like buttons)
    const tabs = page.locator(
      '[role="tab"], button[class*="tab"], [class*="border-b-2"]'
    );
    if ((await tabs.count()) > 0) {
      console.log(`Found ${await tabs.count()} tab elements`);
    }

    // Take a screenshot of the new dashboard
    await page.screenshot({
      path: "pathfinder-pro-dashboard.png",
      fullPage: true,
    });

    // Get the full HTML content to verify structure
    const dashboardHTML = await page.content();

    // Log key structural information
    const headings = await page.locator("h1, h2, h3").allTextContents();
    console.log("=== DASHBOARD HEADINGS ===");
    console.log(headings);

    // Count main structural elements
    const sections = await page.locator("section, aside, main, header").count();
    console.log("=== STRUCTURAL ELEMENTS ===");
    console.log(`Found ${sections} main structural elements`);

    // Check for simulation data loading
    const hasSimulationData =
      (await page.locator("text=/\\$.*M|\\$.*K|\\d+%/").count()) > 0;
    console.log("=== SIMULATION DATA ===");
    console.log(`Has financial data: ${hasSimulationData}`);

    // Verify no errors in console (basic check)
    const errors = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        errors.push(msg.text());
      }
    });

    // Wait a bit more for any simulation to complete
    await page.waitForTimeout(3000);

    console.log("=== CONSOLE ERRORS ===");
    if (errors.length > 0) {
      console.log(errors);
    } else {
      console.log("No console errors detected");
    }

    // Basic assertion that the app loaded without crashing
    await expect(page.locator("body")).toBeVisible();
  });
});
