import playwright, { Page, Locator } from '@playwright/test';
const { expect } = playwright;

/**
 * Page Object Model for Strategy Center
 *
 * Handles interactions with the Strategy Center modal including:
 * - Opening/closing the modal
 * - Navigating to categories
 * - Selecting strategies
 * - Configuring strategy parameters
 * - Applying strategies
 */
export class StrategyCenterPage {
  readonly page: Page;
  readonly openStrategyButton: Locator;
  readonly strategyModal: Locator;
  readonly modalTitle: Locator;
  readonly categoryCards: Locator;
  readonly strategyList: Locator;
  readonly backButton: Locator;
  readonly closeButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.openStrategyButton = page.locator('button:has-text("Strategy Center")').or(
      page.locator('[data-testid="open-strategy-center"]')
    );
    this.strategyModal = page.locator('[role="dialog"]').filter({ hasText: 'Strategy Center' });
    this.modalTitle = page.locator('h2:has-text("Strategy Center")');
    this.categoryCards = page.locator('.grid > div').filter({ has: page.locator('text=strategies') });
    this.strategyList = page.locator('[data-testid="strategy-list"]').or(
      page.locator('.space-y-3')
    );
    this.backButton = page.locator('button').filter({ hasText: '←' });
    this.closeButton = page.locator('button[aria-label="Close"]').or(
      page.locator('button').filter({ hasText: '×' })
    );
  }

  async openStrategyCenter(): Promise<void> {
    await this.openStrategyButton.click();
    await expect(this.strategyModal).toBeVisible({ timeout: 5000 });
    await expect(this.modalTitle).toBeVisible();
  }

  async closeStrategyCenter(): Promise<void> {
    await this.closeButton.first().click();
    await expect(this.strategyModal).not.toBeVisible({ timeout: 5000 });
  }

  async selectCategory(categoryName: string): Promise<void> {
    const categoryCard = this.page.locator('div').filter({ hasText: categoryName }).filter({
      has: this.page.locator('text=strategies')
    }).first();

    await expect(categoryCard).toBeVisible();
    await categoryCard.click();
    await this.page.waitForTimeout(500);
  }

  async navigateBack(): Promise<void> {
    await this.backButton.click();
    await this.page.waitForTimeout(500);
  }

  async selectStrategy(strategyName: string): Promise<void> {
    // Look for the strategy card
    const strategyCard = this.page.locator('div').filter({ hasText: strategyName }).first();
    await expect(strategyCard).toBeVisible();

    // Click the Configure or Learn & Configure button
    const configureButton = strategyCard.locator('button').filter({
      hasText: /Configure|Learn & Configure/
    });
    await expect(configureButton).toBeVisible();
    await configureButton.click();
    await this.page.waitForTimeout(1000);
  }

  async verifyCategoryVisible(categoryName: string): Promise<boolean> {
    const category = this.page.locator('h3').filter({ hasText: categoryName });
    return await category.isVisible();
  }

  async verifyStrategyVisible(strategyName: string): Promise<boolean> {
    const strategy = this.page.locator('h3').filter({ hasText: strategyName });
    return await strategy.isVisible();
  }

  async waitForCategoryView(): Promise<void> {
    await expect(this.backButton).toBeVisible({ timeout: 5000 });
    await expect(this.strategyList).toBeVisible();
  }
}

/**
 * Page Object Model for Strategy Configuration Modal
 *
 * Handles configuration of specific strategies
 */
export class StrategyConfigurationPage {
  readonly page: Page;
  readonly configModal: Locator;
  readonly modalTitle: Locator;
  readonly saveButton: Locator;
  readonly cancelButton: Locator;
  readonly parameterInputs: Locator;

  constructor(page: Page) {
    this.page = page;
    this.configModal = page.locator('[role="dialog"]').filter({
      has: page.locator('text=/Configure|Strategy/')
    }).last();
    this.modalTitle = page.locator('h2').filter({ hasText: /Configure|Strategy/ }).last();
    this.saveButton = page.locator('button').filter({ hasText: /Apply|Save|Confirm/ }).last();
    this.cancelButton = page.locator('button').filter({ hasText: /Cancel|Close/ }).last();
    this.parameterInputs = page.locator('input, select').filter({ visible: true });
  }

  async waitForConfigModal(): Promise<void> {
    await expect(this.configModal).toBeVisible({ timeout: 5000 });
    await expect(this.modalTitle).toBeVisible();
  }

  async fillSelect(label: string, value: string): Promise<void> {
    const select = this.page.locator('label').filter({ hasText: label }).locator('~ select').or(
      this.page.locator(`select[aria-label*="${label}"]`)
    );
    await expect(select).toBeVisible();
    await select.selectOption(value);
  }

  async fillInput(label: string, value: string): Promise<void> {
    const input = this.page.locator('label').filter({ hasText: label }).locator('~ input').or(
      this.page.locator(`input[aria-label*="${label}"]`)
    );
    await expect(input).toBeVisible();
    await input.fill(value);
  }

  async toggleCheckbox(label: string, checked: boolean = true): Promise<void> {
    const checkbox = this.page.locator('label').filter({ hasText: label }).locator('input[type="checkbox"]').or(
      this.page.locator(`input[type="checkbox"][aria-label*="${label}"]`)
    );
    await expect(checkbox).toBeVisible();

    const isChecked = await checkbox.isChecked();
    if (isChecked !== checked) {
      await checkbox.click();
    }
  }

  async configureTaxWithholding(params: {
    withholdingMethod?: string;
    settlementReserveStrategy?: string;
    autoReserve?: boolean;
    alertBeforeSettlement?: boolean;
  }): Promise<void> {
    await this.waitForConfigModal();

    if (params.withholdingMethod) {
      await this.fillSelect('Withholding Method', params.withholdingMethod);
    }

    if (params.settlementReserveStrategy) {
      await this.fillSelect('Tax Settlement Reserve Strategy', params.settlementReserveStrategy);
    }

    if (params.autoReserve !== undefined) {
      await this.toggleCheckbox('Auto-reserve', params.autoReserve);
    }

    if (params.alertBeforeSettlement !== undefined) {
      await this.toggleCheckbox('Settlement Alert', params.alertBeforeSettlement);
    }
  }

  async applyStrategy(): Promise<void> {
    await expect(this.saveButton).toBeEnabled();
    await this.saveButton.click();
    await this.page.waitForTimeout(2000);
  }

  async cancelConfiguration(): Promise<void> {
    await this.cancelButton.click();
    await expect(this.configModal).not.toBeVisible({ timeout: 5000 });
  }

  async verifyModalClosed(): Promise<void> {
    await expect(this.configModal).not.toBeVisible({ timeout: 5000 });
  }
}

/**
 * Page Object Model for Strategy Deep Dive Modal
 *
 * Handles the educational deep dive content for strategies
 */
export class StrategyDeepDivePage {
  readonly page: Page;
  readonly deepDiveModal: Locator;
  readonly modalTitle: Locator;
  readonly tabs: Locator;
  readonly content: Locator;
  readonly configureButton: Locator;
  readonly closeButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.deepDiveModal = page.locator('[role="dialog"]').last();
    this.modalTitle = page.locator('h2').last();
    this.tabs = page.locator('[role="tab"]');
    this.content = page.locator('.overflow-y-auto').last();
    this.configureButton = page.locator('button').filter({
      hasText: /Configure|Apply Strategy/
    }).last();
    this.closeButton = page.locator('button').filter({ hasText: /Return to Dashboard|Close/ }).last();
  }

  async waitForDeepDive(): Promise<void> {
    await expect(this.deepDiveModal).toBeVisible({ timeout: 5000 });
    await expect(this.modalTitle).toBeVisible();
  }

  async selectTab(tabName: string): Promise<void> {
    const tab = this.tabs.filter({ hasText: tabName });
    await expect(tab).toBeVisible();
    await tab.click();
    await this.page.waitForTimeout(500);
  }

  async clickConfigure(): Promise<void> {
    await expect(this.configureButton).toBeVisible();
    await this.configureButton.click();
    await this.page.waitForTimeout(1000);
  }

  async close(): Promise<void> {
    await this.closeButton.click();
    await expect(this.deepDiveModal).not.toBeVisible({ timeout: 5000 });
  }

  async verifyInfoOnlyStrategy(): Promise<boolean> {
    // Info-only strategies should have disabled configure button or special messaging
    const isDisabled = await this.configureButton.isDisabled().catch(() => false);
    const hasComingSoonText = await this.page.locator('text=/Coming Soon|View Configuration/').isVisible().catch(() => false);

    return isDisabled || hasComingSoonText;
  }
}
