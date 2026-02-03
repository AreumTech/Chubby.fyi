#!/usr/bin/env node

/**
 * Critical Test Runner Script
 * 
 * Runs the critical missing tests identified in the launch readiness assessment.
 * Organizes test execution by priority and provides clear reporting.
 */

const { spawn } = require('child_process');
const path = require('path');

// Test suites organized by priority
const testSuites = {
  critical: [
    {
      name: 'Quickstart Wizard E2E Tests',
      file: 'quickstart-wizard-comprehensive.spec.ts',
      description: 'Comprehensive tests for the quickstart wizard flow'
    }
  ],
  high: [
    {
      name: 'User Journey Integration Tests',
      file: 'user-journey-integration.spec.ts',
      description: 'Complete end-to-end user journey testing'
    }
  ],
  medium: [
    {
      name: 'Financial Edge Cases Tests',
      file: 'financial-edge-cases.spec.ts',
      description: 'Financial calculation edge cases and validation'
    },
    {
      name: 'Mobile Interaction Tests',
      file: 'mobile-interaction-tests.spec.ts',
      description: 'Mobile-specific interactions and responsive design'
    },
    {
      name: 'Performance Regression Tests',
      file: 'performance-regression-tests.spec.ts',
      description: 'Performance benchmarks and regression detection'
    }
  ]
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function colorLog(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: true,
      cwd: process.cwd()
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });

    child.on('error', (error) => {
      reject(error);
    });
  });
}

async function runTestSuite(suite) {
  const testFile = path.join('tests/e2e', suite.file);
  
  colorLog('cyan', `\n📋 Running: ${suite.name}`);
  colorLog('blue', `📄 File: ${suite.file}`);
  colorLog('blue', `📝 Description: ${suite.description}`);
  
  try {
    await runCommand('npx', ['playwright', 'test', testFile]);
    colorLog('green', `✅ ${suite.name} - PASSED`);
    return { name: suite.name, status: 'PASSED' };
  } catch (error) {
    colorLog('red', `❌ ${suite.name} - FAILED`);
    colorLog('red', `Error: ${error.message}`);
    return { name: suite.name, status: 'FAILED', error: error.message };
  }
}

async function runTestsByPriority(priority) {
  colorLog('magenta', `\n🎯 Running ${priority.toUpperCase()} Priority Tests`);
  colorLog('magenta', '='.repeat(50));
  
  const results = [];
  const suites = testSuites[priority] || [];
  
  for (const suite of suites) {
    const result = await runTestSuite(suite);
    results.push(result);
  }
  
  return results;
}

async function runAllTests() {
  colorLog('bright', '🚀 PathFinder Pro - Critical Test Suite Runner');
  colorLog('bright', '='.repeat(60));
  
  const allResults = {};
  
  // Run tests by priority
  for (const priority of ['critical', 'high', 'medium']) {
    if (testSuites[priority] && testSuites[priority].length > 0) {
      allResults[priority] = await runTestsByPriority(priority);
    }
  }
  
  // Generate summary report
  colorLog('bright', '\n📊 TEST EXECUTION SUMMARY');
  colorLog('bright', '='.repeat(60));
  
  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;
  
  for (const [priority, results] of Object.entries(allResults)) {
    colorLog('yellow', `\n${priority.toUpperCase()} Priority Results:`);
    
    for (const result of results) {
      totalTests++;
      if (result.status === 'PASSED') {
        passedTests++;
        colorLog('green', `  ✅ ${result.name}`);
      } else {
        failedTests++;
        colorLog('red', `  ❌ ${result.name}`);
        if (result.error) {
          colorLog('red', `     Error: ${result.error}`);
        }
      }
    }
  }
  
  colorLog('bright', '\n📈 OVERALL RESULTS:');
  colorLog('bright', `Total Tests: ${totalTests}`);
  colorLog('green', `Passed: ${passedTests}`);
  colorLog('red', `Failed: ${failedTests}`);
  colorLog('bright', `Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
  
  // Exit with appropriate code
  if (failedTests === 0) {
    colorLog('green', '\n🎉 All critical tests passed! Launch readiness improved.');
    process.exit(0);
  } else {
    colorLog('red', '\n⚠️  Some tests failed. Review and fix before launch.');
    process.exit(1);
  }
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    // Run all tests
    await runAllTests();
  } else if (args[0] === '--help' || args[0] === '-h') {
    // Show help
    colorLog('bright', 'PathFinder Pro Critical Test Runner');
    colorLog('bright', '=====================================\n');
    
    console.log('Usage:');
    console.log('  npm run test:critical                 Run all critical tests');
    console.log('  npm run test:critical -- --priority   Run tests by priority level');
    console.log('  npm run test:critical -- --help       Show this help message');
    
    console.log('\nPriority Levels:');
    console.log('  critical: Quickstart wizard tests (highest priority)');
    console.log('  high:     User journey integration tests');
    console.log('  medium:   Edge cases, mobile, and performance tests');
    
    console.log('\nTest Suites:');
    for (const [priority, suites] of Object.entries(testSuites)) {
      colorLog('yellow', `\n${priority.toUpperCase()}:`);
      for (const suite of suites) {
        console.log(`  • ${suite.name}`);
        console.log(`    ${suite.description}`);
      }
    }
  } else if (args[0] === '--priority') {
    // Run specific priority level
    const priority = args[1];
    if (testSuites[priority]) {
      const results = await runTestsByPriority(priority);
      
      const passed = results.filter(r => r.status === 'PASSED').length;
      const failed = results.filter(r => r.status === 'FAILED').length;
      
      colorLog('bright', `\n📈 ${priority.toUpperCase()} Priority Results:`);
      colorLog('bright', `Passed: ${passed}, Failed: ${failed}`);
      
      process.exit(failed > 0 ? 1 : 0);
    } else {
      colorLog('red', `❌ Unknown priority level: ${priority}`);
      colorLog('yellow', 'Available priorities: critical, high, medium');
      process.exit(1);
    }
  } else {
    colorLog('red', `❌ Unknown argument: ${args[0]}`);
    colorLog('yellow', 'Use --help for usage information');
    process.exit(1);
  }
}

// Handle process termination gracefully
process.on('SIGINT', () => {
  colorLog('yellow', '\n⚠️  Test execution interrupted');
  process.exit(130);
});

process.on('SIGTERM', () => {
  colorLog('yellow', '\n⚠️  Test execution terminated');
  process.exit(143);
});

// Run the main function
main().catch((error) => {
  colorLog('red', `💥 Unexpected error: ${error.message}`);
  console.error(error);
  process.exit(1);
});