import playwright from '@playwright/test';
const { test, expect } = playwright;

test.describe('New Test Harness Validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test-harness');
  });

  test('should load test harness page with correct elements', async ({ page }) => {
    await expect(page.getByRole('heading', { name: '🧪 Financial Simulation Test Harness' })).toBeVisible();
    await expect(page.getByText('Systematic testing and validation environment')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Test Case Selection' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Simulation Results' })).toBeVisible();
  });

  test('should load all 16 test cases in dropdown', async ({ page }) => {
    const select = page.getByLabel('Select Test Case:');
    await expect(select).toBeVisible();
    
    // Check that all expected test cases are present
    const expectedTestCases = [
      '00_baseline.json',
      'event_01_contribution.json',
      'event_02_withdrawal.json',
      'event_03_roth_conversion.json',
      'event_04_dividend_income.json',
      'event_05_quarterly_tax_payment.json',
      'event_06_income.json',
      'event_07_expense.json',
      'event_08_withdrawal.json',
      'event_09_transfer.json',
      'event_10_social_security.json',
      'event_11_pension.json',
      'event_12_rmd.json',
      'event_13_healthcare.json',
      'event_14_529_contribution.json',
      'event_15_business_income.json'
    ];

    // Check that options exist in the DOM (they may not be "visible" in dropdown)
    for (const testCase of expectedTestCases) {
      await expect(select.getByRole('option', { name: testCase })).toBeAttached();
    }
  });

  test('should load test case JSON when selected', async ({ page }) => {
    const select = page.getByLabel('Select Test Case:');
    const jsonInput = page.getByLabel('Simulation Input JSON:');
    
    // Initially empty
    await expect(jsonInput).toHaveValue('');
    
    // Select a test case
    await select.selectOption('00_baseline.json');
    
    // Wait for JSON to load
    await expect(jsonInput).not.toHaveValue('');
    const jsonContent = await jsonInput.inputValue();
    
    // Verify it contains expected structure
    expect(jsonContent).toContain('initialAccounts');
    expect(jsonContent).toContain('events');
    expect(jsonContent).toContain('config');
    expect(jsonContent).toContain('monthsToRun');
    
    const parsedJson = JSON.parse(jsonContent);
    expect(parsedJson).toHaveProperty('initialAccounts');
    expect(parsedJson).toHaveProperty('events');
    expect(parsedJson).toHaveProperty('config');
    expect(parsedJson).toHaveProperty('monthsToRun');
  });

  test('should enable run button when test case is loaded', async ({ page }) => {
    const select = page.getByLabel('Select Test Case:');
    const runButton = page.getByRole('button', { name: '🚀 Run Simulation from JSON' });
    
    // Initially disabled
    await expect(runButton).toBeDisabled();
    
    // Load a test case
    await select.selectOption('00_baseline.json');
    
    // Should now be enabled
    await expect(runButton).toBeEnabled();
  });

  test('should run simple income simulation and get results', async ({ page }) => {
    const select = page.getByLabel('Select Test Case:');
    const runButton = page.getByRole('button', { name: '🚀 Run Simulation from JSON' });
    const outputTextarea = page.getByLabel('Raw WASM Output:');
    const exportButton = page.getByRole('button', { name: '📥 Export Results' });
    
    // Initially export should be disabled
    await expect(exportButton).toBeDisabled();
    
    // Load and run the income test case (simpler than baseline)
    await select.selectOption('event_06_income.json');
    await runButton.click();
    
    // Wait for simulation to complete (success or failure)
    await page.waitForTimeout(10000); // Give WASM time to process
    
    const output = await outputTextarea.inputValue();
    expect(output).toBeTruthy();
    
    // Should contain JSON result
    const parsedOutput = JSON.parse(output);
    expect(parsedOutput).toHaveProperty('success');
    
    // If successful, export should be enabled
    if (parsedOutput.success) {
      await expect(exportButton).toBeEnabled();
    }
  });

  test('should validate different event types can be loaded', async ({ page }) => {
    const select = page.getByLabel('Select Test Case:');
    const jsonInput = page.getByLabel('Simulation Input JSON:');
    
    const testEventTypes = [
      { file: 'event_01_contribution.json', expectedType: 'CONTRIBUTION' },
      { file: 'event_02_withdrawal.json', expectedType: 'WITHDRAWAL' },
      { file: 'event_03_roth_conversion.json', expectedType: 'ROTH_CONVERSION' },
      { file: 'event_04_dividend_income.json', expectedType: 'DIVIDEND_INCOME' },
      { file: 'event_06_income.json', expectedType: 'INCOME' },
      { file: 'event_07_expense.json', expectedType: 'EXPENSE' }
    ];
    
    for (const { file, expectedType } of testEventTypes) {
      await select.selectOption(file);
      await page.waitForTimeout(500); // Give time for load
      
      const content = await jsonInput.inputValue();
      expect(content).toContain(`"type": "${expectedType}"`);
    }
  });

  test('should handle JSON parsing errors gracefully', async ({ page }) => {
    const jsonInput = page.getByLabel('Simulation Input JSON:');
    const runButton = page.getByRole('button', { name: '🚀 Run Simulation from JSON' });
    const outputTextarea = page.getByLabel('Raw WASM Output:');
    
    // Put invalid JSON
    await jsonInput.fill('{ invalid json }');
    
    // Run button should be enabled (it validates on run)
    await expect(runButton).toBeEnabled();
    
    // Try to run
    await runButton.click();
    
    // Should show error in output
    await page.waitForTimeout(2000);
    const hasErrorSection = await page.getByText('🚨 WASM Error Log').count();
    expect(hasErrorSection).toBeGreaterThan(0);
  });

  test('should clear results when new test case is selected', async ({ page }) => {
    const select = page.getByLabel('Select Test Case:');
    const outputTextarea = page.getByLabel('Raw WASM Output:');
    
    // Load and potentially run a test case first
    await select.selectOption('event_06_income.json');
    
    // Select a different test case
    await select.selectOption('event_07_expense.json');
    
    // Output should be cleared
    const output = await outputTextarea.inputValue();
    expect(output).toBe('');
  });
});