import { Page } from '@playwright/test';
import { readFileSync } from 'fs';
import { join } from 'path';

export interface TestFixture {
  id: string;
  name: string;
  description: string;
  initialEvent: any;
  events: any[];
  goals?: any[];
  liabilities?: any[];
}

export class FixtureLoader {
  constructor(private page: Page) {}

  async loadFixture(fixtureName: string): Promise<void> {
    const fixtureData = this.getFixtureData(fixtureName);
    
    // Navigate to the app
    await this.page.goto('/');
    
    // Wait for the app to load
    await this.page.waitForSelector('[data-testid="app-container"]', { timeout: 10000 });
    
    // Inject the fixture data into the app by creating a custom persona
    await this.page.evaluate((data) => {
      // Create a custom persona based on the fixture data
      const customPersona = {
        id: data.id,
        name: data.name,
        title: data.name,
        description: data.description,
        config: {},
        initialEvent: data.initialEvent,
        events: data.events,
        keyFeatures: [],
        details: {
          duration: 'Test scenario',
          targetNetWorth: 'Variable'
        },
        primaryGoal: 'Testing',
        modelsSummary: 'Test Fixture'
      };

      // Store the custom persona in window for access
      (window as any).TEST_CUSTOM_PERSONA = customPersona;
      
      // Try to access the persona manager and load the custom persona
      // This will work with the existing architecture
      const event = new CustomEvent('load-test-persona', { 
        detail: customPersona 
      });
      window.dispatchEvent(event);
    }, fixtureData);

    // Alternative approach: programmatically trigger persona loading
    await this.loadPersonaDirectly(fixtureData);
  }

  private async loadPersonaDirectly(fixtureData: TestFixture): Promise<void> {
    // Directly manipulate the application state to load the fixture data
    await this.page.evaluate((data) => {
      // Access React state through the DOM (if possible)
      const appContainer = document.querySelector('[data-testid="app-container"]');
      if (appContainer && (appContainer as any)._reactInternalFiber) {
        // Try to access React state - this is a fallback approach
        console.log('Attempting to load fixture via React state access');
      }
      
      // Alternative: Use localStorage to store fixture data for app pickup
      localStorage.setItem('TEST_FIXTURE_DATA', JSON.stringify(data));
      localStorage.setItem('TEST_MODE', 'true');
      
      // Reload to pick up the test data
      window.location.reload();
    }, fixtureData);

    // Wait for reload and re-initialization
    await this.page.waitForSelector('[data-testid="app-container"]', { timeout: 10000 });
    await this.page.waitForTimeout(2000);
  }

  async loadPersonaBySelection(personaName: string): Promise<void> {
    // Simpler approach: just select an existing persona
    await this.page.goto('/');
    await this.page.waitForSelector('[data-testid="app-container"]', { timeout: 10000 });
    
    // Look for persona selection
    const personaButton = this.page.locator(`button:has-text("${personaName}")`).first();
    if (await personaButton.isVisible()) {
      await personaButton.click();
      
      // Wait for persona to load
      await this.page.waitForTimeout(2000);
      
      // Click confirm if needed
      const confirmButton = this.page.locator('button:has-text("Select This Profile")').or(
        this.page.locator('button:has-text("Continue")')
      );
      
      if (await confirmButton.isVisible()) {
        await confirmButton.click();
      }
    }
  }

  private getFixtureData(fixtureName: string): TestFixture {
    const fixturePath = join(__dirname, '..', 'fixtures', `${fixtureName}.json`);
    try {
      const fixtureContent = readFileSync(fixturePath, 'utf-8');
      return JSON.parse(fixtureContent);
    } catch (error) {
      throw new Error(`Failed to load fixture '${fixtureName}': ${error}`);
    }
  }

  async waitForSimulationComplete(): Promise<void> {
    // Wait for simulation to complete by looking for chart/data presence
    await this.page.waitForFunction(() => {
      // Look for indicators that simulation is done
      const hasChart = document.querySelector('canvas') !== null;
      const hasNetWorth = document.querySelector('text*="Net Worth"') !== null;
      const hasData = document.querySelector('text*="$"') !== null;
      
      return hasChart || hasNetWorth || hasData;
    }, { timeout: 30000 });
    
    // Additional wait for data to settle
    await this.page.waitForTimeout(3000);
  }

  async injectTestData(data: any): Promise<void> {
    await this.page.evaluate((testData) => {
      (window as any).TEST_FIXTURE_DATA = testData;
      
      // Dispatch event for app to pick up
      const event = new CustomEvent('test-data-injected', { detail: testData });
      window.dispatchEvent(event);
    }, data);
  }
}