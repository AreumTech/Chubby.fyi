import playwright, { Page, Locator } from '@playwright/test';
const { expect } = playwright;

export class DeepDivePage {
  readonly page: Page;
  readonly deepDiveSection: Locator;
  readonly deepDiveTab: Locator;
  readonly focusYearHeader: Locator;
  readonly yearSelector: Locator;

  // Net Worth elements
  readonly totalAssetsValue: Locator;
  readonly investmentAccountsValue: Locator;
  readonly totalLiabilitiesValue: Locator;

  constructor(page: Page) {
    this.page = page;
    this.deepDiveSection = page.locator('[data-testid="deep-dive"]').or(page.locator('text=Deep Dive').locator('..'));
    this.deepDiveTab = page.getByRole('button', { name: /deep dive/i }).or(page.locator('[data-testid="deep-dive-tab"]'));
    this.focusYearHeader = page.locator('h3').filter({ hasText: /20\d{2}/ });
    this.yearSelector = page.locator('select');

    // Net Worth values
    this.totalAssetsValue = page.locator('text=Total Assets').locator('..').locator('text=/\\$[1-9][\\d,]*/');
    this.investmentAccountsValue = page.locator('text=Investment Accounts').locator('..').locator('text=/\\$[1-9][\\d,]*/');
    this.totalLiabilitiesValue = page.locator('text=Total Liabilities').locator('..').locator('text=/\\$[\\d,]*/');
  }

  async navigateToDeepDive(): Promise<void> {
    if (await this.deepDiveTab.isVisible()) {
      await this.deepDiveTab.click();
      await this.page.waitForTimeout(500);
    }
  }

  async waitForDeepDiveVisible(): Promise<void> {
    await expect(this.deepDiveSection.or(this.focusYearHeader)).toBeVisible({ timeout: 10000 });
  }

  async getFocusYear(): Promise<string | null> {
    if (await this.focusYearHeader.isVisible()) {
      const headerText = await this.focusYearHeader.innerText();
      const yearMatch = headerText.match(/20\d{2}/);
      return yearMatch ? yearMatch[0] : null;
    }
    return null;
  }

  async selectYear(year: number): Promise<void> {
    if (await this.yearSelector.isVisible()) {
      await this.yearSelector.selectOption(year.toString());
      await this.page.waitForTimeout(500);
    }
  }

  async getNetWorthValues(): Promise<{
    totalAssets: string | null;
    investmentAccounts: string | null;
    totalLiabilities: string | null;
  }> {
    return {
      totalAssets: await this.totalAssetsValue.isVisible() ? await this.totalAssetsValue.innerText() : null,
      investmentAccounts: await this.investmentAccountsValue.isVisible() ? await this.investmentAccountsValue.innerText() : null,
      totalLiabilities: await this.totalLiabilitiesValue.isVisible() ? await this.totalLiabilitiesValue.innerText() : null
    };
  }

  async validateNonZeroValues(): Promise<boolean> {
    const netWorthValues = await this.getNetWorthValues();

    return (netWorthValues.totalAssets && !netWorthValues.totalAssets.includes('$0')) ||
           (netWorthValues.investmentAccounts && !netWorthValues.investmentAccounts.includes('$0')) ||
           false;
  }

  async assertNoZeroValues(): Promise<void> {
    const pageContent = await this.page.textContent('body');

    // Assert we don't see $0 for critical financial fields
    expect(pageContent).not.toMatch(/Total Assets.*\$0(?:\s|$)/);
    expect(pageContent).not.toMatch(/Investment Accounts.*\$0(?:\s|$)/);
  }
}
