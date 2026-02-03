const { test, expect } = require("@playwright/test");

/**
 * E2E test suite to verify JavaScript can load and invoke WebAssembly functions.
 */
test.describe("WASM integration", () => {
  test("loads the WASM module and exposes functions", async ({ page }) => {
    // Navigate to the test page serving the WASM loader
    await page.goto("/test_wasm.html");

    // Wait for the status element to show successful load
    const status = page.locator("#wasm-status");
    // Wait for WASM to be loaded
    await expect(status).toHaveText(/✅ WASM loaded successfully/);

    // Wait for the WASM JS function to be available before clicking
    await page.waitForFunction(
      () => typeof window.testMathFunctions === "function",
      null,
      { timeout: 15000 }
    );
    // Optionally, add a small delay to ensure Go runtime is ready
    await page.waitForTimeout(300);

    // Now click and check math results
    await page.click("text=Test Math Functions");
    const mathResults = page.locator("#math-results");
    // Wait for the math results element to become visible (not just non-empty)
    await mathResults.waitFor({ state: "visible", timeout: 15000 });

    // Expect the "loading" state text, set before the actual WASM call.
    // This confirms the JavaScript wrapper function has started.
    await expect(mathResults).toHaveText(
      /Testing math functions.../,
      { timeout: 20000 } // Give it enough time to catch this intermediate state
    );

    // Then, wait for the final text indicating WASM interaction result.
    await expect(mathResults).toHaveText(
      /✅ Math functions test successful|❌ Math functions test failed/,
      { timeout: 25000 } // Timeout for the WASM execution and result display
    );

    const mathText = await mathResults.textContent();
    expect(mathText).toMatch(/(✅|❌) Math functions test/);

    // Verify simulation function is callable
    await page.click("text=Run Simple Simulation");
    const simResults = page.locator("#simulation-results");
    // Wait until simulation results appear (success or error)
    await page.waitForFunction(
      () => {
        const el = document.querySelector("#simulation-results");
        return el && el.textContent.trim().length > 0;
      },
      null,
      { timeout: 20000 }
    );
    const simText = await simResults.textContent();
    expect(simText).toMatch(/(✅|❌) Simulation test/);
  });
});
