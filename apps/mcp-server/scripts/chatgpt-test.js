#!/usr/bin/env node
/**
 * ChatGPT Testing Server
 *
 * Starts all services needed for testing the AreumFire widget in ChatGPT Apps.
 *
 * Usage:
 *   npm run chatgpt          # Local only
 *   npm run chatgpt:tunnel   # With ngrok tunnel for ChatGPT access
 *
 * Services started:
 *   - Simulation Service (port 3002) - WASM engine
 *   - MCP SSE Server (port 8000) - ChatGPT Apps endpoint at /mcp
 *
 * FOOLPROOF FEATURES:
 *   - Auto-rebuilds WASM if Go sources are newer than binary
 *   - Tests actual simulation (not just health check) before accepting
 *   - Watchdog auto-restarts stuck services every 60s
 */

import { spawn, exec, execSync } from 'child_process';
import { createServer } from 'http';
import { readFileSync, existsSync, statSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '../../..');
const MCP_SERVER = join(__dirname, '..');
const SIM_SERVICE = join(ROOT, 'services/simulation-service');

const SIM_PORT = 3002;      // Simulation service (internal)
const MCP_PORT = 8000;      // MCP SSE server (ChatGPT connects here)
const USE_TUNNEL = process.argv.includes('--tunnel');
const SKIP_WASM_CHECK = process.argv.includes('--skip-wasm-check');

// Canonical WASM location (single source of truth)
const WASM_DIR = join(ROOT, 'wasm');
const WASM_BINARY = join(ROOT, 'public/pathfinder.wasm');
const WASM_EXEC = join(ROOT, 'public/wasm_exec.js');

// Colors for terminal output
const c = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
};

function log(prefix, msg, color = c.reset) {
  console.log(`${color}[${prefix}]${c.reset} ${msg}`);
}

// =============================================================================
// WASM FRESHNESS CHECK - Prevents stale binary issues
// =============================================================================

/**
 * Get the newest modification time of all Go source files in wasm/
 */
function getNewestGoSourceTime() {
  const goFiles = readdirSync(WASM_DIR).filter((f) => f.endsWith('.go'));
  let newest = 0;

  for (const file of goFiles) {
    const filePath = join(WASM_DIR, file);
    const stat = statSync(filePath);
    if (stat.mtimeMs > newest) {
      newest = stat.mtimeMs;
    }
  }

  return newest;
}

/**
 * Check if WASM binary exists and is newer than all Go sources
 */
function isWasmFresh() {
  if (!existsSync(WASM_BINARY)) {
    return { fresh: false, reason: 'WASM binary does not exist' };
  }

  const wasmStat = statSync(WASM_BINARY);
  const wasmTime = wasmStat.mtimeMs;
  const newestSource = getNewestGoSourceTime();

  if (newestSource > wasmTime) {
    const wasmDate = new Date(wasmTime).toLocaleString();
    const sourceDate = new Date(newestSource).toLocaleString();
    return {
      fresh: false,
      reason: `Go sources (${sourceDate}) are newer than WASM binary (${wasmDate})`,
    };
  }

  return { fresh: true };
}

/**
 * Rebuild WASM binary from Go sources
 */
async function rebuildWasm() {
  log('WASM', 'Rebuilding WASM from Go sources...', c.yellow);

  return new Promise((resolve, reject) => {
    const build = spawn('npm', ['run', 'build:wasm'], {
      cwd: ROOT,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let output = '';
    build.stdout.on('data', (d) => {
      output += d.toString();
      // Show progress
      const line = d.toString().trim();
      if (line.includes('✓') || line.includes('Building')) {
        log('WASM', line, c.dim);
      }
    });
    build.stderr.on('data', (d) => {
      output += d.toString();
    });

    build.on('close', (code) => {
      if (code === 0) {
        log('WASM', 'WASM rebuild successful', c.green);
        resolve(true);
      } else {
        log('WASM', `WASM rebuild failed (exit code ${code})`, c.yellow);
        console.error(output);
        reject(new Error('WASM build failed'));
      }
    });

    build.on('error', (err) => {
      log('WASM', `Failed to start build: ${err.message}`, c.yellow);
      reject(err);
    });
  });
}

/**
 * Ensure WASM is fresh before starting services
 * This is the FOOLPROOF check that prevents stale binary issues
 */
async function ensureWasmFresh() {
  if (SKIP_WASM_CHECK) {
    log('WASM', 'Skipping freshness check (--skip-wasm-check)', c.dim);
    return;
  }

  log('WASM', 'Checking WASM freshness...', c.dim);

  const { fresh, reason } = isWasmFresh();

  if (!fresh) {
    log('WASM', `WASM is stale: ${reason}`, c.yellow);
    await rebuildWasm();
  } else {
    log('WASM', 'WASM binary is up to date', c.green);
  }
}

// =============================================================================

// Check if port is in use
function checkPort(port) {
  return new Promise((resolve) => {
    const server = createServer();
    server.once('error', () => resolve(true));
    server.once('listening', () => {
      server.close();
      resolve(false);
    });
    server.listen(port);
  });
}

// Test if simulation service is actually working (not just health check)
async function testSimulationService() {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(`http://localhost:${SIM_PORT}/simulate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        packetBuildRequest: {
          seed: 1,
          startYear: 2026,
          mcPaths: 1,
          horizonMonths: 12,
          investableAssets: 100000,
          annualSpending: 30000,
          currentAge: 35,
          expectedIncome: 60000,
          verbosity: 'summary',
        },
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) return false;
    const data = await response.json();
    return data.success === true;
  } catch (err) {
    clearTimeout(timeoutId);
    return false;
  }
}

// Start simulation service (WASM engine)
async function startSimService() {
  const inUse = await checkPort(SIM_PORT);
  if (inUse) {
    log('SIM', `Port ${SIM_PORT} already in use - checking if responsive...`, c.yellow);
    const isWorking = await testSimulationService();
    if (isWorking) {
      log('SIM', `Existing service is responsive`, c.green);
      return null;
    }
    log('SIM', `Existing service is NOT responsive - killing and restarting`, c.yellow);
    // Kill the stuck process
    try {
      exec(`fuser -k ${SIM_PORT}/tcp 2>/dev/null || lsof -ti:${SIM_PORT} | xargs kill -9 2>/dev/null || true`);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (e) { /* ignore */ }
  }

  log('SIM', `Starting simulation service on port ${SIM_PORT}...`, c.green);
  const proc = spawn('node', ['src/server.js'], {
    cwd: SIM_SERVICE,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  proc.stdout.on('data', (d) => log('SIM', d.toString().trim(), c.dim));
  proc.stderr.on('data', (d) => log('SIM', d.toString().trim(), c.dim));

  // Wait for service to be ready with proper health check
  log('SIM', `Waiting for WASM initialization...`, c.dim);
  for (let i = 0; i < 30; i++) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    try {
      const resp = await fetch(`http://localhost:${SIM_PORT}/health`);
      if (resp.ok) {
        const data = await resp.json();
        if (data.wasmReady) {
          // Now test an actual simulation
          const simWorks = await testSimulationService();
          if (simWorks) {
            log('SIM', `Service ready and simulation working`, c.green);
            return proc;
          }
        }
      }
    } catch (e) { /* still starting */ }
  }

  log('SIM', `Service startup timeout - check logs`, c.yellow);
  return proc;
}

// Start MCP SSE server (ChatGPT endpoint)
async function startMcpServer() {
  const inUse = await checkPort(MCP_PORT);
  if (inUse) {
    log('MCP', `Port ${MCP_PORT} already in use - assuming server is running`, c.yellow);
    return null;
  }

  log('MCP', `Starting MCP SSE server on port ${MCP_PORT}...`, c.green);
  const proc = spawn('node', ['dist/server.js'], {
    cwd: MCP_SERVER,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, PORT: String(MCP_PORT) },
  });

  proc.stdout.on('data', (d) => log('MCP', d.toString().trim(), c.dim));
  proc.stderr.on('data', (d) => log('MCP', d.toString().trim(), c.dim));

  // Wait for server to be ready
  await new Promise((resolve) => setTimeout(resolve, 1000));
  return proc;
}

// Start ngrok tunnel (tunnels MCP server for ChatGPT access)
async function startTunnel() {
  log('TUNNEL', `Starting ngrok tunnel to port ${MCP_PORT}...`, c.cyan);

  return new Promise((resolve, reject) => {
    const proc = spawn('ngrok', ['http', String(MCP_PORT), '--log=stdout'], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let resolved = false;
    proc.stdout.on('data', (d) => {
      const line = d.toString();
      const match = line.match(/url=(https:\/\/[^\s]+)/);
      if (match && !resolved) {
        resolved = true;
        resolve({ proc, url: match[1] });
      }
    });

    proc.stderr.on('data', (d) => {
      if (!resolved) {
        log('TUNNEL', d.toString().trim(), c.yellow);
      }
    });

    proc.on('error', (err) => {
      if (!resolved) {
        log('TUNNEL', `ngrok not found. Install with: brew install ngrok`, c.yellow);
        resolve({ proc: null, url: null });
      }
    });

    // Timeout fallback
    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        resolve({ proc, url: null });
      }
    }, 5000);
  });
}

// Watchdog: check if simulation service is still responsive
async function watchdogCheck(procs) {
  const isWorking = await testSimulationService();
  if (!isWorking) {
    log('WATCHDOG', `Simulation service unresponsive - restarting...`, c.yellow);

    // Kill any stuck process
    try {
      exec(`fuser -k ${SIM_PORT}/tcp 2>/dev/null || lsof -ti:${SIM_PORT} | xargs kill -9 2>/dev/null || true`);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (e) { /* ignore */ }

    // Restart simulation service
    const newProc = await startSimService();
    if (newProc) {
      // Replace old proc in array
      const oldIndex = procs.findIndex((p) => p && p.pid);
      if (oldIndex >= 0) {
        procs[oldIndex] = newProc;
      } else {
        procs.push(newProc);
      }
      log('WATCHDOG', `Simulation service restarted`, c.green);
    }
  }
}

// Main
async function main() {
  console.log('\n' + c.blue + '═'.repeat(50) + c.reset);
  console.log(c.blue + '  AreumFire ChatGPT Testing Server' + c.reset);
  console.log(c.blue + '═'.repeat(50) + c.reset + '\n');

  // FOOLPROOF: Ensure WASM is fresh before starting anything
  await ensureWasmFresh();

  const procs = [];

  // Start simulation service first (MCP server depends on it)
  const simProc = await startSimService();
  if (simProc) procs.push(simProc);

  // Start MCP SSE server (ChatGPT connects here)
  const mcpProc = await startMcpServer();
  if (mcpProc) procs.push(mcpProc);

  let tunnelUrl = null;
  if (USE_TUNNEL) {
    const { proc, url } = await startTunnel();
    if (proc) procs.push(proc);
    tunnelUrl = url;
  }

  // Print summary
  console.log('\n' + c.green + '✓ Services running:' + c.reset);
  console.log(`  ${c.cyan}Simulation API:${c.reset}  http://localhost:${SIM_PORT}/simulate (internal)`);
  console.log(`  ${c.cyan}MCP Endpoint:${c.reset}    http://localhost:${MCP_PORT}/mcp`);
  console.log(`  ${c.cyan}Widget Test:${c.reset}     http://localhost:${MCP_PORT}/test`);
  console.log(`  ${c.cyan}Health Check:${c.reset}    http://localhost:${MCP_PORT}/health`);

  if (tunnelUrl) {
    console.log(`\n  ${c.cyan}Public URL:${c.reset}      ${tunnelUrl}`);
    console.log(`\n  ${c.yellow}ChatGPT App Configuration:${c.reset}`);
    console.log(`  ${c.green}Server URL:${c.reset} ${tunnelUrl}/mcp`);
  } else if (USE_TUNNEL) {
    console.log(`\n  ${c.yellow}Tunnel failed to start. Check ngrok installation.${c.reset}`);
  }

  console.log(`\n${c.dim}Press Ctrl+C to stop all services${c.reset}`);
  console.log(`${c.dim}Watchdog checks every 60s for stuck services${c.reset}\n`);

  // Start watchdog - check every 60 seconds
  const watchdogInterval = setInterval(() => {
    watchdogCheck(procs).catch((e) => log('WATCHDOG', `Error: ${e.message}`, c.yellow));
  }, 60000);

  // Handle shutdown
  process.on('SIGINT', () => {
    console.log('\n\nShutting down...');
    clearInterval(watchdogInterval);
    procs.forEach((p) => p && p.kill());
    process.exit(0);
  });

  // Keep alive
  await new Promise(() => {});
}

main().catch(console.error);
