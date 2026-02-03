import playwright, { Page, Locator } from '@playwright/test';
const { expect } = playwright;

export class OnboardingPage {
  readonly page: Page;
  readonly personaGrid: Locator;
  readonly continueButton: Locator;
  readonly selectProfileButton: Locator;
  readonly backToPersonasButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.personaGrid = page.locator('.grid.grid-cols-7.gap-4');
    this.continueButton = page.getByRole('button', { name: 'Continue' });
    this.selectProfileButton = page.getByRole('button', { name: 'Select This Profile' });
    this.backToPersonasButton = page.getByRole('button', { name: 'Back to Personas' });
  }

  async selectPersona(personaName: string): Promise<void> {
    // Personas are rendered as div elements with click handlers, not buttons
    // The display name strips "The " prefix (e.g., "The Accelerator" shows as "Accelerator")
    const displayName = personaName.replace('The ', '');
    
    const personaCard = this.page.locator(`div.cursor-pointer:has-text("${displayName}")`)
      .or(this.page.locator(`h3:has-text("${displayName}")`).locator('..').locator('..'))
      .or(this.page.locator('.grid.grid-cols-7 div').filter({ hasText: displayName }))
      .first();
    
    await expect(personaCard).toBeVisible({ timeout: 10000 });
    await personaCard.click();
  }

  async waitForPersonaSelection(): Promise<void> {
    // For regular personas, selection immediately triggers onComplete
    // Only "start-from-scratch" shows a Continue button
    // We can wait for either a continue button or for the onboarding to complete
    await Promise.race([
      expect(this.selectProfileButton.or(this.continueButton)).toBeVisible({ timeout: 2000 }).catch(() => {}),
      this.waitForOnboardingComplete().catch(() => {})
    ]);
  }

  async confirmPersonaSelection(): Promise<void> {
    // Check if there's a confirmation button (only for "start-from-scratch")
    const continueButton = this.continueButton;
    const selectButton = this.selectProfileButton;
    
    if (await continueButton.isVisible({ timeout: 1000 }).catch(() => false)) {
      await continueButton.click();
    } else if (await selectButton.isVisible({ timeout: 1000 }).catch(() => false)) {
      await selectButton.click();
    }
    // If no buttons are visible, the persona selection already completed automatically
  }

  async waitForOnboardingComplete(): Promise<void> {
    await expect(this.personaGrid).not.toBeVisible({ timeout: 15000 });
  }

  async isVisible(): Promise<boolean> {
    return await this.personaGrid.isVisible();
  }

  async getAvailablePersonas(): Promise<string[]> {
    const personaCards = this.personaGrid.locator('button[role="button"]');
    const personas = [];
    const count = await personaCards.count();
    
    for (let i = 0; i < count; i++) {
      const text = await personaCards.nth(i).innerText();
      personas.push(text.trim());
    }
    
    return personas;
  }
}