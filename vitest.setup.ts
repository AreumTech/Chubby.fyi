// Memory Management and Performance Setup
// Force garbage collection if available
if (global.gc) {
  global.gc();
}

// Suppress console FIRST before any imports to reduce memory usage
const originalConsole = {
  log: console.log,
  debug: console.debug,
  info: console.info,
  warn: console.warn,
  error: console.error
};

// Suppress most console output during tests to reduce memory
console.log = () => {};
console.debug = () => {};
console.info = () => {};

import '@testing-library/jest-dom'
import { vi, beforeEach, afterEach } from 'vitest'

// Import jest-axe for accessibility testing with proper types
const { axe, toHaveNoViolations } = require('jest-axe');

// Extend expect with jest-axe matchers manually to avoid conflicts
expect.extend(toHaveNoViolations);

// Type augmentation for jest-axe matchers on expect
declare global {
  namespace jest {
    interface Matchers<R> {
      toHaveNoViolations(): R;
    }
  }
}

// Set test environment
process.env.NODE_ENV = 'test'
process.env.VITEST = 'true'

// Enhanced memory monitoring and cleanup
let testStartTime: number;
let currentTestName: string | undefined;

// Global memory cleanup for each test
beforeEach(() => {
  // Get current test name for memory tracking
  const testInfo = expect.getState();
  currentTestName = testInfo?.currentTestName;
  
  // Record start time for basic performance insight
  testStartTime = Date.now();
  
  // Clear any existing intervals or timeouts
  vi.clearAllTimers();
  
  // Force aggressive garbage collection if available
  if (global.gc) {
    // Run GC multiple times to ensure cleanup
    global.gc();
    global.gc();
  }
  
  // Clear DOM if in browser environment
  if (typeof window !== 'undefined' && document.body) {
    document.body.innerHTML = '';
  }
});

afterEach(() => {
  const testDuration = Date.now() - testStartTime;
  
  // Clear all mocks and timers
  vi.clearAllMocks();
  vi.clearAllTimers();
  vi.restoreAllMocks();
  
  // Clear any remaining event listeners or observers
  if (typeof window !== 'undefined') {
    // Clear all canvas contexts that might be holding memory
    const canvases = document.querySelectorAll('canvas');
    canvases.forEach(canvas => {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        // Reset canvas size to free memory
        canvas.width = 1;
        canvas.height = 1;
      }
    });
    
    // Clear any workers that might be lingering
    mockWorkers.forEach(worker => {
      if (worker.terminate) {
        worker.terminate();
      }
    });
    mockWorkers.clear();
    
    // Clean up DOM completely
    if (document.body) {
      document.body.innerHTML = '';
    }
    
    // Clear any remaining timers (simplified approach)
    const timeoutId = setTimeout(() => {}, 0);
    clearTimeout(timeoutId);
    
    const intervalId = setInterval(() => {}, 100);
    clearInterval(intervalId);
  }
  
  // Force aggressive garbage collection after each test
  if (global.gc) {
    global.gc();
    global.gc(); // Run twice for thorough cleanup
  }
  

  // Basic alert for unusually long tests
  // Warn if test took too long (potential memory leak indicator)
  if (testDuration > 5000) {
    originalConsole.warn(`Test took ${testDuration}ms - potential memory/performance issue`);
  }
});

// Mock Worker API with proper cleanup
const mockWorkers = new Set<any>();

const createMockWorker = () => ({
  postMessage: vi.fn(),
  onmessage: null,
  terminate: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
});

global.Worker = vi.fn().mockImplementation(() => {
  const worker = createMockWorker();
  const terminate = worker.terminate;
  worker.terminate = vi.fn(() => {
    mockWorkers.delete(worker);
    terminate();
  });
  mockWorkers.add(worker);
  return worker;
});

// Clean up workers after each test
afterEach(() => {
  mockWorkers.forEach(worker => {
    if (worker.terminate) {
      worker.terminate();
    }
  });
  mockWorkers.clear();
});

// Create a basic Canvas mock
const createMockContext = () => ({
  clearRect: vi.fn(),
  fillRect: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  stroke: vi.fn(),
  closePath: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
  setTransform: vi.fn(),
  translate: vi.fn(),
  scale: vi.fn(),
  rotate: vi.fn(),
  fillText: vi.fn(),
  measureText: vi.fn(() => ({ width: 100 })),
  createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
  createRadialGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
  createPattern: vi.fn(),
  drawImage: vi.fn(),
  getImageData: vi.fn(() => ({ data: [] })),
});

// Mock Canvas API with proper typing and memory management
HTMLCanvasElement.prototype.getContext = vi.fn(() => createMockContext()) as any;

// Override HTMLCanvasElement to prevent memory leaks
if (typeof window !== 'undefined') {
  const originalCanvasConstructor = window.HTMLCanvasElement;
  window.HTMLCanvasElement = class extends originalCanvasConstructor {
    constructor() {
      super();
      this.width = 1;
      this.height = 1;
    }
  } as any;
}
