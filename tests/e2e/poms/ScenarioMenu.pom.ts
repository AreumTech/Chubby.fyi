import playwright, { Page, Locator } from '@playwright/test';
const { expect } = playwright;

export class ScenarioMenuPage {
  readonly page: Page;
  readonly sidebar: Locator;
  readonly goalsSection: Locator;
  readonly timelineSection: Locator;
  readonly strategiesSection: Locator;
  readonly addGoalButton: Locator;
  readonly addEventButton: Locator;
  readonly configureButton: Locator;
  readonly scenarioSelector: Locator;
  readonly settingsButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.sidebar = page.locator('aside.w-96.p-5.border-r.border-gray-200.bg-gray-50').or(page.locator('[data-testid="sidebar"]'));
    this.goalsSection = page.locator('text=🎯').locator('..').or(page.locator('text=Financial Goals').locator('..'));
    this.timelineSection = page.locator('text=📅').locator('..').or(page.locator('text=Financial Timeline').locator('..'));
    this.strategiesSection = page.locator('text=🎛️').locator('..').or(page.locator('text=Active Strategies').locator('..'));
    this.addGoalButton = page.getByRole('button', { name: /add goal/i });
    this.addEventButton = page.getByRole('button', { name: /add event/i });
    this.configureButton = page.getByRole('button', { name: /configure/i });
    this.scenarioSelector = page.locator('select.border.border-gray-300.rounded-lg');
    this.settingsButton = page.getByRole('button', { name: /⚙️/ }).or(page.locator('button:has-text("⚙️")'));
  }

  async waitForSidebarVisible(): Promise<void> {
    await expect(this.sidebar.or(this.goalsSection)).toBeVisible({ timeout: 10000 });
  }

  async addNewGoal(): Promise<void> {
    await expect(this.addGoalButton).toBeVisible();
    await this.addGoalButton.click();
  }

  async addNewEvent(): Promise<void> {
    await expect(this.addEventButton).toBeVisible();
    await this.addEventButton.click();
  }

  async openSettings(): Promise<void> {
    await expect(this.settingsButton).toBeVisible();
    await this.settingsButton.click();
  }

  async selectScenario(scenarioName: string): Promise<void> {
    if (await this.scenarioSelector.isVisible()) {
      await this.scenarioSelector.selectOption(scenarioName);
    }
  }

  async getGoalsCount(): Promise<number> {
    const goalItems = this.goalsSection.locator('li, .goal-item, [data-testid="goal-item"]');
    return await goalItems.count();
  }

  async getEventsCount(): Promise<number> {
    const eventItems = this.timelineSection.locator('li, .event-item, [data-testid="event-item"]');
    return await eventItems.count();
  }

  async getStrategiesCount(): Promise<number> {
    const strategyItems = this.strategiesSection.locator('li, .strategy-item, [data-testid="strategy-item"]');
    return await strategyItems.count();
  }

  async isSidebarVisible(): Promise<boolean> {
    return await this.sidebar.isVisible();
  }

  async expandSection(section: 'goals' | 'timeline' | 'strategies'): Promise<void> {
    let sectionLocator: Locator;
    
    switch (section) {
      case 'goals':
        sectionLocator = this.goalsSection;
        break;
      case 'timeline':
        sectionLocator = this.timelineSection;
        break;
      case 'strategies':
        sectionLocator = this.strategiesSection;
        break;
    }
    
    const chevron = sectionLocator.locator('.text-gray-400.mr-2.transition-transform');
    if (await chevron.isVisible()) {
      await chevron.click();
    }
  }

  async collapseSection(section: 'goals' | 'timeline' | 'strategies'): Promise<void> {
    await this.expandSection(section); // Same action - chevron toggles
  }
}