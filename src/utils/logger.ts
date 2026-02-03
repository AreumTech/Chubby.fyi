/**
 * Enhanced logger with dual-output strategy:
 * 1. Clean, real-time console output with configurable verbosity
 * 2. Persistent in-memory log buffer for debugging and analysis
 */

export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error';
export type LogCategory = 'WASM' | 'UI' | 'PERFORMANCE' | 'SIMULATION' | 'COMMAND' | 'DATA' | 'ERROR' | 'GENERAL';

export interface LogEntry {
  id: string;
  timestamp: number;
  level: LogLevel;
  category: LogCategory;
  message: string;
  args: any[];
  stack?: string;
}

// Build-time constants
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const IS_TEST = process.env.NODE_ENV === 'test';

// Runtime detection for Playwright automation
const IS_PLAYWRIGHT = typeof window !== 'undefined' && (
  (window as any).__playwright !== undefined ||
  (window as any).playwright !== undefined ||
  navigator.userAgent.includes('HeadlessChrome') ||
  (window as any).__webdriver === true ||
  (navigator as any).webdriver === true
);

// In-memory ring buffer for persistent logging
const MAX_BUFFER_SIZE = 2000;
const logBuffer: LogEntry[] = [];
let logIdCounter = 0;

// Console output configuration (runtime configurable)
let consoleLogLevel: LogLevel = 'info'; // Default console level
let isQuietMode = false;

// Simulation verbosity level (controls WASM simulation logging detail)
let simulationVerbosity: number = 3; // Default: PATH (summary only)

// Log level hierarchy for filtering
const LOG_LEVELS: Record<LogLevel, number> = {
  'trace': 0,
  'debug': 1,
  'info': 2,
  'warn': 3,
  'error': 4
};

/**
 * Add entry to persistent buffer (always happens regardless of console level)
 */
function addToBuffer(level: LogLevel, category: LogCategory, message: string, args: any[]): void {
  const entry: LogEntry = {
    id: `log_${++logIdCounter}`,
    timestamp: Date.now(),
    level,
    category,
    message,
    args: args.length > 0 ? [...args] : [],
    stack: level === 'error' ? new Error().stack : undefined
  };

  logBuffer.push(entry);

  // Maintain ring buffer size
  if (logBuffer.length > MAX_BUFFER_SIZE) {
    logBuffer.shift();
  }
}

/**
 * Determine if a log should be output to console based on current level
 */
function shouldLogToConsole(level: LogLevel): boolean {
  if (IS_PRODUCTION) return level === 'error'; // Production: only errors
  if (IS_TEST) return false; // Tests: completely silent
  if (isQuietMode && level !== 'error') return false; // Quiet mode: only errors
  if (IS_PLAYWRIGHT && LOG_LEVELS[level] < LOG_LEVELS['warn']) return false; // Playwright: warn+ only

  return LOG_LEVELS[level] >= LOG_LEVELS[consoleLogLevel];
}

/**
 * Core logging function that handles both buffer and console output
 */
function log(level: LogLevel, category: LogCategory, message: string, ...args: any[]): void {
  // Always add to persistent buffer
  addToBuffer(level, category, message, args);

  // Conditionally output to console
  if (shouldLogToConsole(level)) {
    const prefix = `[${category}]`;

    switch (level) {
      case 'trace':
      case 'debug':
        console.debug(prefix, message, ...args);
        break;
      case 'info':
        console.info(prefix, message, ...args);
        break;
      case 'warn':
        console.warn(prefix, message, ...args);
        break;
      case 'error':
        console.error(prefix, message, ...args);
        break;
    }
  }
}

/**
 * Set console output verbosity level
 */
function setConsoleLevel(level: LogLevel): void {
  consoleLogLevel = level;
  console.info(`[LOGGER] Console log level set to: ${level}`);
}

/**
 * Set simulation verbosity level (controls WASM logging detail)
 * @param level 0=VERBOSE, 1=EVENT, 2=MONTHLY, 3=PATH
 */
async function setSimulationVerbosity(level: number): Promise<void> {
  if (level < 0 || level > 3) {
    console.error(`[LOGGER] Invalid simulation verbosity level: ${level}. Must be 0-3.`);
    return;
  }

  simulationVerbosity = level;

  const levelNames = {
    0: 'VERBOSE (full debug)',
    1: 'EVENT (one line per event)',
    2: 'MONTHLY (monthly summaries)',
    3: 'PATH (path summaries only)'
  };

  console.info(`[LOGGER] Simulation verbosity set to level ${level}: ${levelNames[level as keyof typeof levelNames]}`);

  // Set verbosity on main thread WASM instance if available
  if (typeof (window as any).setSimulationVerbosity === 'function') {
    const mainThreadResult = (window as any).setSimulationVerbosity(level);
    console.info(`[LOGGER] Main thread WASM verbosity updated:`, mainThreadResult);
  }

  // Send message to all WASM workers to update verbosity
  try {
    const { wasmWorkerPool } = await import('../services/wasmWorkerPool');
    await wasmWorkerPool.broadcastToAll({
      type: 'SET_SIMULATION_VERBOSITY',
      payload: { level }
    });
    console.info(`[LOGGER] Successfully updated all workers to verbosity level ${level}`);
  } catch (error) {
    console.error('[LOGGER] Failed to update WASM simulation verbosity:', error);
  }
}

/**
 * Get current simulation verbosity level
 */
function getSimulationVerbosity(): number {
  return simulationVerbosity;
}

/**
 * Export logs as downloadable file
 */
function exportLogs(): void {
  const logData = {
    exportTimestamp: new Date().toISOString(),
    environment: IS_PRODUCTION ? 'production' : IS_TEST ? 'test' : 'development',
    totalLogs: logBuffer.length,
    logs: logBuffer
  };

  const blob = new Blob([JSON.stringify(logData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `pathfinder-logs-${new Date().toISOString().slice(0, 19)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  console.info(`[LOGGER] Exported ${logBuffer.length} log entries`);
}

// Main logger interface
export const logger = {
  // Standard log levels
  trace: (message: string, ...args: any[]) => log('trace', 'GENERAL', message, ...args),
  debug: (message: string, ...args: any[]) => log('debug', 'GENERAL', message, ...args),
  info: (message: string, ...args: any[]) => log('info', 'GENERAL', message, ...args),
  warn: (message: string, ...args: any[]) => log('warn', 'GENERAL', message, ...args),
  error: (message: string, ...args: any[]) => log('error', 'ERROR', message, ...args),

  // Category-specific methods (maintain compatibility)
  wasmLog: (message: string, ...args: any[]) => log('debug', 'WASM', message, ...args),
  performanceLog: (message: string, ...args: any[]) => log('debug', 'PERFORMANCE', message, ...args),
  simulationLog: (message: string, ...args: any[]) => log('debug', 'SIMULATION', message, ...args),
  commandLog: (message: string, ...args: any[]) => log('info', 'COMMAND', message, ...args),
  dataLog: (message: string, ...args: any[]) => log('debug', 'DATA', message, ...args),

  // Buffer management
  getLogs: (): readonly LogEntry[] => [...logBuffer],
  clearLogs: (): void => {
    logBuffer.length = 0;
    logIdCounter = 0;
    console.info('[LOGGER] Log buffer cleared');
  },
  exportLogs,

  // Configuration
  setConsoleLevel,
  setSimulationVerbosity,
  getSimulationVerbosity,
  getConfig: () => ({
    environment: IS_PRODUCTION ? 'production' : IS_TEST ? 'test' : 'development',
    isPlaywright: IS_PLAYWRIGHT,
    consoleLevel: consoleLogLevel,
    simulationVerbosity,
    bufferSize: logBuffer.length,
    maxBufferSize: MAX_BUFFER_SIZE,
    isQuietMode
  }),

  // Compatibility methods
  setLevel: setConsoleLevel, // Alias for backwards compatibility
  enableCategory: () => {}, // No-op for compatibility
  disableCategory: () => {} // No-op for compatibility
};

// Development-time browser console API
if (!IS_PRODUCTION && !IS_TEST && typeof window !== 'undefined') {
  // Core logger controls
  (window as any).appLogger = logger;
  (window as any).setLogLevel = setConsoleLevel;

  // Quick log level presets
  (window as any).logTrace = () => setConsoleLevel('trace');
  (window as any).logDebug = () => setConsoleLevel('debug');
  (window as any).logInfo = () => setConsoleLevel('info');
  (window as any).logWarn = () => setConsoleLevel('warn');
  (window as any).logError = () => setConsoleLevel('error');
  (window as any).logSilent = () => {
    isQuietMode = true;
    console.info('[LOGGER] Silent mode enabled - only errors to console');
  };

  // Help command
  (window as any).logHelp = () => {
    console.info(`
%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PathFinder Pro Logging Console API
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

%cUI Log Level Controls:%c
  logTrace()        - Set to TRACE level (most verbose)
  logDebug()        - Set to DEBUG level
  logInfo()         - Set to INFO level (default)
  logWarn()         - Set to WARN level
  logError()        - Set to ERROR level only
  logSilent()       - Suppress all console output (errors only)

%cSimulation Verbosity Controls:%c
  simVerbose()      - Level 0: Full debug (every calculation, state change)
  simEvent()        - Level 1: One line per event (summary of outcomes)
  simMonthly()      - Level 2: Monthly summaries (aggregated statistics)
  simPath()         - Level 3: Path summaries only (final results) [DEFAULT]
  simStatus()       - Show current simulation verbosity level

%cLog Inspection:%c
  logStats()        - Display logging statistics table
  logRecent(n)      - Show last n log entries (default: 10)
  logSearch(term)   - Search logs for specific terms

%cLog Management:%c
  appLogger.clearLogs()     - Clear the log buffer
  appLogger.exportLogs()    - Download logs as JSON
  appLogger.getConfig()     - Show current logger configuration

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `,
      'color: #00d9ff; font-weight: bold',
      'color: #ffaa00; font-weight: bold', 'color: inherit',
      'color: #00ff88; font-weight: bold', 'color: inherit',
      'color: #ff88ff; font-weight: bold', 'color: inherit',
      'color: #88aaff; font-weight: bold', 'color: inherit'
    );
  };

  // Simulation verbosity controls
  (window as any).simVerbose = () => setSimulationVerbosity(0);
  (window as any).simEvent = () => setSimulationVerbosity(1);
  (window as any).simMonthly = () => setSimulationVerbosity(2);
  (window as any).simPath = () => setSimulationVerbosity(3);
  (window as any).simStatus = () => {
    const level = getSimulationVerbosity();
    const names = ['VERBOSE', 'EVENT', 'MONTHLY', 'PATH'];
    console.info(`[LOGGER] Current simulation verbosity: Level ${level} (${names[level]})`);
    return { level, name: names[level] };
  };

  // Debugging utilities
  (window as any).logStats = () => {
    const logs = logger.getLogs();
    const stats = logs.reduce((acc, log) => {
      acc[log.level] = (acc[log.level] || 0) + 1;
      acc[log.category] = (acc[log.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.table(stats);
    console.info(`Total logs in buffer: ${logs.length}/${MAX_BUFFER_SIZE}`);
    return stats;
  };

  (window as any).logRecent = (count: number = 10) => {
    const recent = logger.getLogs().slice(-count);
    console.table(recent.map(log => ({
      time: new Date(log.timestamp).toLocaleTimeString(),
      level: log.level,
      category: log.category,
      message: log.message.substring(0, 50) + (log.message.length > 50 ? '...' : '')
    })));
    return recent;
  };

  (window as any).logSearch = (query: string) => {
    const matches = logger.getLogs().filter(log =>
      log.message.toLowerCase().includes(query.toLowerCase()) ||
      log.category.toLowerCase().includes(query.toLowerCase())
    );
    console.table(matches.map(log => ({
      time: new Date(log.timestamp).toLocaleTimeString(),
      level: log.level,
      category: log.category,
      message: log.message
    })));
    return matches;
  };

  // Auto-silence during Playwright if detected
  if (IS_PLAYWRIGHT) {
    isQuietMode = true;
    console.error('🎭 [LOGGER] Playwright detected - console output minimized');
  }

  // Only show this message if console level is debug or trace
  if (LOG_LEVELS[consoleLogLevel] <= LOG_LEVELS['debug']) {
    console.info('[LOGGER] Enhanced logging system ready. Try: setLogLevel("debug"), logStats(), logRecent()');
  }
}