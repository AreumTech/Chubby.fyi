/// <reference types="vitest" />
import path from "path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { visualizer } from "rollup-plugin-visualizer";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");
  const isProduction = mode === "production";
  const analyze = env.ANALYZE === "true";
  
  return {
    define: {
      "process.env.API_KEY": JSON.stringify(env.GEMINI_API_KEY),
      "process.env.GEMINI_API_KEY": JSON.stringify(env.GEMINI_API_KEY),
    },
    server: {
      port: 5174,
      open: '/app',
      hmr: {
        overlay: true, // Set to false to disable Vite's error overlay
      },
    },
    resolve: {
      alias: {
        "@": path.resolve(process.cwd(), "src"),
      },
    },
    worker: {
      format: "es",
      rollupOptions: {
        external: ["worker_threads"],
      },
    },
    build: {
      rollupOptions: {
        external: ['/pathfinder.wasm', '/wasm_exec.js'], // Don't bundle WASM files
        output: {
          manualChunks: (id) => {
            // Vendor chunks
            if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
              return 'vendor-react';
            }
            if (id.includes('node_modules/react-router-dom')) {
              return 'vendor-router';
            }
            if (id.includes('node_modules/i18next') || 
                id.includes('node_modules/react-i18next') || 
                id.includes('node_modules/i18next-browser-languagedetector')) {
              return 'vendor-i18n';
            }
            if (id.includes('node_modules/@heroicons/react')) {
              return 'vendor-ui';
            }
            if (id.includes('node_modules/zustand') || 
                id.includes('node_modules/ajv')) {
              return 'vendor-utils';
            }
            
            // App chunks - split by major features
            if (id.includes('/src/store/') || 
                id.includes('/src/commands/')) {
              return 'app-core';
            }
            if (id.includes('/src/components/layout/') ||
                id.includes('/src/components/Modal') ||
                id.includes('/src/components/ErrorBoundary')) {
              return 'app-components';
            }
            if (id.includes('/src/features/deep-dive/')) {
              return 'app-deep-dive';
            }
            if (id.includes('/src/features/mobile/')) {
              return 'app-mobile';
            }
            if (id.includes('/src/features/dashboard/')) {
              return 'app-dashboard';
            }
            if (id.includes('/src/features/event-timeline/')) {
              return 'app-events';
            }
          }
        }
      },
      chunkSizeWarningLimit: 500, // Warn at 500KB instead of default 500KB
      target: 'esnext',
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: isProduction,
          drop_debugger: isProduction,
        },
      },
    },
    plugins: [
      react(),
      ...(analyze ? [
        visualizer({
          filename: 'dist/bundle-analysis.html',
          open: true,
          gzipSize: true,
          brotliSize: true,
        })
      ] : [])
    ],
    test: {
      globals: true,
      environment: "jsdom",
      setupFiles: ["./vitest.setup.ts"],
      include: [
        "src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
        "tests/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
        "*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
      ],
      exclude: [
        "**/node_modules/**",
        "**/tests/e2e/**",
        "**/*.e2e.*",
        "**/playwright/**",
      ],
    },
  };
});
