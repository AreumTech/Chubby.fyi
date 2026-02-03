import playwright, { Page, Locator } from '@playwright/test';
const { expect } = playwright;

export class EventModalPage {
  readonly page: Page;
  readonly modalTitle: Locator;
  readonly categoryCards: Locator;
  readonly backToCategoriesButton: Locator;
  readonly createEventButton: Locator;
  readonly cancelButton: Locator;
  
  // Event categories
  readonly careerIncomeCategory: Locator;
  readonly expensesCostsCategory: Locator;
  readonly assetsGoalsCategory: Locator;
  readonly lifeEventsCategory: Locator;
  
  // Form elements
  readonly nameInput: Locator;
  readonly amountInput: Locator;
  readonly frequencySelect: Locator;
  readonly startYearInput: Locator;
  readonly startMonthInput: Locator;

  constructor(page: Page) {
    this.page = page;
    this.modalTitle = page.getByRole('heading', { name: /add new financial event/i });
    this.categoryCards = page.locator('.bg-\\w+-50.border-2.border-\\w+-200.rounded-xl.p-6');
    this.backToCategoriesButton = page.getByRole('button', { name: /back to categories/i });
    this.createEventButton = page.getByRole('button', { name: /create event/i });
    this.cancelButton = page.getByRole('button', { name: /cancel/i });
    
    // Event categories
    this.careerIncomeCategory = page.locator('text=💼').locator('..').or(page.locator('text=Career & Income').locator('..'));
    this.expensesCostsCategory = page.locator('text=💸').locator('..').or(page.locator('text=Expenses & Costs').locator('..'));
    this.assetsGoalsCategory = page.locator('text=🏡').locator('..').or(page.locator('text=Assets & Goals').locator('..'));
    this.lifeEventsCategory = page.locator('text=⚡').locator('..').or(page.locator('text=Life Events').locator('..'));
    
    // Common form elements
    this.nameInput = page.locator('input[name="name"]').or(page.locator('label:has-text("Name")').locator('+ input'));
    this.amountInput = page.locator('input[name="amount"]').or(page.locator('label:has-text("Amount")').locator('+ input'));
    this.frequencySelect = page.locator('select[name="frequency"]').or(page.locator('label:has-text("Frequency")').locator('+ select'));
    this.startYearInput = page.locator('input[name="startYear"]').or(page.locator('label:has-text("Start Year")').locator('+ input'));
    this.startMonthInput = page.locator('input[name="startMonth"]').or(page.locator('label:has-text("Start Month")').locator('+ input'));
  }

  async waitForModalVisible(): Promise<void> {
    await expect(this.modalTitle).toBeVisible({ timeout: 5000 });
  }

  async selectCategory(category: 'income' | 'expense' | 'asset' | 'life'): Promise<void> {
    let categoryCard: Locator;
    
    switch (category) {
      case 'income':
        categoryCard = this.careerIncomeCategory;
        break;
      case 'expense':
        categoryCard = this.expensesCostsCategory;
        break;
      case 'asset':
        categoryCard = this.assetsGoalsCategory;
        break;
      case 'life':
        categoryCard = this.lifeEventsCategory;
        break;
    }
    
    await expect(categoryCard).toBeVisible();
    await categoryCard.click();
  }

  async fillEventForm(eventData: {
    name: string;
    amount: number;
    frequency?: string;
    startYear?: number;
    startMonth?: number;
  }): Promise<void> {
    if (await this.nameInput.isVisible()) {
      await this.nameInput.fill(eventData.name);
    }
    
    if (await this.amountInput.isVisible()) {
      await this.amountInput.fill(eventData.amount.toString());
    }
    
    if (eventData.frequency && await this.frequencySelect.isVisible()) {
      await this.frequencySelect.selectOption(eventData.frequency);
    }
    
    if (eventData.startYear && await this.startYearInput.isVisible()) {
      await this.startYearInput.fill(eventData.startYear.toString());
    }
    
    if (eventData.startMonth && await this.startMonthInput.isVisible()) {
      await this.startMonthInput.fill(eventData.startMonth.toString());
    }
  }

  async createEvent(): Promise<void> {
    await expect(this.createEventButton).toBeVisible();
    await this.createEventButton.click();
  }

  async cancelEvent(): Promise<void> {
    await expect(this.cancelButton).toBeVisible();
    await this.cancelButton.click();
  }

  async goBackToCategories(): Promise<void> {
    if (await this.backToCategoriesButton.isVisible()) {
      await this.backToCategoriesButton.click();
    }
  }

  async isVisible(): Promise<boolean> {
    return await this.modalTitle.isVisible();
  }

  async waitForModalClosed(): Promise<void> {
    await expect(this.modalTitle).not.toBeVisible({ timeout: 5000 });
  }
}