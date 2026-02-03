#!/usr/bin/env node

/**
 * Logging Best Practices Validator
 *
 * This script validates that the codebase follows logging best practices:
 * - No direct console.* usage (except in exempt files)
 * - Go WASM debug logs are wrapped in VERBOSE_DEBUG checks
 * - No bypassed logging in worker files
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.dirname(__dirname);

// Configuration
const config = {
  // Files exempt from console.* restrictions
  exemptFiles: [
    'src/utils/logger.ts',
    'src/components/debug/EnhancedErrorBoundary.tsx',
    'src/utils/fileLogger.ts',
    'index.tsx',
    'scripts/',
    '__tests__/',
    '.test.',
    '.spec.',
    'public/wasmWorker.js',  // Worker files need console for WASM interop
    'src/pages/TestHarness.tsx',  // Test pages need console interception
    'src/pages/TestHarnessPage.tsx'
  ],

  // Directories to check
  checkDirs: ['src', 'public', 'wasm'],

  // File extensions to check
  jsExtensions: ['.js', '.ts', '.tsx', '.jsx'],
  goExtensions: ['.go']
};

class LoggingValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.checkedFiles = 0;
  }

  isExemptFile(filePath) {
    const relativePath = path.relative(projectRoot, filePath);
    return config.exemptFiles.some(exempt =>
      relativePath.includes(exempt) ||
      relativePath.endsWith(exempt)
    );
  }

  validateJavaScriptFile(filePath) {
    if (this.isExemptFile(filePath)) {
      return;
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const relativePath = path.relative(projectRoot, filePath);

    lines.forEach((line, index) => {
      const lineNumber = index + 1;

      // Skip comment lines and documentation
      if (line.trim().startsWith('//') || line.trim().startsWith('*')) {
        return;
      }

      // Check for direct console usage
      const consoleMatch = line.match(/(?<!\/\/.*)console\.(log|info|debug|warn|error)/);
      if (consoleMatch) {
        this.errors.push({
          file: relativePath,
          line: lineNumber,
          type: 'direct-console',
          message: `Direct console.${consoleMatch[1]} usage found. Use logger.${consoleMatch[1]}() instead.`,
          code: line.trim()
        });
      }

      // Check for originalConsole bypassing logging controls
      if (line.includes('originalConsole.') && !line.includes('ENABLE_LOGGING')) {
        this.warnings.push({
          file: relativePath,
          line: lineNumber,
          type: 'bypass-logging',
          message: 'originalConsole usage should be wrapped in ENABLE_LOGGING check',
          code: line.trim()
        });
      }
    });
  }

  validateGoFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const relativePath = path.relative(projectRoot, filePath);

    lines.forEach((line, index) => {
      const lineNumber = index + 1;

      // Check for fmt.Printf debug statements not wrapped in VERBOSE_DEBUG
      if (line.includes('fmt.Printf') &&
          (line.includes('[DEBUG]') || line.includes('🔍')) &&
          !line.includes('VERBOSE_DEBUG')) {

        // Look ahead/behind for VERBOSE_DEBUG check
        const contextStart = Math.max(0, index - 3);
        const contextEnd = Math.min(lines.length, index + 4);
        const context = lines.slice(contextStart, contextEnd).join('\n');

        if (!context.includes('VERBOSE_DEBUG')) {
          this.errors.push({
            file: relativePath,
            line: lineNumber,
            type: 'unwrapped-debug',
            message: 'Debug fmt.Printf should use debugLogf() or be wrapped in VERBOSE_DEBUG check',
            code: line.trim()
          });
        }
      }

      // Check for debugLogf without proper format
      if (line.includes('debugLogf') && !line.includes('%')) {
        // debugLogf with no format specifiers should use debugLog instead
        this.warnings.push({
          file: relativePath,
          line: lineNumber,
          type: 'incorrect-debug-func',
          message: 'Use debugLog() for simple messages, debugLogf() for formatted messages',
          code: line.trim()
        });
      }
    });
  }

  walkDirectory(dir) {
    const items = fs.readdirSync(dir);

    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        // Skip node_modules and other irrelevant directories
        if (!item.startsWith('.') &&
            item !== 'node_modules' &&
            item !== 'dist' &&
            item !== 'coverage') {
          this.walkDirectory(fullPath);
        }
      } else if (stat.isFile()) {
        const ext = path.extname(fullPath);

        if (config.jsExtensions.includes(ext)) {
          this.validateJavaScriptFile(fullPath);
          this.checkedFiles++;
        } else if (config.goExtensions.includes(ext)) {
          this.validateGoFile(fullPath);
          this.checkedFiles++;
        }
      }
    }
  }

  validate() {
    console.log('🔍 Validating logging best practices...\n');

    for (const dir of config.checkDirs) {
      const fullDir = path.join(projectRoot, dir);
      if (fs.existsSync(fullDir)) {
        this.walkDirectory(fullDir);
      }
    }

    this.printResults();
    return this.errors.length === 0;
  }

  printResults() {
    console.log(`📊 Checked ${this.checkedFiles} files\n`);

    if (this.errors.length > 0) {
      console.log('❌ ERRORS:');
      this.errors.forEach(error => {
        console.log(`  ${error.file}:${error.line} - ${error.message}`);
        console.log(`    ${error.code}`);
        console.log();
      });
    }

    if (this.warnings.length > 0) {
      console.log('⚠️  WARNINGS:');
      this.warnings.forEach(warning => {
        console.log(`  ${warning.file}:${warning.line} - ${warning.message}`);
        console.log(`    ${warning.code}`);
        console.log();
      });
    }

    if (this.errors.length === 0 && this.warnings.length === 0) {
      console.log('✅ All logging practices look good!');
    } else {
      console.log(`\n📋 Summary: ${this.errors.length} errors, ${this.warnings.length} warnings`);

      if (this.errors.length > 0) {
        console.log('\n💡 Common fixes:');
        console.log('  • Replace console.log() with logger.info()');
        console.log('  • Replace console.error() with logger.error()');
        console.log('  • Wrap Go fmt.Printf debug statements with debugLogf()');
        console.log('  • Check WASM worker logging uses ENABLE_LOGGING flag');
      }
    }
  }
}

// Run validation
const validator = new LoggingValidator();
const success = validator.validate();

// Exit with error code if validation failed
if (!success) {
  process.exit(1);
}