import playwright, { Page, Locator } from '@playwright/test';
const { expect } = playwright;

export class QuickstartWizardPage {
  readonly page: Page;
  readonly wizardModal: Locator;
  readonly stepIndicator: Locator;
  readonly stepTitle: Locator;
  readonly stepProgress: Locator;
  readonly backButton: Locator;
  readonly nextButton: Locator;
  readonly cancelButton: Locator;
  readonly skipToAdvancedButton: Locator;
  readonly loadingOverlay: Locator;

  // Step-specific locators
  readonly welcomeStep: {
    title: Locator;
    description: Locator;
    skipToAdvanced: Locator;
  };

  readonly incomeStep: {
    salaryInput: Locator;
    salarySlider: Locator;
    helpText: Locator;
  };

  readonly expensesStep: {
    expensesInput: Locator;
    expensesSlider: Locator;
    helpText: Locator;
  };

  readonly goalStep: {
    retirementAgeInput: Locator;
    retirementAgeSlider: Locator;
    safetyMultiplierSelect: Locator;
    inflationRateInput: Locator;
    accountTypesSection: Locator;
    helpText: Locator;
  };

  readonly reviewStep: {
    summarySection: Locator;
    calculationsSection: Locator;
    eventsPreview: Locator;
    completeButton: Locator;
    loadingSpinner: Locator;
  };

  constructor(page: Page) {
    this.page = page;
    this.wizardModal = page.locator('.quickstart-wizard');
    this.stepIndicator = page.locator('.quickstart-wizard .step-indicator, [class*="step"]');
    this.stepTitle = page.locator('.quickstart-wizard h3');
    this.stepProgress = page.locator('.quickstart-wizard p:has-text("Step")');
    this.backButton = page.getByRole('button', { name: 'Back' });
    this.nextButton = page.getByRole('button', { name: /Next|Review Plan/ });
    this.cancelButton = page.getByRole('button', { name: 'Cancel' });
    this.skipToAdvancedButton = page.getByRole('button', { name: /Skip.*Advanced|Advanced/ });
    this.loadingOverlay = page.locator('.loading-overlay');

    // Step-specific locators
    this.welcomeStep = {
      title: page.locator('h1, h2, h3').filter({ hasText: /Welcome|Quick.*Setup|FIRE.*Plan/ }),
      description: page.locator('p').filter({ hasText: /Financial Independence|FIRE|minutes/ }),
      skipToAdvanced: page.getByRole('button', { name: /Skip.*Advanced|Advanced/ })
    };

    this.incomeStep = {
      salaryInput: page.locator('input[type="number"]').filter({ hasText: /salary|income/i }).or(
        page.locator('label:has-text("Annual Salary")').locator('..').locator('input')
      ),
      salarySlider: page.locator('input[type="range"]').first(),
      helpText: page.locator('p').filter({ hasText: /salary|income|before.*tax/i })
    };

    this.expensesStep = {
      expensesInput: page.locator('input[type="number"]').filter({ hasText: /expense|spending/i }).or(
        page.locator('label:has-text("Annual Expenses")').locator('..').locator('input')
      ),
      expensesSlider: page.locator('input[type="range"]').first(),
      helpText: page.locator('p').filter({ hasText: /expense|spending|annual/i })
    };

    this.goalStep = {
      retirementAgeInput: page.locator('input[type="number"]').filter({ hasText: /age|retirement/i }).or(
        page.locator('label:has-text("Retirement Age")').locator('..').locator('input')
      ),
      retirementAgeSlider: page.locator('input[type="range"]').first(),
      safetyMultiplierSelect: page.locator('select').filter({ hasText: /safety|multiplier|25x/i }).or(
        page.locator('label:has-text("Safety Multiplier")').locator('..').locator('select')
      ),
      inflationRateInput: page.locator('input[type="number"]').filter({ hasText: /inflation/i }).or(
        page.locator('label:has-text("Inflation Rate")').locator('..').locator('input')
      ),
      accountTypesSection: page.locator('div').filter({ hasText: /account.*type|investment.*account/i }),
      helpText: page.locator('p').filter({ hasText: /retirement|FIRE|25x.*rule/i })
    };

    this.reviewStep = {
      summarySection: page.locator('div').filter({ hasText: /summary|overview|plan/i }),
      calculationsSection: page.locator('div').filter({ hasText: /calculation|result|target/i }),
      eventsPreview: page.locator('div').filter({ hasText: /event|income|expense|goal/i }),
      completeButton: page.getByRole('button', { name: /Complete|Create.*Plan|Finish/ }),
      loadingSpinner: page.locator('.loading, .spinner').or(this.loadingOverlay)
    };
  }

  async waitForWizardToOpen(): Promise<void> {
    await expect(this.wizardModal).toBeVisible({ timeout: 10000 });
    await expect(this.stepTitle).toBeVisible();
  }

  async waitForWizardToClose(): Promise<void> {
    await expect(this.wizardModal).not.toBeVisible({ timeout: 15000 });
  }

  async isWizardOpen(): Promise<boolean> {
    return await this.wizardModal.isVisible();
  }

  async getCurrentStep(): Promise<string> {
    const stepText = await this.stepProgress.textContent();
    if (!stepText) return 'unknown';
    
    const match = stepText.match(/Step (\d+) of (\d+)/);
    return match ? `${match[1]}/${match[2]}` : stepText;
  }

  async getCurrentStepTitle(): Promise<string> {
    return (await this.stepTitle.textContent()) || '';
  }

  async isNextButtonEnabled(): Promise<boolean> {
    return !(await this.nextButton.isDisabled());
  }

  async isBackButtonVisible(): Promise<boolean> {
    return await this.backButton.isVisible();
  }

  async clickNext(): Promise<void> {
    await expect(this.nextButton).toBeEnabled();
    await this.nextButton.click();
    // Wait for any transitions
    await this.page.waitForTimeout(500);
  }

  async clickBack(): Promise<void> {
    await expect(this.backButton).toBeVisible();
    await this.backButton.click();
    await this.page.waitForTimeout(500);
  }

  async clickCancel(): Promise<void> {
    await this.cancelButton.click();
  }

  async clickSkipToAdvanced(): Promise<void> {
    await this.skipToAdvancedButton.click();
  }

  // Welcome Step Methods
  async verifyWelcomeStep(): Promise<void> {
    await expect(this.welcomeStep.title).toBeVisible();
    await expect(this.welcomeStep.description).toBeVisible();
  }

  // Income Step Methods
  async fillIncomeStep(salary: number): Promise<void> {
    const input = this.incomeStep.salaryInput;
    await expect(input).toBeVisible();
    await input.clear();
    await input.fill(salary.toString());
    await input.blur();
    // Verify the value was set
    await expect(input).toHaveValue(salary.toString());
  }

  async getIncomeValue(): Promise<number> {
    const value = await this.incomeStep.salaryInput.inputValue();
    return parseInt(value) || 0;
  }

  // Expenses Step Methods
  async fillExpensesStep(expenses: number): Promise<void> {
    const input = this.expensesStep.expensesInput;
    await expect(input).toBeVisible();
    await input.clear();
    await input.fill(expenses.toString());
    await input.blur();
    await expect(input).toHaveValue(expenses.toString());
  }

  async getExpensesValue(): Promise<number> {
    const value = await this.expensesStep.expensesInput.inputValue();
    return parseInt(value) || 0;
  }

  // Goal Step Methods
  async fillGoalStep(retirementAge: number, safetyMultiplier?: number): Promise<void> {
    // Set retirement age
    const ageInput = this.goalStep.retirementAgeInput;
    await expect(ageInput).toBeVisible();
    await ageInput.clear();
    await ageInput.fill(retirementAge.toString());
    await ageInput.blur();

    // Set safety multiplier if provided
    if (safetyMultiplier !== undefined) {
      const multiplierSelect = this.goalStep.safetyMultiplierSelect;
      if (await multiplierSelect.isVisible()) {
        await multiplierSelect.selectOption(safetyMultiplier.toString());
      }
    }
  }

  async getRetirementAge(): Promise<number> {
    const value = await this.goalStep.retirementAgeInput.inputValue();
    return parseInt(value) || 0;
  }

  // Review Step Methods
  async verifyReviewStep(): Promise<void> {
    await expect(this.reviewStep.summarySection).toBeVisible();
    await expect(this.reviewStep.completeButton).toBeVisible();
  }

  async completeWizard(): Promise<void> {
    await expect(this.reviewStep.completeButton).toBeEnabled();
    await this.reviewStep.completeButton.click();
    
    // Wait for processing
    if (await this.reviewStep.loadingSpinner.isVisible({ timeout: 1000 })) {
      await expect(this.reviewStep.loadingSpinner).not.toBeVisible({ timeout: 30000 });
    }
  }

  async waitForProcessingToComplete(): Promise<void> {
    if (await this.loadingOverlay.isVisible({ timeout: 1000 })) {
      await expect(this.loadingOverlay).not.toBeVisible({ timeout: 30000 });
    }
  }

  // Complete wizard flow helper
  async completeFullWizardFlow(data: {
    salary: number;
    expenses: number;
    retirementAge: number;
    safetyMultiplier?: number;
  }): Promise<void> {
    // Welcome step - just proceed
    await this.verifyWelcomeStep();
    await this.clickNext();

    // Income step
    await this.fillIncomeStep(data.salary);
    await this.clickNext();

    // Expenses step
    await this.fillExpensesStep(data.expenses);
    await this.clickNext();

    // Goal step
    await this.fillGoalStep(data.retirementAge, data.safetyMultiplier);
    await this.clickNext();

    // Review step
    await this.verifyReviewStep();
    await this.completeWizard();
  }

  // Validation helpers
  async validateStepProgression(): Promise<void> {
    const steps = ['Welcome', 'Income', 'Expenses', 'Goal', 'Review'];
    
    for (let i = 0; i < steps.length; i++) {
      const currentStep = await this.getCurrentStepTitle();
      expect(currentStep).toContain(steps[i]);
      
      if (i < steps.length - 1) {
        // Not the last step, should have next button
        await expect(this.nextButton).toBeVisible();
      }
      
      if (i > 0) {
        // Not the first step, should have back button
        await expect(this.backButton).toBeVisible();
      }
    }
  }

  async validateNavigationState(stepIndex: number): Promise<void> {
    const currentStep = await this.getCurrentStep();
    expect(currentStep).toContain(`${stepIndex + 1}/5`);
    
    // Validate back button visibility
    if (stepIndex > 0) {
      await expect(this.backButton).toBeVisible();
    } else {
      await expect(this.backButton).not.toBeVisible();
    }
  }
}