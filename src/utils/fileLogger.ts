// Simple browser-compatible file logger
class FileLogger {
  private logs: string[] = [];
  
  constructor() {
    // Only log if needed for debugging - reduced startup noise
    if (process.env.NODE_ENV === 'development' &&
        (window as any).__fileLoggerDebug) {
      console.log('🚨 [LOGGER] FileLogger initialized');
    }
  }

  log(message: string, source: string = 'MAIN'): void {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${source}] ${message}`;
    
    // Store in memory
    this.logs.push(logEntry);
    
    // Keep only last 100 entries
    if (this.logs.length > 100) {
      this.logs = this.logs.slice(-50);
    }
    
    // ONLY console log employment income debug messages
    if (message.includes('EMPLOYMENT-INCOME-TEST') || 
        message.includes('INCOME-HANDLER') || 
        message.includes('MONTHLY-DATA-DEBUG') ||
        message.includes('EMPLOYMENT-BUG') ||
        message.includes('VALIDATION-DEBUG')) {
      console.log(`🚨 [DEBUG] ${logEntry}`);
    }
    
    // ALWAYS write to debug.log file using File System Access API (if available)
    this.writeToFile(logEntry);
  }

  private async writeToFile(entry: string): Promise<void> {
    try {
      // Use File System Access API if available (Chrome 86+)
      if ('showSaveFilePicker' in window) {
        // For now, just append to localStorage as fallback
        const existing = localStorage.getItem('debug_logs') || '';
        localStorage.setItem('debug_logs', existing + entry + '\n');
      }
    } catch (error) {
      // Silently fail - file writing is optional
    }
  }

  getLogs(): string[] {
    return [...this.logs];
  }

  getLogsAsString(): string {
    return this.logs.join('\n');
  }

  clear(): void {
    this.logs = [];
    localStorage.removeItem('debug_logs');
  }

  getRecentLogs(count: number = 50): string[] {
    return this.logs.slice(-count);
  }

  // Export logs to downloadable file
  exportLogs(): void {
    const content = this.getLogsAsString();
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'debug.log';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

// Export instances
export const fileLogger = new FileLogger();
export const logger = fileLogger; // Legacy alias

// Simple search function
export const searchDebugLogs = (query: string) => {
  return fileLogger.getLogs().filter(log => log.toLowerCase().includes(query.toLowerCase()));
};

// Simple export function
export const exportDebugLogs = () => {
  return fileLogger.getLogsAsString();
};

// Make available globally for debugging
if (typeof window !== 'undefined') {
  (window as any).fileLogger = fileLogger;
}