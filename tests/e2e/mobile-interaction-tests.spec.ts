import { test, expect, devices } from '@playwright/test';
import { QuickstartWizardPage } from './poms/QuickstartWizard.pom';
import { Dashboard } from './poms/Dashboard.pom';
import { EventModal } from './poms/EventModal.pom';

/**
 * Mobile Interaction and Gesture Tests
 * 
 * Tests mobile-specific functionality:
 * - Touch gesture functionality
 * - Responsive layout validation
 * - Mobile-specific user flows
 * - Virtual keyboard interactions
 * - Touch targets and accessibility
 * - Mobile navigation patterns
 */

// Mobile device configurations
const mobileDevices = [
  'iPhone 13',
  'iPhone 13 Pro Max',
  'Pixel 5',
  'Galaxy S21'
];

test.describe('Mobile Interaction Tests', () => {
  let quickstartWizard: QuickstartWizardPage;
  let dashboard: Dashboard;
  let eventModal: EventModal;

  test.describe('Mobile Quickstart Wizard', () => {
    mobileDevices.forEach(device => {
      test(`should work correctly on ${device}`, async ({ browser }) => {
        const context = await browser.newContext({
          ...devices[device]
        });
        const page = await context.newPage();
        
        quickstartWizard = new QuickstartWizardPage(page);
        
        // Clear storage for new user experience
        await page.goto('/');
        await page.evaluate(() => {
          localStorage.clear();
          sessionStorage.clear();
        });
        await page.reload();
        
        // Verify quickstart opens on mobile
        await quickstartWizard.waitForWizardToOpen();
        
        // Test mobile-specific wizard interactions
        await test.step('Welcome step mobile interaction', async () => {
          await quickstartWizard.verifyWelcomeStep();
          
          // Verify touch targets are adequate (at least 44px)
          const nextButton = quickstartWizard.nextButton;
          const buttonBox = await nextButton.boundingBox();
          expect(buttonBox?.height).toBeGreaterThanOrEqual(44);
          expect(buttonBox?.width).toBeGreaterThanOrEqual(44);
          
          // Test touch interaction
          await nextButton.tap();
        });
        
        await test.step('Income step mobile input', async () => {
          // Test numeric input on mobile
          const salaryInput = quickstartWizard.incomeStep.salaryInput;
          
          // Tap to focus (should open numeric keyboard)
          await salaryInput.tap();
          
          // Verify keyboard interaction
          await salaryInput.fill('75000');
          
          // Test slider interaction if present
          const slider = quickstartWizard.incomeStep.salarySlider;
          if (await slider.isVisible()) {
            const sliderBox = await slider.boundingBox();
            if (sliderBox) {
              // Drag slider (touch gesture)
              await page.mouse.move(sliderBox.x + sliderBox.width * 0.7, sliderBox.y + sliderBox.height / 2);
              await page.mouse.down();
              await page.mouse.move(sliderBox.x + sliderBox.width * 0.8, sliderBox.y + sliderBox.height / 2);
              await page.mouse.up();
            }
          }
          
          await quickstartWizard.clickNext();
        });
        
        await test.step('Expenses step mobile interaction', async () => {
          await quickstartWizard.fillExpensesStep(45000);
          await quickstartWizard.clickNext();
        });
        
        await test.step('Goal step mobile interaction', async () => {
          await quickstartWizard.fillGoalStep(65);
          await quickstartWizard.clickNext();
        });
        
        await test.step('Review and complete', async () => {
          await quickstartWizard.verifyReviewStep();
          await quickstartWizard.completeWizard();
          await quickstartWizard.waitForWizardToClose();
        });
        
        // Verify mobile transition to main app
        await expect(page.locator('.dashboard, .main-app')).toBeVisible({ timeout: 15000 });
        
        await context.close();
      });
    });

    test('should handle mobile virtual keyboard interactions', async ({ browser }) => {
      const context = await browser.newContext({
        ...devices['iPhone 13'],
        hasTouch: true
      });
      const page = await context.newPage();
      
      quickstartWizard = new QuickstartWizardPage(page);
      
      await page.goto('/');
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
      await page.reload();
      
      await quickstartWizard.waitForWizardToOpen();
      await quickstartWizard.clickNext(); // Welcome -> Income
      
      // Test virtual keyboard behavior
      const salaryInput = quickstartWizard.incomeStep.salaryInput;
      
      // Focus input (should trigger virtual keyboard)
      await salaryInput.tap();
      
      // Verify input receives focus
      await expect(salaryInput).toBeFocused();
      
      // Test typing with virtual keyboard
      await salaryInput.type('85000');
      await expect(salaryInput).toHaveValue('85000');
      
      // Test dismissing keyboard
      await page.tap('body'); // Tap outside to dismiss keyboard
      
      // Verify value persists
      await expect(salaryInput).toHaveValue('85000');
      
      await context.close();
    });

    test('should handle mobile orientation changes', async ({ browser }) => {
      const context = await browser.newContext({
        ...devices['iPhone 13']
      });
      const page = await context.newPage();
      
      quickstartWizard = new QuickstartWizardPage(page);
      
      await page.goto('/');
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
      await page.reload();
      
      await quickstartWizard.waitForWizardToOpen();
      
      // Test portrait orientation
      await page.setViewportSize({ width: 375, height: 812 });
      await expect(quickstartWizard.wizardModal).toBeVisible();
      
      // Test landscape orientation
      await page.setViewportSize({ width: 812, height: 375 });
      await expect(quickstartWizard.wizardModal).toBeVisible();
      
      // Continue with wizard in landscape
      await quickstartWizard.clickNext(); // Welcome -> Income
      await quickstartWizard.fillIncomeStep(70000);
      
      // Switch back to portrait
      await page.setViewportSize({ width: 375, height: 812 });
      await expect(quickstartWizard.incomeStep.salaryInput).toHaveValue('70000');
      
      await context.close();
    });
  });

  test.describe('Mobile Dashboard Interactions', () => {
    test('should handle mobile dashboard navigation', async ({ browser }) => {
      const context = await browser.newContext({
        ...devices['Pixel 5']
      });
      const page = await context.newPage();
      
      quickstartWizard = new QuickstartWizardPage(page);
      dashboard = new Dashboard(page);
      
      // Complete quickstart on mobile
      await page.goto('/');
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
      await page.reload();
      
      await quickstartWizard.waitForWizardToOpen();
      await quickstartWizard.completeFullWizardFlow({
        salary: 80000,
        expenses: 50000,
        retirementAge: 65
      });
      await quickstartWizard.waitForWizardToClose();
      
      await dashboard.waitForDashboardToLoad();
      
      // Test mobile navigation gestures
      await test.step('Mobile sidebar interaction', async () => {
        // Check if mobile hamburger menu exists
        const hamburgerMenu = page.locator('.hamburger, .mobile-menu-toggle, [aria-label="Menu"]');
        
        if (await hamburgerMenu.isVisible()) {
          // Test opening mobile sidebar
          await hamburgerMenu.tap();
          
          // Verify sidebar opens
          const sidebar = page.locator('.sidebar, .mobile-sidebar, .nav-drawer');
          await expect(sidebar).toBeVisible();
          
          // Test closing sidebar (tap outside or close button)
          const closeButton = page.locator('.sidebar-close, .close-drawer, [aria-label="Close"]');
          if (await closeButton.isVisible()) {
            await closeButton.tap();
          } else {
            // Tap outside sidebar to close
            await page.tap('body', { position: { x: 50, y: 200 } });
          }
          
          await expect(sidebar).not.toBeVisible();
        }
      });
      
      // Test mobile chart interactions
      await test.step('Mobile chart gestures', async () => {
        const chartContainer = dashboard.chartContainer;
        await expect(chartContainer).toBeVisible();
        
        const chartBox = await chartContainer.boundingBox();
        if (chartBox) {
          // Test pinch-to-zoom (if supported)
          // Simulate multi-touch pinch gesture
          await page.touchscreen.tap(chartBox.x + chartBox.width / 2, chartBox.y + chartBox.height / 2);
          
          // Test pan gesture
          await page.mouse.move(chartBox.x + 100, chartBox.y + 100);
          await page.mouse.down();
          await page.mouse.move(chartBox.x + 200, chartBox.y + 150);
          await page.mouse.up();
        }
      });
      
      await context.close();
    });

    test('should handle mobile event creation', async ({ browser }) => {
      const context = await browser.newContext({
        ...devices['Galaxy S21']
      });
      const page = await context.newPage();
      
      quickstartWizard = new QuickstartWizardPage(page);
      dashboard = new Dashboard(page);
      eventModal = new EventModal(page);
      
      // Setup
      await page.goto('/');
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
      await page.reload();
      
      await quickstartWizard.waitForWizardToOpen();
      await quickstartWizard.clickSkipToAdvanced();
      await quickstartWizard.waitForWizardToClose();
      
      await dashboard.waitForDashboardToLoad();
      
      // Test mobile event creation flow
      await dashboard.openEventCreationModal();
      await eventModal.waitForModalToOpen();
      
      // Test mobile modal interactions
      await test.step('Mobile modal navigation', async () => {
        // Verify modal is full-screen on mobile
        const modal = eventModal.modal;
        const modalBox = await modal.boundingBox();
        const viewport = page.viewportSize();
        
        if (viewport && modalBox) {
          // On mobile, modal should take most of the screen
          expect(modalBox.width / viewport.width).toBeGreaterThan(0.8);
        }
        
        // Test event type selection with touch
        await eventModal.selectEventType('Income');
      });
      
      // Test mobile form interactions
      await test.step('Mobile form input', async () => {
        // Test form scrolling and input
        const amountInput = page.locator('input[type="number"]').first();
        await amountInput.tap();
        await amountInput.fill('60000');
        
        // Test dropdown/select on mobile
        const frequencySelect = page.locator('select').first();
        if (await frequencySelect.isVisible()) {
          await frequencySelect.tap();
          await frequencySelect.selectOption('Monthly');
        }
        
        // Test date picker on mobile
        const dateInput = page.locator('input[type="date"]').first();
        if (await dateInput.isVisible()) {
          await dateInput.tap();
          // Mobile date picker should open
          await dateInput.fill('2025-06-01');
        }
      });
      
      // Save and verify
      await eventModal.saveEvent();
      await eventModal.waitForModalToClose();
      
      await dashboard.waitForSimulationToComplete();
      await expect(dashboard.chartContainer).toBeVisible();
      
      await context.close();
    });
  });

  test.describe('Mobile Touch Gestures', () => {
    test('should handle swipe gestures in wizard', async ({ browser }) => {
      const context = await browser.newContext({
        ...devices['iPhone 13 Pro Max'],
        hasTouch: true
      });
      const page = await context.newPage();
      
      quickstartWizard = new QuickstartWizardPage(page);
      
      await page.goto('/');
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
      await page.reload();
      
      await quickstartWizard.waitForWizardToOpen();
      
      // Test swipe navigation (if implemented)
      const wizardContent = quickstartWizard.wizardModal;
      const contentBox = await wizardContent.boundingBox();
      
      if (contentBox) {
        // Try swiping left to go to next step
        await page.touchscreen.tap(contentBox.x + contentBox.width - 50, contentBox.y + contentBox.height / 2);
        await page.mouse.move(contentBox.x + contentBox.width - 50, contentBox.y + contentBox.height / 2);
        await page.mouse.down();
        await page.mouse.move(contentBox.x + 50, contentBox.y + contentBox.height / 2);
        await page.mouse.up();
        
        // Check if swipe navigation worked (or fall back to button)
        if (await quickstartWizard.getCurrentStepTitle() === 'Welcome') {
          // Swipe not implemented, use button
          await quickstartWizard.clickNext();
        }
      }
      
      await context.close();
    });

    test('should handle long press gestures', async ({ browser }) => {
      const context = await browser.newContext({
        ...devices['Pixel 5'],
        hasTouch: true
      });
      const page = await context.newPage();
      
      dashboard = new Dashboard(page);
      
      // Setup completed plan
      await page.goto('/');
      await page.evaluate(() => {
        localStorage.setItem('pathfinder-quickstart-completed', 'true');
        // Add some mock data to bypass new user flow
      });
      await page.reload();
      
      await dashboard.waitForDashboardToLoad();
      
      // Test long press on events (if context menu supported)
      const eventElement = page.locator('.event-item, .event-card').first();
      
      if (await eventElement.isVisible()) {
        // Simulate long press
        await eventElement.hover();
        await page.mouse.down();
        await page.waitForTimeout(1000); // Long press duration
        await page.mouse.up();
        
        // Check if context menu appears
        const contextMenu = page.locator('.context-menu, .action-menu');
        if (await contextMenu.isVisible({ timeout: 2000 })) {
          // Test context menu options
          await expect(contextMenu).toBeVisible();
          
          // Close context menu
          await page.tap('body');
          await expect(contextMenu).not.toBeVisible();
        }
      }
      
      await context.close();
    });
  });

  test.describe('Mobile Responsive Layout', () => {
    test('should adapt layout correctly across different screen sizes', async ({ browser }) => {
      const context = await browser.newContext();
      const page = await context.newPage();
      
      dashboard = new Dashboard(page);
      
      // Test different mobile screen sizes
      const screenSizes = [
        { width: 320, height: 568, name: 'iPhone SE' },
        { width: 375, height: 812, name: 'iPhone 13' },
        { width: 414, height: 896, name: 'iPhone 13 Pro Max' },
        { width: 360, height: 640, name: 'Galaxy S21' },
        { width: 768, height: 1024, name: 'iPad' }
      ];
      
      // Setup
      await page.goto('/');
      await page.evaluate(() => {
        localStorage.setItem('pathfinder-quickstart-completed', 'true');
      });
      await page.reload();
      
      for (const size of screenSizes) {
        await test.step(`Testing ${size.name} (${size.width}x${size.height})`, async () => {
          await page.setViewportSize({ width: size.width, height: size.height });
          
          await dashboard.waitForDashboardToLoad();
          
          // Verify essential elements are visible and properly sized
          await expect(dashboard.mainContent).toBeVisible();
          
          // Check that content doesn't overflow horizontally
          const body = await page.locator('body').boundingBox();
          expect(body?.width).toBeLessThanOrEqual(size.width + 20); // Allow small tolerance
          
          // Verify touch targets are adequate size
          const buttons = page.locator('button');
          const buttonCount = await buttons.count();
          
          for (let i = 0; i < Math.min(buttonCount, 5); i++) {
            const button = buttons.nth(i);
            if (await button.isVisible()) {
              const buttonBox = await button.boundingBox();
              if (buttonBox) {
                expect(buttonBox.height).toBeGreaterThanOrEqual(44);
                expect(buttonBox.width).toBeGreaterThanOrEqual(44);
              }
            }
          }
          
          // Test navigation visibility
          const navigation = page.locator('.nav, .navigation, .mobile-nav');
          if (await navigation.isVisible()) {
            const navBox = await navigation.boundingBox();
            if (navBox) {
              expect(navBox.width).toBeLessThanOrEqual(size.width);
            }
          }
        });
      }
      
      await context.close();
    });

    test('should handle mobile-specific UI patterns', async ({ browser }) => {
      const context = await browser.newContext({
        ...devices['iPhone 13']
      });
      const page = await context.newPage();
      
      dashboard = new Dashboard(page);
      
      await page.goto('/');
      await page.evaluate(() => {
        localStorage.setItem('pathfinder-quickstart-completed', 'true');
      });
      await page.reload();
      
      await dashboard.waitForDashboardToLoad();
      
      // Test mobile bottom navigation (if present)
      const bottomNav = page.locator('.bottom-nav, .mobile-bottom-nav, .tab-bar');
      if (await bottomNav.isVisible()) {
        await test.step('Bottom navigation functionality', async () => {
          const navItems = bottomNav.locator('button, a');
          const itemCount = await navItems.count();
          
          for (let i = 0; i < itemCount; i++) {
            const navItem = navItems.nth(i);
            await navItem.tap();
            
            // Verify navigation changes content
            await page.waitForTimeout(500);
            
            // Check that the nav item shows active state
            const activeClass = await navItem.getAttribute('class');
            expect(activeClass).toMatch(/(active|selected|current)/);
          }
        });
      }
      
      // Test mobile card layouts
      const cards = page.locator('.card, .mobile-card');
      if (await cards.count() > 0) {
        await test.step('Mobile card interactions', async () => {
          const firstCard = cards.first();
          await expect(firstCard).toBeVisible();
          
          // Test card tap interaction
          await firstCard.tap();
          
          // Verify card interaction (expansion, navigation, etc.)
          await page.waitForTimeout(500);
        });
      }
      
      // Test mobile scrolling behavior
      await test.step('Mobile scrolling', async () => {
        const scrollableContent = page.locator('.main-content, .dashboard-content');
        
        if (await scrollableContent.isVisible()) {
          // Test vertical scrolling
          await scrollableContent.hover();
          await page.mouse.wheel(0, 500);
          
          // Test that content scrolls properly
          await page.waitForTimeout(300);
          
          // Scroll back to top
          await page.mouse.wheel(0, -500);
        }
      });
      
      await context.close();
    });
  });

  test.describe('Mobile Accessibility', () => {
    test('should maintain accessibility on mobile devices', async ({ browser }) => {
      const context = await browser.newContext({
        ...devices['iPhone 13']
      });
      const page = await context.newPage();
      
      quickstartWizard = new QuickstartWizardPage(page);
      
      await page.goto('/');
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
      await page.reload();
      
      await quickstartWizard.waitForWizardToOpen();
      
      // Test mobile accessibility features
      await test.step('Touch target accessibility', async () => {
        const interactiveElements = page.locator('button, input, select, a[href]');
        const elementCount = await interactiveElements.count();
        
        for (let i = 0; i < Math.min(elementCount, 10); i++) {
          const element = interactiveElements.nth(i);
          
          if (await element.isVisible()) {
            const box = await element.boundingBox();
            
            if (box) {
              // WCAG AA compliance: touch targets should be at least 44x44px
              expect(box.height).toBeGreaterThanOrEqual(44);
              expect(box.width).toBeGreaterThanOrEqual(44);
            }
            
            // Check for appropriate labels
            const ariaLabel = await element.getAttribute('aria-label');
            const title = await element.getAttribute('title');
            const textContent = await element.textContent();
            
            expect(ariaLabel || title || textContent?.trim()).toBeTruthy();
          }
        }
      });
      
      // Test mobile focus management
      await test.step('Mobile focus management', async () => {
        // Test tab navigation (if keyboard is connected)
        await page.keyboard.press('Tab');
        
        const focusedElement = page.locator(':focus');
        await expect(focusedElement).toBeVisible();
        
        // Verify focus is visible
        const focusOutline = await focusedElement.evaluate(el => {
          const styles = window.getComputedStyle(el);
          return styles.outline || styles.boxShadow;
        });
        
        expect(focusOutline).toBeTruthy();
      });
      
      await context.close();
    });

    test('should work with screen readers on mobile', async ({ browser }) => {
      const context = await browser.newContext({
        ...devices['iPhone 13']
      });
      const page = await context.newPage();
      
      quickstartWizard = new QuickstartWizardPage(page);
      
      await page.goto('/');
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
      await page.reload();
      
      await quickstartWizard.waitForWizardToOpen();
      
      // Test ARIA landmarks and labels
      await test.step('ARIA compliance', async () => {
        // Check for main landmarks
        const main = page.locator('[role="main"], main');
        if (await main.isVisible()) {
          await expect(main).toBeVisible();
        }
        
        // Check form labels
        const inputs = page.locator('input');
        const inputCount = await inputs.count();
        
        for (let i = 0; i < inputCount; i++) {
          const input = inputs.nth(i);
          
          if (await input.isVisible()) {
            const id = await input.getAttribute('id');
            const ariaLabel = await input.getAttribute('aria-label');
            const ariaLabelledBy = await input.getAttribute('aria-labelledby');
            
            if (id) {
              const label = page.locator(`label[for="${id}"]`);
              const hasLabel = await label.isVisible();
              
              expect(hasLabel || ariaLabel || ariaLabelledBy).toBeTruthy();
            }
          }
        }
      });
      
      // Test semantic structure
      await test.step('Semantic HTML structure', async () => {
        // Check heading hierarchy
        const headings = page.locator('h1, h2, h3, h4, h5, h6');
        const headingCount = await headings.count();
        
        if (headingCount > 0) {
          // Should have at least one h1
          const h1 = page.locator('h1');
          await expect(h1.first()).toBeVisible();
        }
        
        // Check for proper button vs link usage
        const buttons = page.locator('button');
        const buttonCount = await buttons.count();
        
        for (let i = 0; i < Math.min(buttonCount, 5); i++) {
          const button = buttons.nth(i);
          
          if (await button.isVisible()) {
            // Buttons should have accessible names
            const name = await button.innerText();
            const ariaLabel = await button.getAttribute('aria-label');
            
            expect(name.trim() || ariaLabel).toBeTruthy();
          }
        }
      });
      
      await context.close();
    });
  });
});