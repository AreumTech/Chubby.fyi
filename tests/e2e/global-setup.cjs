async function globalSetup() {
  // Global setup for E2E tests
  console.log('🧪 Setting up E2E test environment...');
  
  // Mock localStorage for Node.js environment
  if (typeof global !== 'undefined' && !global.localStorage) {
    global.localStorage = {
      getItem: (key) => null,
      setItem: (key, value) => {},
      removeItem: (key) => {},
      clear: () => {},
      length: 0,
      key: (index) => null
    };
  }
  
  console.log('✅ E2E test environment ready');
}

module.exports = globalSetup;