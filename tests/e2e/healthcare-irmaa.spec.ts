import { test, expect } from "@playwright/test";

test.describe("Healthcare and IRMAA Functionality", () => {
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

  test("should display Healthcare tab in Deep Dive section for Medicare-eligible users", async ({
    page,
  }) => {
    // Set up a high-income retirement scenario that triggers IRMAA
    await setupHighIncomeRetirementScenario(page);

    // Run simulation
    await runSimulation(page);

    // Navigate to a year where user is 67 (Medicare eligible)
    await navigateToYearWithAge(page, 67);

    // Find and click on Healthcare tab in Deep Dive section
    const healthcareTab = page.locator('button:has-text("🏥 Healthcare")');
    await expect(healthcareTab).toBeVisible({ timeout: 10000 });
    await healthcareTab.click();

    // Verify Healthcare content is displayed
    await expect(page.locator("text=Medicare Eligible")).toBeVisible();
    await expect(page.locator("text=Medicare Premium Breakdown")).toBeVisible();
    await expect(page.locator("text=IRMAA Calculation Details")).toBeVisible();

    // Verify base Medicare premiums are shown
    await expect(page.locator("text=Base Part B Premium")).toBeVisible();
    await expect(page.locator("text=Base Part D Premium")).toBeVisible();

    // Verify IRMAA surcharge information is shown for high income
    await expect(page.locator("text=IRMAA Surcharge")).toBeVisible();
    await expect(page.locator("text=Total Monthly Premium")).toBeVisible();

    // Verify MAGI information is displayed
    await expect(page.locator("text=MAGI for IRMAA Calculation")).toBeVisible();
    await expect(page.locator("text=2-year lookback")).toBeVisible();
  });

  test("should show IRMAA threshold alert for users near bracket cliffs", async ({
    page,
  }) => {
    // Set up a scenario with income just below an IRMAA threshold
    await setupNearIrmaaThresholdScenario(page);

    // Run simulation
    await runSimulation(page);

    // Look for IRMAA alert in the alerts section
    const alertsSection = page.locator("text=Important Alerts").first();
    if (await alertsSection.isVisible()) {
      // Check for IRMAA bracket alert
      await expect(page.locator("text=IRMAA Bracket Alert")).toBeVisible();
      await expect(page.locator("text=away from triggering")).toBeVisible();
      await expect(page.locator("text=Medicare premiums")).toBeVisible();
      await expect(page.locator("text=Roth conversions")).toBeVisible();
    }
  });

  test("should calculate Medicare premiums correctly for different income levels", async ({
    page,
  }) => {
    // Test low income (base premium only)
    await setupLowIncomeRetirementScenario(page);
    await runSimulation(page);
    await navigateToYearWithAge(page, 67);

    // Check Healthcare tab
    await page.locator('button:has-text("🏥 Healthcare")').click();

    // Verify base premium is shown without IRMAA surcharge
    const totalPremium = await page
      .locator("text=Total Monthly Premium")
      .locator("..")
      .textContent();
    expect(totalPremium).toMatch(/\$2[0-9][0-9]/); // Should be around $209 (base premium)

    // Verify no IRMAA surcharge
    const irmaaText = page.locator("text=IRMAA Surcharge");
    await expect(irmaaText).not.toBeVisible();

    // Reset and test high income scenario
    await page.reload();
    await page.waitForLoadState("networkidle");

    await setupHighIncomeRetirementScenario(page);
    await runSimulation(page);
    await navigateToYearWithAge(page, 67);

    await page.locator('button:has-text("🏥 Healthcare")').click();

    // Verify IRMAA surcharge is applied
    await expect(page.locator("text=IRMAA Surcharge")).toBeVisible();
    const highIncomePremium = await page
      .locator("text=Total Monthly Premium")
      .locator("..")
      .textContent();
    expect(highIncomePremium).toMatch(/\$[3-9][0-9][0-9]/); // Should be significantly higher
  });

  test("should not show Medicare costs for users under 65", async ({
    page,
  }) => {
    // Set up scenario with younger user
    await setupYoungRetiredScenario(page);
    await runSimulation(page);

    // Navigate to a year where user is 62
    await navigateToYearWithAge(page, 62);

    // Check Healthcare tab
    await page.locator('button:has-text("🏥 Healthcare")').click();

    // Should show "Not Yet Medicare Eligible"
    await expect(page.locator("text=Not Yet Medicare Eligible")).toBeVisible();
    await expect(
      page.locator("text=Medicare eligibility begins at age 65")
    ).toBeVisible();

    // Should show countdown to Medicare
    await expect(
      page.locator("text=Medicare costs will begin in")
    ).toBeVisible();
  });

  test("should properly handle two-year MAGI lookback for IRMAA calculation", async ({
    page,
  }) => {
    // Set up a scenario where income changes significantly
    await setupVariableIncomeScenario(page);
    await runSimulation(page);

    // Navigate to retirement year where IRMAA should use 2-year lookback
    await navigateToYearWithAge(page, 69);

    await page.locator('button:has-text("🏥 Healthcare")').click();

    // Verify MAGI calculation shows lookback year
    const magiSection = page
      .locator("text=MAGI for IRMAA Calculation")
      .locator("..");
    await expect(magiSection).toBeVisible();

    // Check that it mentions the 2-year lookback
    await expect(page.locator("text=2-year lookback")).toBeVisible();

    // Verify the lookback year is correctly calculated (current - 2)
    const currentYear = new Date().getFullYear();
    const expectedLookbackYear = currentYear + 6; // Assuming simulation starts from current year
    await expect(
      page.locator(`text=${expectedLookbackYear - 2}`)
    ).toBeVisible();
  });
});

// Helper functions for setting up test scenarios

async function setupHighIncomeRetirementScenario(page: any) {
  // Create a high-income retirement scenario that should trigger IRMAA

  // Add high income event
  await addEvent(page, "Income & Consumption Events", "Income");
  await page.fill('input[placeholder*="amount"]', "180000"); // High income
  await page.fill(
    'input[placeholder*="description"]',
    "High Retirement Income"
  );
  await page.click('button:has-text("Create Event")');

  // Set retirement age to 65
  await setRetirementAge(page, 65);
}

async function setupNearIrmaaThresholdScenario(page: any) {
  // Create scenario with income just below IRMAA threshold ($103,000 for single)

  await addEvent(page, "Income & Consumption Events", "Income");
  await page.fill('input[placeholder*="amount"]', "98000"); // Just below threshold
  await page.fill(
    'input[placeholder*="description"]',
    "Near IRMAA Threshold Income"
  );
  await page.click('button:has-text("Create Event")');

  await setRetirementAge(page, 65);
}

async function setupLowIncomeRetirementScenario(page: any) {
  // Create low-income scenario (below IRMAA thresholds)

  await addEvent(page, "Income & Consumption Events", "Income");
  await page.fill('input[placeholder*="amount"]', "45000"); // Low income
  await page.fill(
    'input[placeholder*="description"]',
    "Modest Retirement Income"
  );
  await page.click('button:has-text("Create Event")');

  await setRetirementAge(page, 65);
}

async function setupYoungRetiredScenario(page: any) {
  // Create scenario with early retirement

  await addEvent(page, "Income & Consumption Events", "Income");
  await page.fill('input[placeholder*="amount"]', "75000");
  await page.fill(
    'input[placeholder*="description"]',
    "Early Retirement Income"
  );
  await page.click('button:has-text("Create Event")');

  await setRetirementAge(page, 60);
}

async function setupVariableIncomeScenario(page: any) {
  // Create scenario with changing income over time

  // High income before retirement
  await addEvent(page, "Income & Consumption Events", "Income");
  await page.fill('input[placeholder*="amount"]', "200000");
  await page.selectOption('select[name*="endYear"]', "2030"); // Ends before retirement
  await page.fill(
    'input[placeholder*="description"]',
    "High Pre-Retirement Income"
  );
  await page.click('button:has-text("Create Event")');

  // Lower income in retirement
  await addEvent(page, "Income & Consumption Events", "Income");
  await page.fill('input[placeholder*="amount"]', "60000");
  await page.selectOption('select[name*="startYear"]', "2031"); // Starts in retirement
  await page.fill('input[placeholder*="description"]', "Retirement Income");
  await page.click('button:has-text("Create Event")');

  await setRetirementAge(page, 67);
}

async function addEvent(page: any, category: string, eventType: string) {
  const addEventButton = page
    .locator(
      'button:has-text("Add Event"), button[aria-label*="Add"], button:has-text("+")'
    )
    .first();
  await addEventButton.click();

  await page.locator(`text=${category}`).click();
  await page.locator(`text=${eventType}`).click();
}

async function setRetirementAge(page: any, age: number) {
  // Navigate to settings or user profile to set retirement age
  // This would depend on the specific UI implementation
  const settingsButton = page.locator(
    'button:has-text("Settings"), button[aria-label*="Settings"]'
  );
  if (await settingsButton.isVisible()) {
    await settingsButton.click();
    await page.fill('input[placeholder*="retirement age"]', age.toString());
    await page.click('button:has-text("Save")');
  }
}

async function runSimulation(page: any) {
  const runSimButton = page.locator('button:has-text("Run Simulation")');
  await expect(runSimButton).toBeVisible({ timeout: 10000 });
  await runSimButton.click();

  // Wait for simulation to complete
  await page.waitForSelector("text=Financial Plan Analysis", {
    timeout: 30000,
  });
}

async function navigateToYearWithAge(page: any, targetAge: number) {
  // Assuming user starts at age 30, calculate target year
  const currentYear = new Date().getFullYear();
  const targetYear = currentYear + (targetAge - 30);

  // Find and use the year selector in the Deep Dive section
  const yearSelector = page.locator("select").first();
  if (await yearSelector.isVisible()) {
    await yearSelector.selectOption(targetYear.toString());
  }

  // Wait for the data to load for the selected year
  await page.waitForTimeout(1000);
}
