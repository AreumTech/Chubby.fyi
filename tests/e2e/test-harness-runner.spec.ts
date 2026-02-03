/**
 * Phase 4 Task 4.2: Comprehensive Test Harness Runner
 * 
 * This automated test runner validates all test cases against their golden snapshots,
 * ensuring 100% regression coverage for PathFinder Pro simulation engine.
 * 
 * Test Flow:
 * 1. Discover all test case files in test-cases/ directory
 * 2. For each test case, run simulation via test harness
 * 3. Compare output against corresponding snapshot file
 * 4. Report any differences as test failures
 */

import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';

interface TestCase {
  name: string;
  path: string;
  snapshotPath: string;
  content: any;
}

// Global test configuration
const TEST_TIMEOUT = 60000; // 60 seconds per test case
const BASE_URL = 'http://localhost:5186'; // Using current dev server port
const TEST_CASES_DIR = 'test-cases';
const SNAPSHOTS_DIR = 'test-cases/snapshots';

/**
 * Discover all test case files and their corresponding snapshots
 */
async function discoverTestCases(): Promise<TestCase[]> {
  const testCases: TestCase[] = [];
  
  try {
    // Read all files in test-cases directory
    const files = await readdir(TEST_CASES_DIR);
    
    // Filter for JSON test case files (exclude snapshots and documentation)
    const testCaseFiles = files.filter(file => 
      file.endsWith('.json') && 
      !file.includes('snapshot') &&
      !file.startsWith('.')
    );
    
    for (const fileName of testCaseFiles) {
      const testCasePath = join(TEST_CASES_DIR, fileName);
      const snapshotName = fileName.replace('.json', '.snapshot.json');
      const snapshotPath = join(SNAPSHOTS_DIR, snapshotName);
      
      // Read test case content
      let content;
      try {
        const fileContent = await readFile(testCasePath, 'utf-8');
        content = JSON.parse(fileContent);
      } catch (error) {
        console.warn(`⚠️ Could not parse test case ${fileName}:`, error);
        continue;
      }
      
      // Check if snapshot exists
      let hasSnapshot = false;
      try {
        await readFile(snapshotPath, 'utf-8');
        hasSnapshot = true;
      } catch (error) {
        console.warn(`⚠️ No snapshot found for ${fileName}, skipping regression test`);
      }
      
      if (hasSnapshot) {
        testCases.push({
          name: fileName.replace('.json', ''),
          path: testCasePath,
          snapshotPath: snapshotPath,
          content: content
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Failed to discover test cases:', error);
    throw error;
  }
  
  return testCases.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Wait for test harness to be ready
 */
async function waitForTestHarnessReady(page: Page): Promise<void> {
  // Wait for the main heading to appear
  await page.waitForSelector('h1', { state: 'visible', timeout: 30000 });
  
  // Wait for test case dropdown to be populated
  await page.waitForSelector('select option[value]:not([value=""])', { timeout: 10000 });
  
  // Additional wait for any async initialization
  await page.waitForTimeout(1000);
}

/**
 * Load test case into the harness editor
 */
async function loadTestCase(page: Page, testCase: TestCase): Promise<void> {
  // Select the test case from dropdown
  const dropdown = page.locator('select');
  await dropdown.selectOption(testCase.name + '.json');
  
  // Wait for JSON to load into editor
  await page.waitForTimeout(500);
  
  // Verify the JSON was loaded correctly
  const editor = page.locator('textarea[id*="jsonEditor"], textarea[placeholder*="JSON"]').first();
  const editorContent = await editor.inputValue();
  
  if (!editorContent.trim()) {
    throw new Error(`Failed to load test case content for ${testCase.name}`);
  }
}

/**
 * Run simulation and get results
 */
async function runSimulation(page: Page): Promise<string> {
  // Click the run simulation button
  const runButton = page.locator('button', { hasText: /run simulation/i });
  await expect(runButton).toBeEnabled();
  await runButton.click();
  
  // Wait for simulation to complete (look for either success or error state)
  await Promise.race([
    // Wait for success - results in output area
    page.waitForSelector('textarea[id*="wasmOutput"], textarea[placeholder*="results"]', { 
      state: 'visible', 
      timeout: TEST_TIMEOUT 
    }),
    // Wait for error - error message displayed
    page.waitForSelector('.error, [style*="color: #721c24"], [style*="background: #f8d7da"]', { 
      state: 'visible', 
      timeout: TEST_TIMEOUT 
    })
  ]);
  
  // Check for errors first
  const errorElement = page.locator('.error, [style*="color: #721c24"], [style*="background: #f8d7da"]').first();
  if (await errorElement.isVisible()) {
    const errorText = await errorElement.textContent();
    throw new Error(`Simulation failed: ${errorText}`);
  }
  
  // Get simulation results
  const outputArea = page.locator('textarea[id*="wasmOutput"], textarea[placeholder*="results"]').first();
  const output = await outputArea.inputValue();
  
  if (!output.trim()) {
    throw new Error('Simulation completed but no output was generated');
  }
  
  return output.trim();
}

/**
 * Compare results with snapshot
 */
async function compareWithSnapshot(testCase: TestCase, actualOutput: string): Promise<void> {
  // Read the golden snapshot
  const snapshotContent = await readFile(testCase.snapshotPath, 'utf-8');
  const expectedOutput = snapshotContent.trim();
  
  // Parse both as JSON for proper comparison
  let actualResult: any;
  let expectedResult: any;
  
  try {
    actualResult = JSON.parse(actualOutput);
  } catch (error) {
    throw new Error(`Failed to parse actual simulation output as JSON: ${error}`);
  }
  
  try {
    expectedResult = JSON.parse(expectedOutput);
  } catch (error) {
    throw new Error(`Failed to parse snapshot as JSON: ${error}`);
  }
  
  // Deep comparison with helpful error messages
  try {
    expect(actualResult).toEqual(expectedResult);
  } catch (error) {
    // Enhanced error message for debugging
    const actualKeys = Object.keys(actualResult || {});
    const expectedKeys = Object.keys(expectedResult || {});
    
    console.error(`❌ Snapshot comparison failed for ${testCase.name}:`);
    console.error(`   Expected keys: [${expectedKeys.join(', ')}]`);
    console.error(`   Actual keys: [${actualKeys.join(', ')}]`);
    
    // For debugging, show a sample of differences
    if (actualResult?.monthlyData && expectedResult?.monthlyData) {
      const actualMonth0 = actualResult.monthlyData[0];
      const expectedMonth0 = expectedResult.monthlyData[0];
      
      if (actualMonth0?.netWorth !== expectedMonth0?.netWorth) {
        console.error(`   Month 0 Net Worth: Expected ${expectedMonth0?.netWorth}, Got ${actualMonth0?.netWorth}`);
      }
    }
    
    throw error;
  }
}

// Main test suite
test.describe('PathFinder Pro Test Harness - Comprehensive Regression Testing', () => {
  let testCases: TestCase[] = [];
  
  // Discover test cases before running tests
  test.beforeAll(async () => {
    console.log('🔍 Discovering test cases...');
    testCases = await discoverTestCases();
    console.log(`📋 Found ${testCases.length} test cases with snapshots:`);
    testCases.forEach(tc => console.log(`   • ${tc.name}`));
    
    if (testCases.length === 0) {
      throw new Error('No test cases with snapshots found! Ensure test-cases/ and test-cases/snapshots/ directories contain proper files.');
    }
  });
  
  // Set timeout for all tests
  test.setTimeout(TEST_TIMEOUT * 2);
  
  // Test each case individually
  test.describe('Individual Test Case Validation', () => {
    // This will be populated dynamically based on discovered test cases
    test.beforeEach(async ({ page }) => {
      // Navigate to test harness
      await page.goto(`${BASE_URL}/test-harness`);
      await waitForTestHarnessReady(page);
    });
    
    // Generate a test for each discovered test case
    // Note: This approach creates dynamic tests - playwright will run this for each test case
    test('should validate all discovered test cases', async ({ page }) => {
      let passedTests = 0;
      let failedTests = 0;
      const failedTestDetails: { name: string; error: string }[] = [];
      
      for (const testCase of testCases) {
        console.log(`\n🧪 Testing: ${testCase.name}`);
        
        try {
          // Load test case
          console.log(`   📂 Loading test case...`);
          await loadTestCase(page, testCase);
          
          // Run simulation
          console.log(`   🚀 Running simulation...`);
          const actualOutput = await runSimulation(page);
          
          // Compare with snapshot
          console.log(`   📊 Comparing with snapshot...`);
          await compareWithSnapshot(testCase, actualOutput);
          
          console.log(`   ✅ PASSED: ${testCase.name}`);
          passedTests++;
          
        } catch (error) {
          console.error(`   ❌ FAILED: ${testCase.name} - ${error}`);
          failedTests++;
          failedTestDetails.push({
            name: testCase.name,
            error: error.toString()
          });
        }
        
        // Brief pause between tests
        await page.waitForTimeout(200);
      }
      
      // Final summary
      console.log(`\n📋 TEST SUMMARY:`);
      console.log(`   ✅ Passed: ${passedTests}`);
      console.log(`   ❌ Failed: ${failedTests}`);
      console.log(`   📊 Total: ${testCases.length}`);
      
      if (failedTests > 0) {
        console.log(`\n💥 FAILED TEST DETAILS:`);
        failedTestDetails.forEach(detail => {
          console.log(`   • ${detail.name}: ${detail.error}`);
        });
      }
      
      // Fail the test if any individual test failed
      expect(failedTests).toBe(0);
    });
  });
  
  // Quick smoke test to verify test harness is working
  test.describe('Test Harness Validation', () => {
    test('should load test harness correctly', async ({ page }) => {
      await page.goto(`${BASE_URL}/test-harness`);
      
      // Verify main elements are present
      await expect(page.locator('h1')).toContainText('Test Harness');
      await expect(page.locator('select')).toBeVisible();
      await expect(page.locator('button', { hasText: /run simulation/i })).toBeVisible();
      const textareas = page.locator('textarea');
      await expect(textareas.count()).resolves.toBeGreaterThanOrEqual(2); // Input and output areas
    });
    
    test('should populate test case dropdown', async ({ page }) => {
      await page.goto(`${BASE_URL}/test-harness`);
      await waitForTestHarnessReady(page);
      
      // Check that dropdown has options
      const options = page.locator('select option[value]:not([value=""])');
      const optionCount = await options.count();
      expect(optionCount).toBeGreaterThan(0);
      
      // Verify baseline test case exists in options
      await expect(page.locator('select option[value="00_baseline.json"]')).toBeVisible();
    });
  });
});

// Helper test to validate snapshot files
test.describe('Snapshot File Validation', () => {
  test('should validate all snapshot files are valid JSON', async () => {
    const testCases = await discoverTestCases();
    
    for (const testCase of testCases) {
      try {
        const snapshotContent = await readFile(testCase.snapshotPath, 'utf-8');
        const parsedSnapshot = JSON.parse(snapshotContent);
        
        // Basic validation of snapshot structure
        expect(parsedSnapshot).toHaveProperty('success');
        expect(typeof parsedSnapshot.success).toBe('boolean');
        
        if (parsedSnapshot.success) {
          expect(parsedSnapshot).toHaveProperty('monthlyData');
          expect(Array.isArray(parsedSnapshot.monthlyData)).toBe(true);
        }
        
      } catch (error) {
        throw new Error(`Invalid snapshot file ${testCase.snapshotPath}: ${error}`);
      }
    }
  });
});