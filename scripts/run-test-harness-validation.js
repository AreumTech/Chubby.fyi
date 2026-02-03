#!/usr/bin/env node
/**
 * Test Harness Validation Runner
 * 
 * Executes the complete test harness validation suite and provides
 * comprehensive reporting on simulation engine correctness and reliability.
 */

const { execSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Configuration
const TEST_TIMEOUT = 120000; // 2 minutes per test
const REPORT_DIR = path.join(path.dirname(process.argv[1]), '../test-reports');
const TIMESTAMP = new Date().toISOString().replace(/[:.]/g, '-');

// ANSI colors for console output
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

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logHeader(message) {
  const border = '='.repeat(message.length + 4);
  log(border, 'cyan');
  log(`  ${message}`, 'cyan');  
  log(border, 'cyan');
}

async function checkPrerequisites() {
  logHeader('Checking Prerequisites');
  
  try {
    // Check if dev server is running
    log('🔍 Checking if development server is running...', 'blue');
    
    const { exec } = require('child_process');
    const util = require('util');
    const execAsync = util.promisify(exec);
    
    try {
      await execAsync('curl -f -s http://localhost:5175/test-harness > /dev/null', { timeout: 5000 });
      log('✅ Development server is running on port 5175', 'green');
    } catch (error) {
      log('❌ Development server not accessible on port 5175', 'red');
      log('💡 Please run: npm run dev', 'yellow');
      return false;
    }
    
    // Check if Playwright is installed
    log('🔍 Checking Playwright installation...', 'blue');
    try {
      execSync('npx playwright --version', { stdio: 'pipe' });
      log('✅ Playwright is installed', 'green');
    } catch (error) {
      log('❌ Playwright not found', 'red');
      log('💡 Please run: npx playwright install', 'yellow');
      return false;
    }
    
    return true;
  } catch (error) {
    log(`❌ Prerequisites check failed: ${error.message}`, 'red');
    return false;
  }
}

async function runTestSuite(testPattern, suiteName) {
  logHeader(`Running ${suiteName}`);
  
  return new Promise((resolve) => {
    const reportFile = path.join(REPORT_DIR, `${suiteName.toLowerCase().replace(/\s+/g, '-')}-${TIMESTAMP}.json`);
    
    const cmd = 'npx';
    const args = [
      'playwright', 'test',
      testPattern,
      '--reporter=json',
      `--output-dir=${REPORT_DIR}`,
      '--timeout=' + TEST_TIMEOUT,
      '--retries=1'
    ];
    
    log(`📋 Command: ${cmd} ${args.join(' ')}`, 'blue');
    
    const child = spawn(cmd, args, {
      stdio: ['inherit', 'pipe', 'pipe'],
      shell: process.platform === 'win32'
    });
    
    let stdout = '';
    let stderr = '';
    
    child.stdout.on('data', (data) => {
      const text = data.toString();
      stdout += text;
      // Show real-time progress
      if (text.includes('[') && text.includes(']')) {
        process.stdout.write(text);
      }
    });
    
    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    child.on('close', (code) => {
      // Parse results from stdout JSON
      let results = {
        suite: suiteName,
        success: code === 0,
        code,
        tests: [],
        summary: {}
      };
      
      try {
        // Extract JSON from stdout
        const jsonMatch = stdout.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const testResults = JSON.parse(jsonMatch[0]);
          results.tests = testResults.tests || [];
          results.summary = testResults.stats || {};
        }
      } catch (parseError) {
        log(`⚠️ Could not parse test results: ${parseError.message}`, 'yellow');
      }
      
      // Save detailed report
      if (!fs.existsSync(REPORT_DIR)) {
        fs.mkdirSync(REPORT_DIR, { recursive: true });
      }
      
      fs.writeFileSync(reportFile, JSON.stringify({
        ...results,
        timestamp: new Date().toISOString(),
        stdout,
        stderr
      }, null, 2));
      
      // Display results summary
      if (results.success) {
        log(`✅ ${suiteName} completed successfully`, 'green');
        if (results.summary.passed) {
          log(`   Passed: ${results.summary.passed} tests`, 'green');
        }
      } else {
        log(`❌ ${suiteName} failed (exit code: ${code})`, 'red');
        if (results.summary.failed) {
          log(`   Failed: ${results.summary.failed} tests`, 'red');
        }
        if (results.summary.passed) {
          log(`   Passed: ${results.summary.passed} tests`, 'green');
        }
      }
      
      if (stderr) {
        log('📋 Error output:', 'yellow');
        console.log(stderr);
      }
      
      resolve(results);
    });
  });
}

async function generateSummaryReport(allResults) {
  logHeader('Generating Summary Report');
  
  const summaryReport = {
    timestamp: new Date().toISOString(),
    overallSuccess: allResults.every(result => result.success),
    suites: allResults,
    totals: {
      totalTests: allResults.reduce((sum, result) => sum + (result.summary.total || 0), 0),
      totalPassed: allResults.reduce((sum, result) => sum + (result.summary.passed || 0), 0),
      totalFailed: allResults.reduce((sum, result) => sum + (result.summary.failed || 0), 0),
      totalSkipped: allResults.reduce((sum, result) => sum + (result.summary.skipped || 0), 0)
    }
  };
  
  const summaryFile = path.join(REPORT_DIR, `test-harness-summary-${TIMESTAMP}.json`);
  fs.writeFileSync(summaryFile, JSON.stringify(summaryReport, null, 2));
  
  // Display summary
  log('📊 Test Harness Validation Summary:', 'bright');
  log(`   Total Tests: ${summaryReport.totals.totalTests}`, 'blue');
  log(`   Passed: ${summaryReport.totals.totalPassed}`, 'green');
  log(`   Failed: ${summaryReport.totals.totalFailed}`, summaryReport.totals.totalFailed > 0 ? 'red' : 'blue');
  log(`   Skipped: ${summaryReport.totals.totalSkipped}`, 'yellow');
  log(`   Overall Result: ${summaryReport.overallSuccess ? 'PASS' : 'FAIL'}`, 
      summaryReport.overallSuccess ? 'green' : 'red');
  
  log(`\n📁 Detailed reports saved to: ${REPORT_DIR}`, 'cyan');
  log(`📄 Summary report: ${summaryFile}`, 'cyan');
  
  return summaryReport;
}

async function main() {
  logHeader('Test Harness Validation Suite Runner');
  
  // Check prerequisites
  const prerequisitesPassed = await checkPrerequisites();
  if (!prerequisitesPassed) {
    log('❌ Prerequisites not met. Exiting.', 'red');
    process.exit(1);
  }
  
  const testSuites = [
    {
      pattern: 'tests/e2e/test-harness-validation.spec.ts',
      name: 'Test Harness Core Functionality'
    },
    {
      pattern: 'tests/e2e/simulation-engine-validation.spec.ts', 
      name: 'Simulation Engine Validation'
    }
  ];
  
  const allResults = [];
  
  // Run each test suite
  for (const suite of testSuites) {
    const result = await runTestSuite(suite.pattern, suite.name);
    allResults.push(result);
    
    // Brief pause between suites
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  // Generate summary report
  const summary = await generateSummaryReport(allResults);
  
  // Exit with appropriate code
  const exitCode = summary.overallSuccess ? 0 : 1;
  
  if (exitCode === 0) {
    logHeader('🎉 All Test Harness Validations PASSED! 🎉');
    log('The simulation engine test harness is working correctly.', 'green');
  } else {
    logHeader('💥 Test Harness Validation FAILED 💥');
    log('Some tests failed. Check the detailed reports for more information.', 'red');
  }
  
  process.exit(exitCode);
}

// Handle errors gracefully
process.on('uncaughtException', (error) => {
  log(`💥 Uncaught Exception: ${error.message}`, 'red');
  console.error(error.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  log(`💥 Unhandled Rejection at ${promise}: ${reason}`, 'red');
  process.exit(1);
});

// Run the main function
main().catch((error) => {
  log(`💥 Main function error: ${error.message}`, 'red');
  console.error(error.stack);
  process.exit(1);
});