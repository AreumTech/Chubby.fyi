import { render as rtlRender, RenderOptions } from '@testing-library/react';
import { ReactElement } from 'react';
import { vi } from 'vitest';
import { axe, toHaveNoViolations } from 'jest-axe';

// Extend Vitest's expect with jest-axe matchers
expect.extend(toHaveNoViolations);

// Custom render function that wraps RTL's render
function render(ui: ReactElement, options?: RenderOptions) {
  return rtlRender(ui, {
    // Add any providers here if needed
    // wrapper: ({ children }) => <Provider>{children}</Provider>,
    ...options,
  });
}

// Accessibility testing helper
export const checkAccessibility = async (container: Element) => {
  const results = await axe(container);
  return results;
};

// Focus management helpers
export const focusHelpers = {
  isFocusable: (element: Element): boolean => {
    if (!element) return false;
    
    // Check if element can be focused
    const focusableSelectors = [
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'a[href]',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]'
    ];
    
    return focusableSelectors.some(selector => element.matches(selector));
  },
  
  getCurrentFocus: (): Element | null => {
    return document.activeElement;
  },
  
  getFocusableElements: (container: Element): Element[] => {
    const focusableSelectors = [
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'a[href]',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]'
    ].join(', ');
    
    return Array.from(container.querySelectorAll(focusableSelectors));
  },
  
  getFirstFocusable: (container: Element): Element | null => {
    const focusableElements = focusHelpers.getFocusableElements(container);
    return focusableElements[0] || null;
  },
  
  getLastFocusable: (container: Element): Element | null => {
    const focusableElements = focusHelpers.getFocusableElements(container);
    return focusableElements[focusableElements.length - 1] || null;
  }
};

// Mock helpers for common browser APIs
export const mockWindowAPI = {
  matchMedia: (query: string) => {
    return vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  },
  
  ResizeObserver: vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  })),
  
  IntersectionObserver: vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }))
};

// Test data helpers
export const testHelpers = {
  createMockEvent: (overrides = {}) => ({
    id: 'test-event-id',
    type: 'INCOME' as const,
    name: 'Test Event',
    amount: 1000,
    startDateOffset: 0,
    endDateOffset: 120,
    ...overrides
  }),
  
  createMockConfig: (overrides = {}) => ({
    currentAge: 30,
    simulationEndAge: 100,
    inflationRate: 0.03,
    ...overrides
  }),
  
  waitForTimeout: (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
};

// Export everything including the custom render
export * from '@testing-library/react';
export { render };