import playwright, { Page, Locator } from '@playwright/test';
const { expect } = playwright;

export class DashboardPage {
  readonly page: Page;
  readonly runSimulationButton: Locator;
  readonly mainContent: Locator;
  readonly pageTitle: Locator;
  readonly subtitle: Locator;
  readonly netWorthChart: Locator;
  readonly cashFlowChart: Locator;
  readonly chartControls: Locator;
  readonly goalAnalysisSection: Locator;
  readonly projectionChartSection: Locator;
  readonly deepDiveSection: Locator;

  constructor(page: Page) {
    this.page = page;
    this.runSimulationButton = page.getByRole('button', { name: /run simulation/i });
    this.mainContent = page.locator('main').first();
    this.pageTitle = page.getByRole('heading', { name: /financial plan analysis/i });
    this.subtitle = page.locator('text=/the accelerator.*base case scenario/i');
    this.netWorthChart = page.locator('canvas#mainChart').or(page.locator('[data-testid="net-worth-chart"]')).or(page.locator('canvas').first());
    this.cashFlowChart = page.locator('[data-testid="cash-flow-chart"]').or(page.locator('canvas').nth(1));
    this.chartControls = page.locator('.chart-controls').or(page.locator('.bg-white.border.border-gray-200.rounded-lg.p-4'));
    this.goalAnalysisSection = page.locator('text=Goal-by-Goal Success Analysis').locator('..');
    this.projectionChartSection = page.locator('text=Net Worth Projection').locator('..');
    this.deepDiveSection = page.locator('text=Year-by-Year Deep Dive').locator('..');
  }

  async waitForDashboardLoad(): Promise<void> {
    await expect(this.mainContent).toBeVisible({ timeout: 15000 });
    // Check for simulation results being displayed
    await expect(this.page.locator('canvas').first()).toBeVisible({ timeout: 10000 });
  }

  async waitForSimulationComplete(): Promise<void> {
    await expect(this.netWorthChart).toBeVisible({ timeout: 30000 });
    await this.page.waitForTimeout(3000);
  }

  async runSimulation(): Promise<void> {
    if (await this.runSimulationButton.isVisible()) {
      await this.runSimulationButton.click();
      await this.waitForSimulationComplete();
    }
  }

  async clickOnChart(xPercentage: number = 0.7, yPercentage: number = 0.3): Promise<void> {
    const chart = this.netWorthChart.first();
    await expect(chart).toBeVisible();
    
    const box = await chart.boundingBox();
    if (box) {
      await chart.click({
        position: {
          x: box.width * xPercentage,
          y: box.height * yPercentage
        }
      });
      await this.page.waitForTimeout(1000);
    }
  }

  async getSuccessRate(): Promise<string | null> {
    const successGauge = this.page.locator('text=/\\d+% Success/');
    if (await successGauge.isVisible()) {
      return await successGauge.innerText();
    }
    return null;
  }

  async getNetWorthValues(): Promise<{ p10: string | null, p50: string | null, p90: string | null }> {
    const p10 = this.page.locator('text=P10').locator('..').locator('text=/\\$[\\d,]+/');
    const p50 = this.page.locator('text=/P50|Median/').locator('..').locator('text=/\\$[\\d,]+/');
    const p90 = this.page.locator('text=P90').locator('..').locator('text=/\\$[\\d,]+/');

    return {
      p10: await p10.isVisible() ? await p10.innerText() : null,
      p50: await p50.isVisible() ? await p50.innerText() : null,
      p90: await p90.isVisible() ? await p90.innerText() : null
    };
  }

  async isChartVisible(): Promise<boolean> {
    return await this.netWorthChart.first().isVisible();
  }

  async getChartDimensions(): Promise<{ width: number, height: number } | null> {
    const chart = this.netWorthChart.first();
    if (await chart.isVisible()) {
      const box = await chart.boundingBox();
      return box ? { width: box.width, height: box.height } : null;
    }
    return null;
  }
}