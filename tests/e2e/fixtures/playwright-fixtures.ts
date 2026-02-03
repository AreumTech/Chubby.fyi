import { test as base, Page } from '@playwright/test';
import { readFileSync } from 'fs';
import { join } from 'path';

interface TestFixture {
  id: string;
  name: string;
  description: string;
  initialEvent: any;
  events: any[];
  goals?: any[];
  liabilities?: any[];
}

interface CustomPage extends Page {
  loadFixture(fixtureName: string): Promise<void>;
  getFixtureData(fixtureName: string): TestFixture;
}

export const test = base.extend<{ customPage: CustomPage }>({
  customPage: async ({ page }, use) => {
    const customPage = page as CustomPage;

    customPage.getFixtureData = (fixtureName: string): TestFixture => {
      const fixturePath = join(__dirname, `${fixtureName}.json`);
      try {
        const fixtureContent = readFileSync(fixturePath, 'utf-8');
        return JSON.parse(fixtureContent);
      } catch (error) {
        throw new Error(`Failed to load fixture '${fixtureName}': ${error}`);
      }
    };

    customPage.loadFixture = async (fixtureName: string): Promise<void> => {
      const fixtureData = customPage.getFixtureData(fixtureName);
      
      // Navigate to the app with debug mode
      await customPage.goto('/?debug=true&fixture=' + fixtureName);
      
      // Wait for the app to load
      await customPage.waitForSelector('[data-testid="app-container"]', { timeout: 10000 });
      
      // Inject fixture data into the application
      await customPage.evaluate((data) => {
        // Store fixture data in window for the app to use
        (window as any).TEST_FIXTURE_DATA = data;
        
        // Dispatch a custom event to notify the app about the fixture data
        window.dispatchEvent(new CustomEvent('test-fixture-loaded', { 
          detail: data 
        }));
      }, fixtureData);
      
      // Wait a moment for the app to process the fixture data
      await customPage.waitForTimeout(1000);
    };

    await use(customPage);
  }
});

export { expect } from '@playwright/test';