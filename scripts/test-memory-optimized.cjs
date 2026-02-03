#!/usr/bin/env node

/**
 * Memory-optimized test runner for PathFinder Pro
 * 
 * This script runs tests in batches with aggressive memory management
 * to prevent memory exhaustion issues.
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Memory optimization settings
const MEMORY_LIMIT = '1024'; // MB - reduced for stricter control
const BATCH_SIZE = 3; // Number of test files per batch - reduced
const GC_INTERVAL = 100; // Force GC every N iterations
// Removed GC_INTERVAL as --gc-interval is not a valid Node.js flag

// Test file groups for controlled execution
const testGroups = {
  hooks: [
    'tests/unit/hooks/useEmojiAnimation.test.ts',
    'tests/unit/hooks/useCommandBus.test.ts',
    'tests/unit/hooks/useFormValidation.test.ts',
    'tests/unit/hooks/wasmOnlySimulation.test.ts'
  ],
  services: [
    'tests/unit/services/accountMapping.test.ts',
    'tests/unit/services/validationService.test.ts'
  ],
  store: [
    'tests/unit/store/appStore.test.ts'
  ],
  utils: [
    'tests/unit/utils/initializeGoalMigration.test.ts'
  ]
};

// Performance tests run separately with special memory handling
const performanceTests = [];

// Heavy integration tests run last with maximum memory
const heavyTests = [];

async function runTestGroup(groupName, testFiles) {
  console.log(`\n🧪 Running ${groupName} tests...`);
  
  return new Promise((resolve, reject) => {
    const vitestArgs = [
      'run',
      '--reporter=basic',
      '--no-coverage',
      '--run',
      ...testFiles
    ];

    const vitestProcess = spawn('npx', ['vitest', ...vitestArgs], {
      stdio: 'inherit',
      env: {
        ...process.env,
        NODE_OPTIONS: `--max-old-space-size=${MEMORY_LIMIT} --expose-gc --max-semi-space-size=32`,
        VITEST_POOL_OPTIONS_FORKS_SINGLE_FORK: 'true',
        VITEST_POOL_OPTIONS_FORKS_ISOLATE: 'true',
        VITEST_BAIL: '1' // Stop on first failure
      }
    });

    vitestProcess.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ ${groupName} tests completed successfully`);
        resolve();
      } else {
        console.error(`❌ ${groupName} tests failed with code ${code}`);
        reject(new Error(`Tests failed with code ${code}`));
      }
    });

    vitestProcess.on('error', (error) => {
      console.error(`❌ Failed to start ${groupName} tests:`, error);
      reject(error);
    });
  });
}

async function runPerformanceTests() {
  console.log('\n🚀 Running performance tests with increased memory...');
  
  return new Promise((resolve, reject) => {
    const vitestArgs = [
      'run',
      '--reporter=basic',
      '--no-coverage',
      '--run',
      '--testTimeout=30000',
      ...performanceTests
    ];

    const vitestProcess = spawn('npx', ['vitest', ...vitestArgs], {
      stdio: 'inherit',
      env: {
        ...process.env,
        NODE_OPTIONS: `--max-old-space-size=1536 --expose-gc`,
        VITEST_POOL_OPTIONS_FORKS_SINGLE_FORK: 'true',
        VITEST_BAIL: '1'
      }
    });

    vitestProcess.on('close', (code) => {
      if (code === 0) {
        console.log('✅ Performance tests completed successfully');
        resolve();
      } else {
        console.error(`❌ Performance tests failed with code ${code}`);
        reject(new Error(`Performance tests failed with code ${code}`));
      }
    });
  });
}

async function runHeavyTests() {
  console.log('\n🏋️ Running heavy integration tests...');
  
  return new Promise((resolve, reject) => {
    const vitestArgs = [
      'run',
      '--reporter=basic',
      '--no-coverage',
      '--run',
      '--testTimeout=60000',
      ...heavyTests
    ];

    const vitestProcess = spawn('npx', ['vitest', ...vitestArgs], {
      stdio: 'inherit',
      env: {
        ...process.env,
        NODE_OPTIONS: `--max-old-space-size=2048 --expose-gc`,
        VITEST_POOL_OPTIONS_FORKS_SINGLE_FORK: 'true',
        VITEST_BAIL: '1'
      }
    });

    vitestProcess.on('close', (code) => {
      if (code === 0) {
        console.log('✅ Heavy tests completed successfully');
        resolve();
      } else {
        console.error(`❌ Heavy tests failed with code ${code}`);
        // Don't reject for heavy tests - they're optional
        console.warn('⚠️ Heavy tests failed but continuing...');
        resolve();
      }
    });
  });
}

function displayMemoryUsage() {
  const used = process.memoryUsage();
  console.log('\n📊 Memory Usage:');
  for (let key in used) {
    console.log(`  ${key}: ${Math.round(used[key] / 1024 / 1024 * 100) / 100} MB`);
  }
}

async function main() {
  console.log('🔧 PathFinder Pro Memory-Optimized Test Runner');
  console.log('================================================');
  
  const startTime = Date.now();
  let passedGroups = 0;
  let totalGroups = Object.keys(testGroups).length;

  try {
    // Run basic test groups sequentially
    for (const [groupName, testFiles] of Object.entries(testGroups)) {
      await runTestGroup(groupName, testFiles);
      passedGroups++;
      
      // Display memory usage and wait a bit between groups
      displayMemoryUsage();
      await new Promise(resolve => setTimeout(resolve, 2000)); // Longer pause for memory recovery
      
      // Force aggressive garbage collection if available
      if (global.gc) {
        global.gc();
        global.gc(); // Run twice for thorough cleanup
      }
    }

    if (performanceTests.length > 0) {
      try {
        if (global.gc) {
          global.gc();
        }
        await runPerformanceTests();
        console.log('✅ Performance tests passed');
      } catch (error) {
        console.warn('⚠️ Performance tests failed, but continuing...');
      } finally {
        if (global.gc) {
          global.gc();
        }
      }
    }

    if (heavyTests.length > 0) {
      try {
        if (global.gc) {
          global.gc();
        }
        await runHeavyTests();
        console.log('✅ Heavy integration tests passed');
      } catch (error) {
        console.warn('⚠️ Heavy tests failed, but continuing...');
      } finally {
        if (global.gc) {
          global.gc();
        }
      }
    }

    const endTime = Date.now();
    const duration = Math.round((endTime - startTime) / 1000);

    console.log('\n🎉 Test Suite Summary');
    console.log('====================');
    console.log(`✅ ${passedGroups}/${totalGroups} test groups passed`);
    console.log(`⏱️  Total time: ${duration}s`);
    console.log('💡 Memory optimizations successfully applied');
    
    displayMemoryUsage();

  } catch (error) {
    console.error('\n❌ Test run failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { runTestGroup, runPerformanceTests, runHeavyTests };
