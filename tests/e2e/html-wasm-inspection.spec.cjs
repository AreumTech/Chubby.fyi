const { test, expect } = require("@playwright/test");

test.describe("WASM Test Page HTML Inspection", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the local HTML file
    // Adjust the path as necessary if your dev server serves it differently
    // or if it's a static file.
    await page.goto("http://localhost:5174/test_wasm.html", {
      waitUntil: "networkidle",
    });
    // Wait for WASM to be ready, indicated by the #wasm-status content
    await expect(page.locator("#wasm-status")).toContainText(
      "✅ WASM loaded successfully!",
      { timeout: 20000 }
    );
  });

  test("should have the correct title", async ({ page }) => {
    await expect(page).toHaveTitle("WASM Simulation Test");
  });

  test("WASM should load successfully", async ({ page }) => {
    const wasmStatus = page.locator("#wasm-status");
    await expect(wasmStatus).toContainText("✅ WASM loaded successfully!");

    // Click the "Check WASM Status" button and verify key functions are present
    await page.getByRole("button", { name: "Check WASM Status" }).click();
    await expect(wasmStatus).toContainText(
      '"runMonteCarloSimulation": "function"'
    );
    await expect(wasmStatus).toContainText('"runSingleSimulation": "function"');
    await expect(wasmStatus).toContainText('"testMathFunctions": "function"');
  });

  test("Math Functions Test should run and display success", async ({
    page,
  }) => {
    const mathResults = page.locator("#math-results");
    await page.getByRole("button", { name: "Test Math Functions" }).click();

    // Wait for the text that indicates the WASM call is being made
    await expect(mathResults).toContainText("Testing math functions...", {
      timeout: 10000,
    });

    // Wait for the success message and check for some expected output structure
    await expect(mathResults).toContainText(
      "✅ Math functions test successful:",
      { timeout: 15000 }
    ); // Increased timeout for WASM execution
    await expect(mathResults).toContainText('"gaussianRandom":');
    await expect(mathResults).toContainText('"studentTRandom":');
    await expect(mathResults).toContainText('"annualToMonthly":');
    await expect(mathResults).toContainText('"monthlyVolatility":');
  });

  test("Simple Simulation Test should run and display success with results", async ({
    page,
  }) => {
    const simulationResults = page.locator("#simulation-results");
    await page.getByRole("button", { name: "Run Simple Simulation" }).click();

    // Wait for the success message
    await expect(simulationResults).toContainText(
      "✅ Simulation test successful",
      { timeout: 20000 }
    ); // Increased timeout for simulation
    await expect(simulationResults).toContainText("Success: true");
    await expect(simulationResults).toContainText("Months simulated: 12");
    await expect(simulationResults).toContainText("Final net worth:");
    await expect(simulationResults).toContainText(
      "Sample monthly data (first 3 months):"
    );
    await expect(simulationResults).toContainText('"monthOffset": 0');
    await expect(simulationResults).toContainText('"monthOffset": 1');
    await expect(simulationResults).toContainText('"monthOffset": 2');
    await expect(simulationResults).toContainText('"netWorth":');
  });

  test("Performance Test should run and display success with metrics", async ({
    page,
  }) => {
    const performanceResults = page.locator("#performance-results");
    await page.getByRole("button", { name: "Run Performance Test" }).click();

    // Wait for the success message
    await expect(performanceResults).toContainText(
      "✅ Performance test completed:",
      { timeout: 25000 }
    ); // Increased timeout for performance test
    await expect(performanceResults).toContainText("Iterations: 1000");
    await expect(performanceResults).toContainText("Total time:");
    await expect(performanceResults).toContainText("Operations per second:");
    await expect(performanceResults).toContainText(
      "Average time per operation:"
    );
  });

  test("Complete page structure should match snapshot", async ({ page }) => {
    // Give a little time for all buttons to be stable if they trigger async operations on load
    // (though beforeEach should handle WASM load)
    await page.waitForTimeout(1000);

    // Click all buttons to ensure their result sections are populated for a comprehensive snapshot
    await page.getByRole("button", { name: "Check WASM Status" }).click();
    await expect(page.locator("#wasm-status")).toContainText(
      '"runMonteCarloSimulation": "function"'
    );

    await page.getByRole("button", { name: "Test Math Functions" }).click();
    await expect(page.locator("#math-results")).toContainText(
      "✅ Math functions test successful:",
      { timeout: 15000 }
    );

    await page.getByRole("button", { name: "Run Simple Simulation" }).click();
    await expect(page.locator("#simulation-results")).toContainText(
      "✅ Simulation test successful",
      { timeout: 20000 }
    );

    await page.getByRole("button", { name: "Run Performance Test" }).click();
    await expect(page.locator("#performance-results")).toContainText(
      "✅ Performance test completed:",
      { timeout: 25000 }
    );

    // Ensure all content is loaded before taking a snapshot
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500); // Extra pause for any final rendering updates

    await expect(page.locator("body")).toHaveScreenshot(
      "html-wasm-test-page.png"
    );
  });
});
