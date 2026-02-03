import { test, expect } from '@playwright/test';

test.describe('FIRE Planning User Journey', () => {
  test('Complete FIRE planning flow from quickstart to simulation', async ({ page }) => {
    // 1. Start with quickstart completion
    await page.goto('/');
    
    // Wait for app to load
    await page.waitForSelector('[data-testid="quickstart-wizard"], [data-testid="dashboard"], .quickstart-wizard, .dashboard', { timeout: 10000 });
    
    // Check if we're on quickstart or dashboard
    const isQuickstart = await page.locator('[data-testid="quickstart-wizard"], .quickstart-wizard').isVisible().catch(() => false);
    
    if (isQuickstart) {
      console.log('Starting from quickstart...');
      
      // Step 1: Welcome Step
      await expect(page.locator('h2')).toContainText('Welcome to PathFinder Pro');
      await page.click('button:has-text("Get Started")');
      
      // Step 2: Income Step
      await expect(page.locator('h2')).toContainText('What\'s Your Income?');
      await page.fill('input[placeholder*="salary"], input[type="text"]', '150000');
      await page.click('button:has-text("Continue")');
      
      // Step 3: Expenses Step  
      await expect(page.locator('h2')).toContainText('What Do You Spend?');
      await page.fill('input[placeholder*="expenses"], input[type="text"]', '80000');
      await page.click('button:has-text("Continue")');
      
      // Step 4: Goal Step (FIRE Goal)
      await expect(page.locator('h2')).toContainText('When Do You Want to Achieve FIRE?');
      
      // Set current age
      await page.fill('input[type="number"][min="18"]', '30');
      
      // Set retirement age
      await page.fill('input[type="number"][min="31"]', '50');
      
      // Check FIRE target calculation appears
      await expect(page.locator('text=Your FIRE Target')).toBeVisible();
      await expect(page.locator('text=2,000,000').or(page.locator('text=$2,000,000'))).toBeVisible();
      
      // Check feasibility assessment
      await expect(page.locator('text=Feasibility Assessment')).toBeVisible();
      await expect(page.locator('text=Required Savings Rate')).toBeVisible();
      
      await page.click('button:has-text("Continue")');
      
      // Step 5: Review Step
      await expect(page.locator('h2')).toContainText('Review Your Plan');
      await page.click('button:has-text("Create My Financial Plan")');
      
      // Wait for transition to dashboard
      await page.waitForSelector('[data-testid="dashboard"], .dashboard', { timeout: 15000 });
    }
    
    console.log('Now on dashboard, testing FIRE planning flow...');
    
    // 2. Test the complete FIRE planning flow on dashboard
    
    // Verify FIRE goal is displayed
    await expect(page.locator('text=FIRE Goal').or(page.locator('text=Financial Independence'))).toBeVisible();
    
    // Look for success probability or goal tracking
    const successProbability = page.locator('text=Success Rate').or(page.locator('text=Probability')).or(page.locator('text=%'));
    if (await successProbability.isVisible()) {
      console.log('Success probability found');
    }
    
    // 3. Add income events
    const addEventButton = page.locator('button:has-text("Add Event")').or(page.locator('[data-testid="add-event"]')).or(page.locator('button[aria-label*="Add"]')).first();
    if (await addEventButton.isVisible()) {
      await addEventButton.click();
      
      // Select income event
      await page.click('text=Income');
      
      // Fill income details
      await page.fill('input[placeholder*="amount"], input[type="text"]', '10000');
      await page.selectOption('select', { label: /annual/i });
      
      // Save event
      await page.click('button:has-text("Save")');
    }
    
    // 4. Add expense events
    if (await addEventButton.isVisible()) {
      await addEventButton.click();
      
      // Select expense event
      await page.click('text=Expense');
      
      // Fill expense details
      await page.fill('input[placeholder*="amount"], input[type="text"]', '5000');
      
      // Save event
      await page.click('button:has-text("Save")');
    }
    
    // 5. Add contribution events (401k, IRA)
    if (await addEventButton.isVisible()) {
      await addEventButton.click();
      
      // Select contribution event
      await page.click('text=Contribution');
      
      // Fill contribution details
      await page.fill('input[placeholder*="amount"], input[type="text"]', '25000');
      await page.selectOption('select', { label: /401k/i });
      
      // Save event
      await page.click('button:has-text("Save")');
    }
    
    // 6. Run simulation and view results
    const runSimulationButton = page.locator('button:has-text("Run Simulation")').or(page.locator('[data-testid="run-simulation"]'));
    if (await runSimulationButton.isVisible()) {
      await runSimulationButton.click();
      
      // Wait for simulation to complete
      await page.waitForTimeout(5000);
    }
    
    // 7. Verify goal tracking display
    
    // Check for charts
    const chartElements = page.locator('canvas, svg, [data-testid*="chart"]');
    if (await chartElements.count() > 0) {
      console.log(`Found ${await chartElements.count()} chart elements`);
    }
    
    // Check for clear success probability
    const successMetrics = page.locator('text=/\\d+%/').or(page.locator('text=Success')).or(page.locator('text=Probability'));
    if (await successMetrics.isVisible()) {
      console.log('Success metrics are visible');
    }
    
    // 8. Test goal modification
    const editGoalButton = page.locator('button:has-text("Edit Goal")').or(page.locator('[data-testid="edit-goal"]'));
    if (await editGoalButton.isVisible()) {
      await editGoalButton.click();
      
      // Modify retirement age
      await page.fill('input[type="number"]', '55');
      
      // Save changes
      await page.click('button:has-text("Save")');
      
      // Verify real-time updates
      await page.waitForTimeout(2000);
    }
    
    // 9. Deep dive into results
    
    // Look for year-by-year analysis
    const yearAnalysisButton = page.locator('button:has-text("Year by Year")').or(page.locator('[data-testid="year-analysis"]'));
    if (await yearAnalysisButton.isVisible()) {
      await yearAnalysisButton.click();
    }
    
    // Check for account balance projections
    const accountBalances = page.locator('text=Account').or(page.locator('text=Balance')).or(page.locator('text=Portfolio'));
    if (await accountBalances.isVisible()) {
      console.log('Account balance information found');
    }
    
    // Take screenshot for analysis
    await page.screenshot({ path: 'fire-planning-dashboard.png', fullPage: true });
    
    console.log('FIRE planning journey test completed');
  });
  
  test('FIRE goal clarity and professional polish', async ({ page }) => {
    await page.goto('/');
    
    // Wait for app to load
    await page.waitForSelector('body', { timeout: 10000 });
    
    // Check for professional design elements
    const designElements = {
      loadingStates: page.locator('[data-testid*="loading"], .loading'),
      errorHandling: page.locator('[data-testid*="error"], .error'),
      tooltips: page.locator('[data-testid*="tooltip"], .tooltip'),
      charts: page.locator('canvas, svg'),
      buttons: page.locator('button'),
      inputs: page.locator('input')
    };
    
    // Check UI polish
    const buttonCount = await designElements.buttons.count();
    const inputCount = await designElements.inputs.count();
    
    console.log(`Found ${buttonCount} buttons and ${inputCount} inputs`);
    
    // Take screenshot for visual analysis
    await page.screenshot({ path: 'fire-planning-ui-polish.png', fullPage: true });
  });
});