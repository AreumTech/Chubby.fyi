import js from "@eslint/js";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";

export default [
  {
    ignores: [
      "dist/**",
      "public/wasm_exec.js",
      "wasm/wasm_exec.js",
      "**/*wasm_exec.js",
      "public/**",
      "test-results/**",
      "node_modules/**",
      // Migrated from .eslintrc.json
      "tests/e2e/**",
      "playwright.config.cjs",
      "**/*.cjs",
      "App.integration.test.tsx",
      "components/charts/NetWorthCanvasChart.test.tsx",
    ],
  },
  js.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2021,
        sourceType: "module",
        ecmaFeatures: { jsx: true },
        project: "./tsconfig.json",
      },
      globals: {
        window: "readonly",
        document: "readonly",
        localStorage: "readonly",
        sessionStorage: "readonly",
        console: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly", // Added clearTimeout
        alert: "readonly",
        confirm: "readonly",
        self: "readonly",
        process: "readonly",
        performance: "readonly",
        navigator: "readonly",
        describe: "readonly",
        it: "readonly",
        test: "readonly",
        expect: "readonly",
        jest: "readonly",
        beforeAll: "readonly",
        afterAll: "readonly",
        beforeEach: "readonly",
        afterEach: "readonly",
        vi: "readonly",
        vitest: "readonly",
        global: "readonly",
        module: "readonly",
        require: "readonly",
        fetch: "readonly",
        NodeJS: "readonly",
        React: "readonly",
        cancelAnimationFrame: "readonly",
        requestAnimationFrame: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        WebAssembly: "readonly",
        AccountHoldingsManager: "readonly",
      },
    },
    plugins: {
      "@typescript-eslint": tseslint,
      react,
      "react-hooks": reactHooks,
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      "no-use-before-define": "off",
      "@typescript-eslint/no-use-before-define": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "no-case-declarations": "off",
      "react/jsx-no-undef": "off",
      "@typescript-eslint/ban-ts-comment": "off",
      "@typescript-eslint/no-duplicate-enum-values": "off",
      "no-prototype-builtins": "off",
      "react/react-in-jsx-scope": "off",
      // Rules migrated from .eslintrc.json
      "react/prop-types": "off",
      "no-constant-condition": "off",
      "@typescript-eslint/no-var-requires": "off",
      // Enforce use of logger instead of console (allows warn/error for critical issues)
      "no-console": ["error", { allow: ["warn", "error"] }],
      // WASM Boundary Enforcement - all WASM calls must go through wasmBridge.ts
      // See: docs/WASM_BRIDGE_MIGRATION.md
      "no-restricted-syntax": [
        "warn", // Start as warning during migration, change to "error" when complete
        {
          selector: "MemberExpression[object.type='TSAsExpression'][object.expression.name='window'] > Identifier[name=/^(run|go)[A-Z]/]",
          message: "Direct WASM call detected. Use wasmBridge.ts instead. See docs/WASM_BRIDGE_MIGRATION.md"
        },
        {
          selector: "CallExpression[callee.object.type='TSAsExpression'][callee.property.name=/^run.*Simulation/]",
          message: "Direct WASM simulation call detected. Use wasmBridge.ts instead."
        }
      ],
    },
    settings: {
      react: { version: "detect" },
    },
  },
  {
    // Configuration for JavaScript files without TypeScript project parsing
    files: ["**/*.{js,jsx,mjs,cjs}"],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: "module",
      globals: {
        window: "readonly",
        document: "readonly",
        localStorage: "readonly",
        sessionStorage: "readonly",
        console: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        alert: "readonly",
        confirm: "readonly",
        self: "readonly",
        process: "readonly",
        performance: "readonly",
        navigator: "readonly",
        describe: "readonly",
        it: "readonly",
        test: "readonly",
        expect: "readonly",
        jest: "readonly",
        beforeAll: "readonly",
        afterAll: "readonly",
        beforeEach: "readonly",
        afterEach: "readonly",
        vi: "readonly",
        vitest: "readonly",
        global: "readonly",
        module: "readonly",
        require: "readonly",
        fetch: "readonly",
        NodeJS: "readonly",
        React: "readonly",
        cancelAnimationFrame: "readonly",
        requestAnimationFrame: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        WebAssembly: "readonly",
        AccountHoldingsManager: "readonly",
      },
    },
    rules: {
      "no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  {
    // Exception for logger.ts and error boundary files that need console access
    files: [
      "**/logger.ts",
      "**/EnhancedErrorBoundary.tsx",
      "**/fileLogger.ts",
      "index.tsx",
      "vitest.setup.ts",
      "**/TestHarness.tsx",
      "**/*.test.{ts,tsx,js,jsx}",
      "**/*.spec.{ts,tsx,js,jsx}",
      "**/test-*.{ts,tsx,js,jsx}",
      "**/*debug*.{ts,tsx,js,jsx}",
      "**/tests/**/*.{ts,tsx,js,jsx}"
    ],
    rules: {
      "no-console": "off", // Allow console in logger and error handling files
    },
  },
  {
    // WASM Boundary Exception - these files ARE allowed to call window.wasm* directly
    // All other files must use wasmBridge.ts
    files: [
      "**/wasmBridge.ts",
      "**/wasmMainThreadLoader.ts",
      "**/wasmSimulation.ts",
      "**/wasmWorkerPool.ts",
      "**/simulationOrchestrator.ts", // During migration - remove when migrated
      "**/simulationOrchestrator.pure.ts",
      "**/mainThreadWasmService.ts",
      "**/fallbackSimulation.ts",
    ],
    rules: {
      "no-restricted-syntax": "off", // Allow direct WASM calls in bridge files
    },
  },
];
