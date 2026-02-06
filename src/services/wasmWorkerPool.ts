/**
 * WASM WebWorker Pool Manager
 * 
 * Manages a pool of WebWorkers running WASM simulation instances
 * for parallel processing without blocking the main UI thread.
 */

import { AppConfig, SimulationEvent, AccountHoldingsMonthEnd } from '@/types';
import { DEFAULT_STOCHASTIC_CONFIG } from '@/config/appConfig';
import {
  validateSimulationResultWithResult,
  validateSimulationInputWithResult,
  logValidationError
} from './validationService';
import { logger } from '@/utils/logger';
import { logger as fileLogger } from '@/utils/fileLogger';

// Simple config loader for real financial data
export async function loadFinancialConfigData() {
  try {
    const configFiles = [
      'tax_brackets_2024.json',
      'rmd_table_2024.json',
      'contribution_limits_2025.json',
      'fica_tax_2024.json',
      'state_tax_brackets.json',
      'irmaa_brackets_2024.json',
      'asset_returns_historical.json',
      // Use monthly real estate data for accuracy (no placeholder annual data)
      'monthly_real_estate_data.json',
      'dividend_model_data.json'
    ];

    const promises = configFiles.map(async (filename) => {
      const response = await fetch(`/config/${filename}`);
      if (!response.ok) {
        throw new Error(`Failed to load ${filename}: ${response.status}`);
      }
      return response.json();
    });

    // Add defaults.json to the config files
    const defaultsResponse = await fetch('/config/defaults.json');
    if (!defaultsResponse.ok) {
      throw new Error(`Failed to load defaults.json: ${defaultsResponse.status}`);
    }
    const defaults = await defaultsResponse.json();

    const [
      taxBrackets,
      rmdTable,
      contributionLimits,
      ficaTax,
      stateTax,
      irmaa,
      assetReturns,
      monthlyRealEstate,
      dividendModel
    ] = await Promise.all(promises);

    return {
      taxBrackets,
      rmdTable,
      contributionLimits,
      ficaTax,
      stateTax,
      irmaa,
      assetReturns,
      monthlyRealEstate,
      dividendModel,
      defaults  // CRITICAL: Centralized defaults configuration
    };
  } catch (error) {
    logger.error('Failed to load financial configuration:', 'WASM', error);
    throw new Error(`Configuration loading failed: ${(error as Error).message}`);
  }
}

interface WorkerMessage {
  id: string;
  type: string;
  payload: any;
}

interface WorkerTask {
  id: string;
  resolve: (result: any) => void;
  reject: (error: Error) => void;
  timeout?: number;
}

interface ProgressCallback {
  onProgress?: (completed: number, total: number, workerIndex?: number) => void;
  onComplete?: (results: any) => void;
  onError?: (error: Error) => void;
}

interface WorkerPerformanceStats {
  totalCompleted: number;
  averageSimulationTime: number;
  successRate: number;
  lastCompletionTime: number;
}

interface WorkUnit {
  id: number;
  batchStartIndex: number;
  batchSize: number;
  assignedWorker?: number;
  startTime?: number;
}

class WASMWorkerPool {
  private workers: Worker[] = [];
  private availableWorkers: number[] = [];
  private busyWorkers: Set<number> = new Set();
  private taskQueue: Array<() => void> = [];
  private activeTasks: Map<string, WorkerTask> = new Map();
  private poolSize: number;
  private initialized = false;
  private initializationPromise: Promise<void> | null = null;
  
  // ULTRA-PERFORMANCE: Dynamic work stealing optimization
  private workQueue: WorkUnit[] = [];
  private workerStats: Map<number, WorkerPerformanceStats> = new Map();
  private totalWorkUnits = 0;
  private completedWorkUnits = 0;
  private _currentProgressCallback?: ProgressCallback;
  private workStealingEnabled = true;
  private microBatchSize = 5; // ULTRA-AGGRESSIVE: Smaller batches for better load balancing
  
  // EXTREME: Ultra-minimal memory footprint
  private resultPool: any[] = []; // Minimal result pool
  private maxPoolSize = 50; // EXTREME: Minimal pool to stay under 100MB
  private memoryPressureThreshold = 0.5; // 50% of heap limit - very aggressive
  private lastGCTime = 0;
  private gcInterval = 1000; // Force GC every 1 second - very aggressive
  
  // ULTRA-PERFORMANCE: Message passing optimizations
  private cachedInputs: Map<string, any> = new Map(); // Cache serialized inputs
  private transferableBuffers: ArrayBuffer[] = []; // Reusable transferable buffers
  private _messageCompressionEnabled = true;
  private maxCachedInputs = 10;

  constructor(poolSize?: number) {
    // Determine optimal pool size based on device capabilities
    this.poolSize = poolSize || this.getOptimalPoolSize();
  }

  /**
   * Get the number of active workers in the pool
   */
  get workerCount(): number {
    return this.workers.length;
  }

  /**
   * PARALLEL PROCESSING: Calculate batch size for optimal parallel worker throughput
   */
  private calculateOptimalBatchSize(totalRuns: number): number {
    // With parallel workers, optimize batch size for memory efficiency and throughput
    // Balance between reducing overhead and preventing memory pressure
    
    const memoryGB = (navigator as any).deviceMemory || 4;
    const workerCount = this.poolSize;
    
    let optimalBatchSize: number;
    
    if (totalRuns <= 10) {
      // Small workloads: Process all at once, but distribute among workers
      optimalBatchSize = Math.max(1, Math.floor(totalRuns / workerCount));
    } else if (totalRuns <= 50) {
      // Standard Monte Carlo: Use moderate batches per worker
      optimalBatchSize = memoryGB >= 8 ? 10 : 5; // Conservative with parallel processing
    } else {
      // Large workloads: Scale with memory but keep per-worker batches reasonable
      const memoryFactor = memoryGB >= 8 ? 15 : 8;
      optimalBatchSize = Math.min(memoryFactor, Math.floor(totalRuns / (workerCount * 3))); // At least 3 batches per worker
    }
    
    // MEMORY-SAFE: Keep batches small to prevent crashes with parallel processing
    optimalBatchSize = Math.max(1, Math.min(10, optimalBatchSize));
    
    logger.performanceLog(`Parallel batch size: ${optimalBatchSize} per worker (${totalRuns} runs, ${workerCount} workers, ${memoryGB}GB memory)`);
    return optimalBatchSize;
  }

  /**
   * PARALLEL PROCESSING: Auto-size based on hardware capabilities
   */
  private getOptimalPoolSize(): number {
    const cores = typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 5 : 5;
    const poolSize = Math.max(2, Math.min(8, cores - 1));

    logger.performanceLog(`Using ${poolSize} WASM workers for parallel processing (${cores} cores detected)`);
    return poolSize;
  }

  /**
   * Initialize the worker pool
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this.initializeWorkers();
    return this.initializationPromise;
  }

  private async initializeWorkers(): Promise<void> {
    // First, validate that required files are accessible
    try {
      const wasmResponse = await fetch('/pathfinder.wasm', {
        cache: (globalThis as any).VITE_DEV_MODE ? 'no-cache' : 'default'
      });
      if (!wasmResponse.ok) {
        throw new Error(`WASM file not accessible: ${wasmResponse.status} ${wasmResponse.statusText}`);
      }
      
      const workerResponse = await fetch('/wasmWorker.js');
      if (!workerResponse.ok) {
        throw new Error(`Worker file not accessible: ${workerResponse.status} ${workerResponse.statusText}`);
      }
      
    } catch (error) {
      logger.error('File validation failed:', 'WASM', error);
      throw new Error(`Required files not accessible: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    const initPromises: Promise<void>[] = [];

    for (let i = 0; i < this.poolSize; i++) {
      try {
        const worker = new Worker('/wasmWorker.js');
        this.workers[i] = worker;
        this.availableWorkers.push(i);

        // Set up message handler for this worker
        worker.onmessage = (event) => this.handleWorkerMessage(i, event);
        worker.onerror = (error) => this.handleWorkerError(i, error);
        
        // ULTRA-PERFORMANCE: Initialize worker performance stats
        this.workerStats.set(i, {
          totalCompleted: 0,
          averageSimulationTime: 1000, // Start with reasonable default
          successRate: 1.0,
          lastCompletionTime: 0
        });
        
        // ULTRA-AGGRESSIVE: Pre-warm result object pool (only once)
        if (i === 0 && this.resultPool.length === 0) {
          this.preAllocateResultObjects();
        }

        // Initialize WASM in this worker
        const initPromise = this.sendToWorker(i, 'INIT_WASM', {}, 60000)
          .then(async () => {
            // Embedded config: no external LOAD_CONFIG needed
            logger.dataLog(`Skipping worker ${i} config load (using embedded WASM config)`);
            // Disable logging by default in production app
            await this.sendToWorker(i, 'SET_LOGGING', { enabled: false }, 5000);
          })
          .catch(error => {
            logger.error(`Failed to initialize worker ${i}:`, 'WASM', error);
            throw new Error(`Worker ${i} initialization failed: ${error.message}`);
          });
        initPromises.push(initPromise);
      } catch (error) {
        logger.error(`Failed to create worker ${i}:`, 'WASM', error);
        throw new Error(`Failed to create worker ${i}: ${(error as Error).message}`);
      }
    }

    // Wait for all workers to initialize
    try {
      await Promise.all(initPromises);
      this.initialized = true;
    } catch (error) {
      logger.error('Worker initialization failed:', 'WASM', error);
      // Clean up any created workers
      this.terminate();
      throw new Error(`WebWorker pool initialization failed: ${(error as Error).message}`);
    }
  }

  /**
   * Handle message from a worker
   */
  private async handleWorkerMessage(workerIndex: number, event: MessageEvent) {
    const { id, type, payload } = event.data as WorkerMessage;

    if (type === 'debug_log') {
      // Use file logger for debug messages from workers
      fileLogger.log('Worker log: ' + JSON.stringify({
        level: payload?.level || 'info',
        message: payload?.message || 'No message',
        source: `WORKER${workerIndex}`
      }));
      return;
    }
    
    if (type === 'DEBUG_LOG') {
      // Legacy handler - redirect to file logger
      fileLogger.log('Worker log: ' + JSON.stringify({
        level: payload?.level || 'info',
        message: payload?.message || 'No message',
        source: `WORKER${workerIndex}`
      }));
      
      // Filter out spam but keep critical debug messages
      const message = payload?.message || '';
      const isSpamMessage = message.includes('DEBUG WASM BEFORE PROPERTY ACCESS') ||
                           message.includes('DEBUG WASM AFTER PROPERTY ACCESS') ||
                           message.includes('DEBUG WASM SINGLE SIM:') ||
                           message.includes('DEBUG WASM PRE-PARSE:') ||
                           message.includes('DEBUG WASM PARSE-INPUT-START:') ||
                           message.includes('DEBUG WASM PARSE-INPUT:') ||
                           message.includes('DEBUG WASM EVENTS-CHECK:') ||
                           message.includes('DEBUG WASM EVENTS-EXIST:') ||
                           message.includes('DEBUG WASM CALLING-parseEvents') ||
                           message.includes('DEBUG WASM parseEvents function called') ||
                           message.includes('DEBUG WASM parseEvents Events array length:') ||
                           message.includes('DEBUG WASM parseEvents Event') ||
                           message.includes('🚨 WASM SINGLE SIMULATION CALLED') ||
                           message.includes('[WASM-PAYLOAD-FULL]') ||
                           message.includes('[ACCELERATOR-DEBUG] FULL WASM INPUT STRUCTURE:') ||
                           message.includes('=== INITIAL ACCOUNTS ===') ||
                           message.includes('=== PREPROCESSED EVENTS (FULL) ===') ||
                           message.includes('=== SIMULATION PARAMETERS ===') ||
                           message.includes('=== EVENT ANALYSIS ===') ||
                           message.includes('💰 [AMOUNT-FIX]') ||
                           message.includes('[CASH-CHANGE]') ||
                           message.includes('[EVENT-FIRE]') ||
                           message.includes('[EVENT-RESULT]') ||
                           message.includes('[BALANCE-DEBUG]') ||
                           message.includes('🚨 WASM SINGLE SIMULATION RESULTS:') ||
                           message.includes('DEBUG WASM ProcessEvent:') ||
                           // Filter repetitive month-by-month simulation logs
                           message.includes('🔍 [MONTH-') ||
                           message.includes('🎯 [INCOME-M11]') ||
                           message.includes('🚨 [EXPENSE-HANDLER]') ||
                           message.includes('🎯 [CONTRIB-M11]') ||
                           message.includes('GROWTH FUNCTION ENTRY:') ||
                           message.includes('processEventWithFIFO:') ||
                           message.includes('ProcessEvent SUCCESS') ||
                           message.includes('💰') ||
                           message.includes('🔥') ||
                           message.includes('📋');

      // Only log errors, simulation completion, and CRITICAL debugging messages
      const shouldLog = !isSpamMessage && (payload?.level === 'error' || 
                       message.includes('FINAL NET WORTH') ||
                       message.includes('simulation complete') ||
                       // CRITICAL: Allow employment income debugging messages through
                       message.includes('🚨 [REGISTRY-CRITICAL]') ||
                       message.includes('🔍 [INCOME-HANDLER]'));
      
      if (!shouldLog) {
        return;
      }
      
      // Already handled by file logger above, no need for additional console logging
      return;
    }

    if (type === 'PROGRESS') {
      // Handle progress updates (these don't complete tasks)
      const task = this.activeTasks.get(id);
      if (task && (task as any).progressCallback) {
        const callback = (task as any).progressCallback as ProgressCallback;
        callback.onProgress?.(payload.completed, payload.total, workerIndex);
      }
      return;
    }

    const task = this.activeTasks.get(id);
    if (!task) {
      // Ignore broadcast responses (they're handled in broadcastToAll)
      if (id && id.startsWith('broadcast-')) {
        return;
      }
      logger.warn(`Received message for unknown task: ${id}`, 'WASM');
      return;
    }

    // Clear timeout if it exists
    if (task.timeout) {
      window.clearTimeout(task.timeout);
    }

    // Remove task from active tasks
    this.activeTasks.delete(id);

    // Mark worker as available
    this.busyWorkers.delete(workerIndex);
    this.availableWorkers.push(workerIndex);

    // Process next task in queue
    this.processNextTask();

    // Handle the response
    if (type === 'SUCCESS') {
      // Check if this is a batch result (array from RUN_MONTE_CARLO_BATCH)
      if (Array.isArray(payload)) {
        task.resolve(payload);
        return;
      }
      
      // Validate worker response payload for simulation results
      if (payload && (Array.isArray(payload) || typeof payload === 'object')) {
        const validationResult = validateSimulationResultWithResult(payload);
        if (!validationResult.isValid) {
          // STRICT VALIDATION: Reject invalid data immediately
          logger.error(`Worker ${workerIndex} validation failed:`, 'WASM', {
            message: validationResult.errorMessage,
            payloadType: Array.isArray(payload) ? 'array' : 'object',
            hasTopLevelKeys: typeof payload === 'object' && payload ? Object.keys(payload) : 'n/a',
            errors: validationResult.errors
          });
          task.resolve({
            success: false,
            monthlyData: [],
            finalNetWorth: 0,
            error: `Validation failed: ${validationResult.errorMessage}`
          });
          return;
        }
      }

      // DEBUG: Log WASM response structure including debugInfo
      if (payload) {
        logger.wasmLog(`Worker ${workerIndex} payload: success=${payload.success}, monthlyData=${!!payload.monthlyData}, debugInfo=${!!payload.debugInfo}`);
        logger.wasmLog(`Worker ${workerIndex} payload structure:`, 'WASM', {
          isArray: Array.isArray(payload),
          type: typeof payload,
          keys: typeof payload === 'object' && payload ? Object.keys(payload) : 'n/a',
          hasMonthlyData: !!(payload.monthlyData),
          hasPlanProjection: !!(payload.planProjection),
          hasSuccess: payload.success !== undefined
        });

        if (payload.debugInfo) {
          logger.wasmLog(`Worker ${workerIndex} debugInfo: ${JSON.stringify(payload.debugInfo)}`);
        }
      }
      
      // Handle simulation results - different formats for different task types
      if ((task as any).taskType === 'RUN_SIMULATION_WITH_UI_PAYLOAD') {
        // UI payload transformer returns SimulationPayload directly, not wrapped in success envelope
        let uiPayload: any = payload;

        // FIX #2: Harden validation with plain-object conversion and content checks
        try {
          // Parse if string
          if (typeof uiPayload === 'string') {
            uiPayload = JSON.parse(uiPayload);
          }

          // Force plain-object conversion to break proxy references
          uiPayload = JSON.parse(JSON.stringify(uiPayload));

          // Normalize casing (handle both PascalCase and camelCase)
          if (uiPayload && !uiPayload.planProjection && uiPayload.PlanProjection) {
            uiPayload.planProjection = uiPayload.PlanProjection;
          }
          if (uiPayload && !uiPayload.planInputs && uiPayload.PlanInputs) {
            uiPayload.planInputs = uiPayload.PlanInputs;
          }

          // Diagnostic logging (one-time)
          logger.debug(`Worker ${workerIndex} UI Payload keys:`, 'WASM', Object.keys(uiPayload || {}));
          logger.debug(`Worker ${workerIndex} UI Payload type:`, 'WASM', typeof uiPayload);
        } catch (normError) {
          logger.error(`Worker ${workerIndex} normalization error:`, 'WASM', normError);
          task.reject(new Error(`Failed to normalize UI payload: ${(normError as Error).message}`));
          return;
        }

        // Check for error response from WASM
        if (uiPayload && uiPayload.success === false && uiPayload.error) {
          logger.error(`Worker ${workerIndex} WASM error:`, 'WASM', uiPayload.error);
          task.reject(new Error(`WASM simulation error: ${uiPayload.error}`));
          return;
        }

        // Validate structure (but allow empty content)
        if (!uiPayload || typeof uiPayload !== 'object') {
          logger.warn(`Worker ${workerIndex} returned invalid UI payload type:`, 'WASM', typeof uiPayload);
          task.reject(new Error('Invalid UI payload result - not an object'));
          return;
        }

        if (!uiPayload.planProjection || typeof uiPayload.planProjection !== 'object') {
          logger.warn(`Worker ${workerIndex} missing planProjection. Keys:`, 'WASM', Object.keys(uiPayload || {}));
          logger.error(`Worker ${workerIndex} Full payload:`, 'WASM', uiPayload);
          task.reject(new Error('Invalid UI payload result - missing or invalid planProjection'));
          return;
        }

        // Valid structure found - accept even if empty (UI can handle gracefully)
        logger.dataLog(`Worker ${workerIndex} returned valid SimulationPayload structure`, 'WASM');
        task.resolve(uiPayload);
        return;
      }

      // Handle standard simulation results - ensure proper format for Monte Carlo runner
      if (payload && payload.success === undefined) {
        // Invalid result - return empty monthlyData array so it's processed as failed path
        logger.warn(`Worker ${workerIndex} returned invalid result (success: undefined)`, 'WASM');
        task.resolve({
          success: false,
          monthlyData: [],
          finalNetWorth: 0,
          error: 'Invalid simulation result'
        });
      } else if (payload && payload.success === true && payload.finalNetWorth === undefined) {
        // Success but missing finalNetWorth - extract from last month of monthlyData
        if (payload.monthlyData && payload.monthlyData.length > 0) {
          const lastMonth = payload.monthlyData[payload.monthlyData.length - 1];
          payload.finalNetWorth = lastMonth.netWorth;
          logger.dataLog(`Worker ${workerIndex} extracted finalNetWorth=${payload.finalNetWorth} from monthlyData (${payload.monthlyData.length} months)`, 'WASM');
        } else {
          payload.finalNetWorth = payload.isBankrupt ? -50000 : 0;
          // Only warn if this is an unexpected missing data case, not during initialization
          if (payload.finalNetWorth !== 0) {
            logger.warn(`Worker ${workerIndex} missing monthlyData, using default finalNetWorth=${payload.finalNetWorth}`, 'WASM');
          } else {
            logger.dataLog(`Worker ${workerIndex} initialized with default finalNetWorth=0`, 'WASM');
          }
        }
        
        // Ensure monthlyData exists for Monte Carlo runner
        if (!payload.monthlyData) {
          payload.monthlyData = [];
        }
        
        task.resolve(payload);
      } else {
        // Normal result - ensure monthlyData exists
        if (payload && payload.success === true && !payload.monthlyData) {
          logger.dataLog(`Worker ${workerIndex} success but no monthlyData, adding empty array`, 'WASM');
          payload.monthlyData = [];
        }
        task.resolve(payload);
      }
    } else if (type === 'ERROR') {
      task.reject(new Error(payload.message || 'Worker task failed'));
    } else {
      task.reject(new Error(`Unknown response type: ${type}`));
    }
  }

  /**
   * Handle worker error and restart worker if needed
   */
  private handleWorkerError(workerIndex: number, error: ErrorEvent) {
    logger.error(`Worker ${workerIndex} error:`, 'WASM', error);
    logger.error(`Worker ${workerIndex} error details:`, 'WASM', {
      message: error.message,
      filename: error.filename,
      lineno: error.lineno,
      colno: error.colno,
      error: error.error
    });
    
    // Find any active tasks for this worker and reject them
    for (const [taskId, task] of this.activeTasks.entries()) {
      if ((task as any).workerIndex === workerIndex) {
        this.activeTasks.delete(taskId);
        const errorMessage = error.message || error.error?.message || error.error?.toString() || 'Unknown worker error';
        task.reject(new Error(`Worker ${workerIndex} error: ${errorMessage}`));
      }
    }

    // CRITICAL: Restart worker if it's a WASM crash (Go program exited)
    const errorMessage = error.message || error.error?.message || '';
    if (errorMessage.includes('Go program has already exited') || errorMessage.includes('WASM')) {
      logger.warn(`Worker ${workerIndex} WASM crashed - restarting worker`, 'WASM');
      this.restartWorker(workerIndex).catch(restartError => {
        logger.error(`Failed to restart worker ${workerIndex}:`, 'WASM', restartError);
      });
    } else {
      // Mark worker as available (it may recover)
      this.busyWorkers.delete(workerIndex);
      if (!this.availableWorkers.includes(workerIndex)) {
        this.availableWorkers.push(workerIndex);
      }
    }
  }

  /**
   * Restart a crashed worker
   */
  private async restartWorker(workerIndex: number): Promise<void> {
    try {
      // Remove worker from available list
      this.busyWorkers.delete(workerIndex);
      this.availableWorkers = this.availableWorkers.filter(i => i !== workerIndex);

      // Terminate old worker
      const oldWorker = this.workers[workerIndex];
      if (oldWorker) {
        oldWorker.onmessage = null;
        oldWorker.onerror = null;
        oldWorker.terminate();
      }

      // Create new worker
      const worker = new Worker('/wasmWorker.js');
      worker.onmessage = (event) => this.handleWorkerMessage(workerIndex, event);
      worker.onerror = (error) => this.handleWorkerError(workerIndex, error);
      
      this.workers[workerIndex] = worker;

      // Reset worker stats
      this.workerStats.set(workerIndex, {
        totalCompleted: 0,
        averageSimulationTime: 0,
        successRate: 1.0,
        lastCompletionTime: 0
      });

      // Reinitialize WASM
      await this.sendToWorker(workerIndex, 'INIT_WASM', {}, 60000);

      // Load real financial configuration data (CRITICAL: must load config after WASM init!)
      logger.dataLog(`Loading financial configuration for restarted worker ${workerIndex}`);
      const rawConfigData = await loadFinancialConfigData();

      // Convert to format expected by WASM (stringified JSON values)
      // CRITICAL: Must match the initial worker config loading (all 10 files) and WASM expectations in main.go
      const configData = {
        tax_brackets_2024: JSON.stringify(rawConfigData.taxBrackets),
        rmd_table: JSON.stringify(rawConfigData.rmdTable),
        contribution_limits_2024: JSON.stringify(rawConfigData.contributionLimits),
        fica_tax: JSON.stringify(rawConfigData.ficaTax),
        state_tax_brackets: JSON.stringify(rawConfigData.stateTax),
        irmaa_brackets: JSON.stringify(rawConfigData.irmaa),
        asset_returns: JSON.stringify(rawConfigData.assetReturns),
        monthly_real_estate: JSON.stringify(rawConfigData.monthlyRealEstate),
        dividend_model: JSON.stringify(rawConfigData.dividendModel),
        defaults: JSON.stringify(rawConfigData.defaults)  // CRITICAL: Centralized defaults
      };

      await this.sendToWorker(workerIndex, 'LOAD_CONFIG', configData, 30000);
      logger.dataLog(`Financial configuration loaded for restarted worker ${workerIndex}`);

      // Disable logging by default (same as initial workers)
      await this.sendToWorker(workerIndex, 'SET_LOGGING', { enabled: false }, 5000);
      
      // Add back to available workers
      this.availableWorkers.push(workerIndex);
      
      logger.performanceLog(`Worker ${workerIndex} successfully restarted`, 'WASM');
      
    } catch (error) {
      logger.error(`Failed to restart worker ${workerIndex}:`, 'WASM', error);
      throw error;
    }
  }

  /**
   * Send a task to a specific worker
   */
  private sendToWorker(workerIndex: number, type: string, payload: any, timeout = 30000): Promise<any> {
    const taskId = `task_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    
    return new Promise((resolve, reject) => {
      const task: WorkerTask = { id: taskId, resolve, reject };
      
      // Set up timeout
      if (timeout > 0) {
        task.timeout = window.setTimeout(() => {
          this.activeTasks.delete(taskId);
          this.busyWorkers.delete(workerIndex);
          this.availableWorkers.push(workerIndex);
          reject(new Error(`Worker task timeout after ${timeout}ms`));
        }, timeout);
      }

      // Store task
      this.activeTasks.set(taskId, task);
      (task as any).workerIndex = workerIndex;

      // FIXED: Send message directly without optimization to prevent cache corruption
      // The message optimization was breaking JSON input by replacing it with cache references
      const message = {
        id: taskId,
        type,
        payload
      };

      this.workers[workerIndex].postMessage(message);
    });
  }

  /**
   * Execute a task on any available worker
   */
  private async executeTask(type: string, payload: any, progressCallback: ProgressCallback | undefined = undefined, timeout = 30000): Promise<any> {
    // CRITICAL: Ensure worker pool is initialized before executing any tasks
    // This prevents the race condition where simulations run before config is loaded
    await this.initialize();

    return new Promise((resolve, reject) => {
      const taskExecutor = () => {
        if (this.availableWorkers.length === 0) {
          // No workers available, add to queue
          this.taskQueue.push(taskExecutor);
          return;
        }

        const workerIndex = this.availableWorkers.pop()!;
        this.busyWorkers.add(workerIndex);

        // Add progress callback to task if provided
        const taskId = `task_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
        const task: WorkerTask = { id: taskId, resolve, reject };
        (task as any).taskType = type; // Store task type for result validation

        if (progressCallback) {
          (task as any).progressCallback = progressCallback;
        }

        if (timeout > 0) {
          task.timeout = window.setTimeout(() => {
            logger.error(`Task ${taskId} on worker ${workerIndex} TIMED OUT after ${timeout}ms`, 'WASM');
            logger.error(`Worker ${workerIndex} state at timeout:`, 'WASM', {
              isBusy: this.busyWorkers.has(workerIndex),
              activeTasks: this.activeTasks.size,
              queuedTasks: this.taskQueue.length,
              taskType: type
            });
            this.activeTasks.delete(taskId);
            this.busyWorkers.delete(workerIndex);
            this.availableWorkers.push(workerIndex);
            reject(new Error(`Worker task timeout after ${timeout}ms for task type: ${type}`));
          }, timeout);
        }

        this.activeTasks.set(taskId, task);
        (task as any).workerIndex = workerIndex;

        logger.debug(`Sending ${type} message to worker ${workerIndex} with task ${taskId}`, 'WASM');
        logger.debug(`Sending message to worker ${workerIndex}:`, 'WASM', { type, taskId });

        // FIXED: Send message directly without optimization to prevent cache corruption
        const message = {
          id: taskId,
          type,
          payload
        };

        // TRACE: Log monthsToRun being sent to workers
        if (type === 'RUN_MONTE_CARLO_BATCH_JSON' && payload?.input?.monthsToRun) {
          logger.info(`🔧 [WORKER-POOL→WORKER${workerIndex}] Sending monthsToRun=${payload.input.monthsToRun} to WASM worker`);
        }

        this.workers[workerIndex].postMessage(message);
        logger.debug(`Message posted to worker ${workerIndex}`, 'WASM');
      };

      taskExecutor();
    });
  }

  /**
   * Process next task in queue
   */
  private processNextTask(): void {
    if (this.taskQueue.length > 0 && this.availableWorkers.length > 0) {
      const nextTask = this.taskQueue.shift();
      if (nextTask) {
        nextTask();
      }
    }
  }

  /**
   * Run a single simulation
   */
  async runSingleSimulation(
    initialAccounts: AccountHoldingsMonthEnd,
    events: SimulationEvent[],
    config: AppConfig,
    monthsToRun: number
  ): Promise<any> {
    await this.initialize();

    // CRITICAL FIX: Include DEFAULT_STOCHASTIC_CONFIG to ensure all GARCH parameters are present
    // DEBUG: Log original config BEFORE flattening to see if it has explicit 0 values
    logger.debug('Original config GARCH values:', 'WASM', {
      spy: {
        omega: config.garchSpyOmega,
        alpha: config.garchSpyAlpha,
        beta: config.garchSpyBeta
      },
      other: {
        omega: config.garchOtherOmega,
        alpha: config.garchOtherAlpha,
        beta: config.garchOtherBeta
      },
      hasExplicitZeros: {
        otherOmega: config.garchOtherOmega === 0,
        otherAlpha: config.garchOtherAlpha === 0,
        otherBeta: config.garchOtherBeta === 0
      }
    });

    // The WASM requires these parameters and will fail with success:false if they're missing
    // Build config WITHOUT spreading user config (to avoid explicit 0 values overwriting defaults)
    const flattenedConfig: any = {
      ...DEFAULT_STOCHASTIC_CONFIG  // Start with all defaults
    };

    // Manually copy non-GARCH properties from user config
    for (const key in config) {
      if (!key.startsWith('garch')) {
        flattenedConfig[key] = config[key as keyof typeof config];
      }
    }

    // Explicitly set GARCH params, using config values ONLY if they're non-zero
    flattenedConfig.garchSpyOmega = (config.garchSpyOmega && config.garchSpyOmega > 0) ? config.garchSpyOmega : DEFAULT_STOCHASTIC_CONFIG.garchSpyOmega;
    flattenedConfig.garchSpyAlpha = (config.garchSpyAlpha && config.garchSpyAlpha > 0) ? config.garchSpyAlpha : DEFAULT_STOCHASTIC_CONFIG.garchSpyAlpha;
    flattenedConfig.garchSpyBeta = (config.garchSpyBeta && config.garchSpyBeta > 0) ? config.garchSpyBeta : DEFAULT_STOCHASTIC_CONFIG.garchSpyBeta;

    flattenedConfig.garchBondOmega = (config.garchBondOmega && config.garchBondOmega > 0) ? config.garchBondOmega : DEFAULT_STOCHASTIC_CONFIG.garchBondOmega;
    flattenedConfig.garchBondAlpha = (config.garchBondAlpha && config.garchBondAlpha > 0) ? config.garchBondAlpha : DEFAULT_STOCHASTIC_CONFIG.garchBondAlpha;
    flattenedConfig.garchBondBeta = (config.garchBondBeta && config.garchBondBeta > 0) ? config.garchBondBeta : DEFAULT_STOCHASTIC_CONFIG.garchBondBeta;

    flattenedConfig.garchIntlStockOmega = (config.garchIntlStockOmega && config.garchIntlStockOmega > 0) ? config.garchIntlStockOmega : DEFAULT_STOCHASTIC_CONFIG.garchIntlStockOmega;
    flattenedConfig.garchIntlStockAlpha = (config.garchIntlStockAlpha && config.garchIntlStockAlpha > 0) ? config.garchIntlStockAlpha : DEFAULT_STOCHASTIC_CONFIG.garchIntlStockAlpha;
    flattenedConfig.garchIntlStockBeta = (config.garchIntlStockBeta && config.garchIntlStockBeta > 0) ? config.garchIntlStockBeta : DEFAULT_STOCHASTIC_CONFIG.garchIntlStockBeta;

    flattenedConfig.garchOtherOmega = (config.garchOtherOmega && config.garchOtherOmega > 0) ? config.garchOtherOmega : DEFAULT_STOCHASTIC_CONFIG.garchOtherOmega;
    flattenedConfig.garchOtherAlpha = (config.garchOtherAlpha && config.garchOtherAlpha > 0) ? config.garchOtherAlpha : DEFAULT_STOCHASTIC_CONFIG.garchOtherAlpha;
    flattenedConfig.garchOtherBeta = (config.garchOtherBeta && config.garchOtherBeta > 0) ? config.garchOtherBeta : DEFAULT_STOCHASTIC_CONFIG.garchOtherBeta;

    flattenedConfig.garchIndividualStockOmega = (config.garchIndividualStockOmega && config.garchIndividualStockOmega > 0) ? config.garchIndividualStockOmega : DEFAULT_STOCHASTIC_CONFIG.garchIndividualStockOmega;
    flattenedConfig.garchIndividualStockAlpha = (config.garchIndividualStockAlpha && config.garchIndividualStockAlpha > 0) ? config.garchIndividualStockAlpha : DEFAULT_STOCHASTIC_CONFIG.garchIndividualStockAlpha;
    flattenedConfig.garchIndividualStockBeta = (config.garchIndividualStockBeta && config.garchIndividualStockBeta > 0) ? config.garchIndividualStockBeta : DEFAULT_STOCHASTIC_CONFIG.garchIndividualStockBeta;
    delete (flattenedConfig as any).withdrawalStrategy; // Remove any conflicting withdrawalStrategy

    // DEBUG: Log ALL GARCH params to verify they're present
    logger.debug('ALL GARCH params being sent to WASM:', 'WASM', {
      spy: {
        omega: flattenedConfig.garchSpyOmega,
        alpha: flattenedConfig.garchSpyAlpha,
        beta: flattenedConfig.garchSpyBeta
      },
      bond: {
        omega: flattenedConfig.garchBondOmega,
        alpha: flattenedConfig.garchBondAlpha,
        beta: flattenedConfig.garchBondBeta
      },
      intlStock: {
        omega: flattenedConfig.garchIntlStockOmega,
        alpha: flattenedConfig.garchIntlStockAlpha,
        beta: flattenedConfig.garchIntlStockBeta
      },
      other: {
        omega: flattenedConfig.garchOtherOmega,
        alpha: flattenedConfig.garchOtherAlpha,
        beta: flattenedConfig.garchOtherBeta
      },
      individualStock: {
        omega: flattenedConfig.garchIndividualStockOmega,
        alpha: flattenedConfig.garchIndividualStockAlpha,
        beta: flattenedConfig.garchIndividualStockBeta
      }
    });

    // CRITICAL DEBUG: Log monthsToRun to verify it's correct
    logger.info(`[WASM-WORKER-POOL] monthsToRun being sent to WASM: ${monthsToRun}`);

    // Log detailed event info to debug why WASM fails with many events
    logger.info('EVENT DEBUG:', 'WASM', {
      totalEvents: events.length,
      firstTenEvents: events.slice(0, 10).map(e => ({
        type: e.type,
        amount: e.amount,
        monthOffset: e.monthOffset
      })),
      eventTypes: [...new Set(events.map(e => e.type))],
      eventsByType: events.reduce((acc, e) => {
        acc[e.type] = (acc[e.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    });

    // Use the actual input data from the application
    const input = {
      initialAccounts,
      events,
      config: flattenedConfig,
      monthsToRun
    };

    // 🔧 LOG CLIENT->WASM INPUT - Enhanced for Accelerator Debug
    logger.debug('CLIENT->WASM INPUT:', 'SIMULATION', {
      accounts: {
        cash: initialAccounts.cash,
        taxable: initialAccounts.taxable ? 'PRESENT' : 'NULL',
        tax_deferred: initialAccounts.tax_deferred ? 'PRESENT' : 'NULL', 
        roth: initialAccounts.roth ? 'PRESENT' : 'NULL'
      },
      events: (events || []).map(e => ({
        id: e.id,
        type: e.type,
        amount: e.amount,
        monthOffset: e.monthOffset,
        details: e.type === 'INCOME' ? `Income: $${e.amount}/year` :
                e.type === 'RECURRING_EXPENSE' ? `Expense: $${e.amount}/year` :
                e.type === 'SCHEDULED_CONTRIBUTION' ? `Contribution: $${e.amount}/month` : 'Other'
      })),
      eventsCount: (events || []).length,
      monthsToRun,
      configPresent: !!config?.stochasticConfig,
      expectedIncome: (events || []).filter(e => e.type === 'INCOME').reduce((sum, e) => sum + (e.amount || 0), 0),
      expectedExpenses: (events || []).filter(e => e.type === 'RECURRING_EXPENSE').reduce((sum, e) => sum + (e.amount || 0), 0)
    });

    // Validate simulation input before sending to worker
    const validationResult = validateSimulationInputWithResult(input);
    if (!validationResult.isValid) {
      logValidationError('Simulation input validation', validationResult);
      throw new Error(`Invalid simulation input: ${validationResult.errorMessage}`);
    }

    // Use new JSON marshalling approach for robust data serialization
    logger.debug('Input structure being sent to worker:', 'WASM', {
      hasInitialAccounts: !!input.initialAccounts,
      hasEvents: !!input.events,
      eventsLength: input.events?.length,
      hasConfig: !!input.config,
      hasStochasticConfig: !!input.config?.stochasticConfig,
      monthsToRun: input.monthsToRun,
      withdrawalStrategy: input.withdrawalStrategy
    });
    logger.debug('Full input JSON (first 300 chars):', 'WASM', JSON.stringify(input).substring(0, 300));

    // FIX: Worker expects payload.input structure for RUN_SINGLE_SIMULATION_JSON
    return await this.executeTask('RUN_SINGLE_SIMULATION_JSON', { input });
  }

  /**
   * Run simulation with complete UI payload transformer
   * This returns properly formatted chart data ready for UI consumption
   */
  async runSimulationWithUIPayload(
    input: {
      initialAccounts: AccountHoldingsMonthEnd;
      events: SimulationEvent[];
      config: AppConfig;
      monthsToRun: number;
    },
    numberOfRuns: number = 50
  ): Promise<any> {
    await this.initialize();

    // CRITICAL FIX: Include DEFAULT_STOCHASTIC_CONFIG to ensure all GARCH parameters are present
    // Build config WITHOUT spreading user config (to avoid explicit 0 values overwriting defaults)
    const flattenedConfig: any = {
      ...DEFAULT_STOCHASTIC_CONFIG  // Start with all defaults
    };

    // Manually copy non-GARCH properties from user config
    for (const key in input.config) {
      if (!key.startsWith('garch')) {
        flattenedConfig[key] = input.config[key as keyof typeof input.config];
      }
    }

    // Explicitly set GARCH params, using config values ONLY if they're non-zero
    flattenedConfig.garchSpyOmega = (input.config.garchSpyOmega && input.config.garchSpyOmega > 0) ? input.config.garchSpyOmega : DEFAULT_STOCHASTIC_CONFIG.garchSpyOmega;
    flattenedConfig.garchSpyAlpha = (input.config.garchSpyAlpha && input.config.garchSpyAlpha > 0) ? input.config.garchSpyAlpha : DEFAULT_STOCHASTIC_CONFIG.garchSpyAlpha;
    flattenedConfig.garchSpyBeta = (input.config.garchSpyBeta && input.config.garchSpyBeta > 0) ? input.config.garchSpyBeta : DEFAULT_STOCHASTIC_CONFIG.garchSpyBeta;

    flattenedConfig.garchBondOmega = (input.config.garchBondOmega && input.config.garchBondOmega > 0) ? input.config.garchBondOmega : DEFAULT_STOCHASTIC_CONFIG.garchBondOmega;
    flattenedConfig.garchBondAlpha = (input.config.garchBondAlpha && input.config.garchBondAlpha > 0) ? input.config.garchBondAlpha : DEFAULT_STOCHASTIC_CONFIG.garchBondAlpha;
    flattenedConfig.garchBondBeta = (input.config.garchBondBeta && input.config.garchBondBeta > 0) ? input.config.garchBondBeta : DEFAULT_STOCHASTIC_CONFIG.garchBondBeta;

    flattenedConfig.garchIntlStockOmega = (input.config.garchIntlStockOmega && input.config.garchIntlStockOmega > 0) ? input.config.garchIntlStockOmega : DEFAULT_STOCHASTIC_CONFIG.garchIntlStockOmega;
    flattenedConfig.garchIntlStockAlpha = (input.config.garchIntlStockAlpha && input.config.garchIntlStockAlpha > 0) ? input.config.garchIntlStockAlpha : DEFAULT_STOCHASTIC_CONFIG.garchIntlStockAlpha;
    flattenedConfig.garchIntlStockBeta = (input.config.garchIntlStockBeta && input.config.garchIntlStockBeta > 0) ? input.config.garchIntlStockBeta : DEFAULT_STOCHASTIC_CONFIG.garchIntlStockBeta;

    flattenedConfig.garchOtherOmega = (input.config.garchOtherOmega && input.config.garchOtherOmega > 0) ? input.config.garchOtherOmega : DEFAULT_STOCHASTIC_CONFIG.garchOtherOmega;
    flattenedConfig.garchOtherAlpha = (input.config.garchOtherAlpha && input.config.garchOtherAlpha > 0) ? input.config.garchOtherAlpha : DEFAULT_STOCHASTIC_CONFIG.garchOtherAlpha;
    flattenedConfig.garchOtherBeta = (input.config.garchOtherBeta && input.config.garchOtherBeta > 0) ? input.config.garchOtherBeta : DEFAULT_STOCHASTIC_CONFIG.garchOtherBeta;

    flattenedConfig.garchIndividualStockOmega = (input.config.garchIndividualStockOmega && input.config.garchIndividualStockOmega > 0) ? input.config.garchIndividualStockOmega : DEFAULT_STOCHASTIC_CONFIG.garchIndividualStockOmega;
    flattenedConfig.garchIndividualStockAlpha = (input.config.garchIndividualStockAlpha && input.config.garchIndividualStockAlpha > 0) ? input.config.garchIndividualStockAlpha : DEFAULT_STOCHASTIC_CONFIG.garchIndividualStockAlpha;
    flattenedConfig.garchIndividualStockBeta = (input.config.garchIndividualStockBeta && input.config.garchIndividualStockBeta > 0) ? input.config.garchIndividualStockBeta : DEFAULT_STOCHASTIC_CONFIG.garchIndividualStockBeta;

    delete (flattenedConfig as any).withdrawalStrategy;

    // DEBUG: Log ALL GARCH params to verify they're present in UI payload method
    logger.debug('ALL GARCH params in UI payload method:', 'WASM', {
      spy: {
        omega: flattenedConfig.garchSpyOmega,
        alpha: flattenedConfig.garchSpyAlpha,
        beta: flattenedConfig.garchSpyBeta
      },
      bond: {
        omega: flattenedConfig.garchBondOmega,
        alpha: flattenedConfig.garchBondAlpha,
        beta: flattenedConfig.garchBondBeta
      },
      intlStock: {
        omega: flattenedConfig.garchIntlStockOmega,
        alpha: flattenedConfig.garchIntlStockAlpha,
        beta: flattenedConfig.garchIntlStockBeta
      },
      other: {
        omega: flattenedConfig.garchOtherOmega,
        alpha: flattenedConfig.garchOtherAlpha,
        beta: flattenedConfig.garchOtherBeta
      },
      individualStock: {
        omega: flattenedConfig.garchIndividualStockOmega,
        alpha: flattenedConfig.garchIndividualStockAlpha,
        beta: flattenedConfig.garchIndividualStockBeta
      }
    });

    const wasmInput = {
      initialAccounts: input.initialAccounts,
      events: input.events,
      config: flattenedConfig,
      monthsToRun: input.monthsToRun
    };

    logger.simulationLog(`Running UI payload transformer with ${numberOfRuns} Monte Carlo runs`);

    return await this.executeTask('RUN_SIMULATION_WITH_UI_PAYLOAD', {
      input: wasmInput,
      numberOfRuns
    });
  }

  /**
   * ULTRA-PERFORMANCE: Dynamic work stealing Monte Carlo simulation
   */
  async runMonteCarloParallel(
    initialAccounts: AccountHoldingsMonthEnd,
    events: SimulationEvent[],
    config: AppConfig,
    monthsToRun: number,
    numberOfRuns: number,
    progressCallback?: ProgressCallback
  ): Promise<any[]> {
    const startTime = Date.now();
    logger.performanceLog(`Starting ultra-optimized Monte Carlo: ${numberOfRuns} runs, ${this.poolSize} workers, work-stealing enabled`);
    await this.initialize();

    // CRITICAL FIX: Flatten config to match WASM expectations (no nested stochasticConfig)
    // Build config WITHOUT spreading user config (to avoid explicit 0 values overwriting defaults)
    const stochasticConfig = config?.stochasticConfig || config || {};
    const flattenedConfig: any = {
      ...DEFAULT_STOCHASTIC_CONFIG  // Start with all defaults
    };

    // Manually copy non-GARCH properties from user config
    for (const key in stochasticConfig) {
      if (!key.startsWith('garch')) {
        flattenedConfig[key] = stochasticConfig[key as keyof typeof stochasticConfig];
      }
    }

    // Explicitly set GARCH params, using config values ONLY if they're non-zero
    flattenedConfig.garchSpyOmega = (stochasticConfig.garchSpyOmega && stochasticConfig.garchSpyOmega > 0) ? stochasticConfig.garchSpyOmega : DEFAULT_STOCHASTIC_CONFIG.garchSpyOmega;
    flattenedConfig.garchSpyAlpha = (stochasticConfig.garchSpyAlpha && stochasticConfig.garchSpyAlpha > 0) ? stochasticConfig.garchSpyAlpha : DEFAULT_STOCHASTIC_CONFIG.garchSpyAlpha;
    flattenedConfig.garchSpyBeta = (stochasticConfig.garchSpyBeta && stochasticConfig.garchSpyBeta > 0) ? stochasticConfig.garchSpyBeta : DEFAULT_STOCHASTIC_CONFIG.garchSpyBeta;

    flattenedConfig.garchBondOmega = (stochasticConfig.garchBondOmega && stochasticConfig.garchBondOmega > 0) ? stochasticConfig.garchBondOmega : DEFAULT_STOCHASTIC_CONFIG.garchBondOmega;
    flattenedConfig.garchBondAlpha = (stochasticConfig.garchBondAlpha && stochasticConfig.garchBondAlpha > 0) ? stochasticConfig.garchBondAlpha : DEFAULT_STOCHASTIC_CONFIG.garchBondAlpha;
    flattenedConfig.garchBondBeta = (stochasticConfig.garchBondBeta && stochasticConfig.garchBondBeta > 0) ? stochasticConfig.garchBondBeta : DEFAULT_STOCHASTIC_CONFIG.garchBondBeta;

    flattenedConfig.garchIntlStockOmega = (stochasticConfig.garchIntlStockOmega && stochasticConfig.garchIntlStockOmega > 0) ? stochasticConfig.garchIntlStockOmega : DEFAULT_STOCHASTIC_CONFIG.garchIntlStockOmega;
    flattenedConfig.garchIntlStockAlpha = (stochasticConfig.garchIntlStockAlpha && stochasticConfig.garchIntlStockAlpha > 0) ? stochasticConfig.garchIntlStockAlpha : DEFAULT_STOCHASTIC_CONFIG.garchIntlStockAlpha;
    flattenedConfig.garchIntlStockBeta = (stochasticConfig.garchIntlStockBeta && stochasticConfig.garchIntlStockBeta > 0) ? stochasticConfig.garchIntlStockBeta : DEFAULT_STOCHASTIC_CONFIG.garchIntlStockBeta;

    flattenedConfig.garchOtherOmega = (stochasticConfig.garchOtherOmega && stochasticConfig.garchOtherOmega > 0) ? stochasticConfig.garchOtherOmega : DEFAULT_STOCHASTIC_CONFIG.garchOtherOmega;
    flattenedConfig.garchOtherAlpha = (stochasticConfig.garchOtherAlpha && stochasticConfig.garchOtherAlpha > 0) ? stochasticConfig.garchOtherAlpha : DEFAULT_STOCHASTIC_CONFIG.garchOtherAlpha;
    flattenedConfig.garchOtherBeta = (stochasticConfig.garchOtherBeta && stochasticConfig.garchOtherBeta > 0) ? stochasticConfig.garchOtherBeta : DEFAULT_STOCHASTIC_CONFIG.garchOtherBeta;

    flattenedConfig.garchIndividualStockOmega = (stochasticConfig.garchIndividualStockOmega && stochasticConfig.garchIndividualStockOmega > 0) ? stochasticConfig.garchIndividualStockOmega : DEFAULT_STOCHASTIC_CONFIG.garchIndividualStockOmega;
    flattenedConfig.garchIndividualStockAlpha = (stochasticConfig.garchIndividualStockAlpha && stochasticConfig.garchIndividualStockAlpha > 0) ? stochasticConfig.garchIndividualStockAlpha : DEFAULT_STOCHASTIC_CONFIG.garchIndividualStockAlpha;
    flattenedConfig.garchIndividualStockBeta = (stochasticConfig.garchIndividualStockBeta && stochasticConfig.garchIndividualStockBeta > 0) ? stochasticConfig.garchIndividualStockBeta : DEFAULT_STOCHASTIC_CONFIG.garchIndividualStockBeta;

    // Ensure correlation matrix exists
    flattenedConfig.correlationMatrix = config?.correlationMatrix || DEFAULT_STOCHASTIC_CONFIG.correlationMatrix || [
      [1.0, -0.2, 0.1, 0.8, 0.3, 0.1],
      [-0.2, 1.0, 0.0, -0.1, 0.1, 0.0],
      [0.1, 0.0, 1.0, 0.2, 0.4, 0.3],
      [0.8, -0.1, 0.2, 1.0, 0.2, 0.1],
      [0.3, 0.1, 0.4, 0.2, 1.0, 0.2],
      [0.1, 0.0, 0.3, 0.1, 0.2, 1.0]
    ];
    flattenedConfig.fatTailParameter = 10.0;
    flattenedConfig.seedValue = 12345;

    // Convert events to Go FinancialEvent struct format
    const convertedEvents = (events || []).map(event => ({
      id: event.id,
      type: event.type,
      description: event.description || event.name || '',
      monthOffset: event.monthOffset || 0,
      amount: event.amount || 0,
      frequency: event.frequency || 'monthly',
      metadata: {
        // Store extra fields in metadata to avoid Go JSON parser errors
        name: event.name,
        source: event.source,
        startDateOffset: event.startDateOffset,
        endDateOffset: event.endDateOffset,
        annualGrowthRate: event.annualGrowthRate,
        priority: event.priority
      }
    }));

    // Extract minimumCashBalance from investment strategy events
    let cashStrategy: any = null;
    for (const event of (events || [])) {
      if (event.type === 'STRATEGY_ASSET_ALLOCATION_SET' && event.metadata) {
        const metadata = event.metadata as any;
        if (metadata.minimumCashBalance !== undefined && metadata.minimumCashBalance > 0) {
          cashStrategy = {
            targetReserveAmount: metadata.minimumCashBalance,
            targetReserveMonths: 0,
            autoInvestExcess: true,
            autoSellForShortfall: true
          };
          logger.info(`💰 [CASH-STRATEGY] Extracted minimumCashBalance=$${metadata.minimumCashBalance} from strategy event`);
          break; // Use first found strategy event
        }
      }
    }

    // TRACE: Critical monthsToRun being passed to WASM
    logger.info(`📦 [WORKER-POOL] Received monthsToRun=${monthsToRun} from monteCarloWorkerRunner`);

    const wasmCompatibleInput = {
      monthsToRun: monthsToRun, // Full simulation horizon restored
      initialAccounts: {
        cash: initialAccounts?.cash || 0,
        taxable: {
          holdings: initialAccounts?.taxable?.holdings || [],
          totalValue: initialAccounts?.taxable?.totalValue || 0
        },
        tax_deferred: {
          holdings: initialAccounts?.tax_deferred?.holdings || [],
          totalValue: initialAccounts?.tax_deferred?.totalValue || 0
        },
        roth: {
          holdings: initialAccounts?.roth?.holdings || [],
          totalValue: initialAccounts?.roth?.totalValue || 0
        }
      },
      events: convertedEvents,
      config: flattenedConfig, // Flattened config instead of nested { stochasticConfig: {...} }
      withdrawalStrategy: "TAX_EFFICIENT", // FIXED: Use valid WASM enum value instead of "bond_ladder"
      goals: [], // Include empty goals array as expected by WASM
      cashStrategy: cashStrategy // null if not configured, otherwise use strategy-provided value
    };

    const input = wasmCompatibleInput;

    // Clean execution - debug logs removed

    // Validate simulation input before sending to workers
    const validationResult = validateSimulationInputWithResult(input);
    if (!validationResult.isValid) {
      logValidationError('Monte Carlo simulation input validation', validationResult);
      throw new Error(`Invalid Monte Carlo simulation input: ${validationResult.errorMessage}`);
    }

    // ULTRA-PERFORMANCE: Initialize dynamic work stealing queue
    return this.runWithWorkStealing(input, numberOfRuns, startTime, progressCallback);
  }

  /**
   * JSON MARSHALLING OPTIMIZATION: Direct Monte Carlo with JSON serialization
   */
  private async runWithWorkStealing(
    input: any,
    numberOfRuns: number,
    startTime: number,
    progressCallback?: ProgressCallback
  ): Promise<any[]> {
    // HYBRID APPROACH: Use legacy batch processing (stable) for Monte Carlo
    logger.performanceLog(`Starting legacy batch Monte Carlo: ${numberOfRuns} runs with ${this.poolSize} workers`);

    // For small runs, use single worker with legacy batch processing
    if (numberOfRuns <= 10) {
      const result = await this.executeTask(
        'RUN_MONTE_CARLO_BATCH_JSON',
        { input, batchSize: numberOfRuns, startIndex: 0 },
        progressCallback,
        120000
      );

      return Array.isArray(result) ? result : [result];
    }

    // For larger runs, distribute across multiple workers with JSON marshalling
    const runsPerWorker = Math.ceil(numberOfRuns / this.poolSize);
    const workerPromises: Promise<any>[] = [];

    let totalCompleted = 0;
    let runIndex = 0;

    // Distribute runs across available workers using JSON marshalling
    for (let workerId = 0; workerId < this.poolSize && runIndex < numberOfRuns; workerId++) {
      const remainingRuns = numberOfRuns - runIndex;
      const currentWorkerRuns = Math.min(runsPerWorker, remainingRuns);

      if (currentWorkerRuns <= 0) break;

      const workerProgressCallback: ProgressCallback = {
        onProgress: (completed, _total, workerIndex) => {
          progressCallback?.onProgress?.(totalCompleted + completed, numberOfRuns, workerIndex);
        }
      };

      const workerPromise = this.executeTask(
        'RUN_MONTE_CARLO_BATCH_JSON',
        { input, batchSize: currentWorkerRuns, startIndex: runIndex },
        workerProgressCallback,
        120000 // 2 minute timeout for operations
      ).then(result => {
        totalCompleted += currentWorkerRuns;
        progressCallback?.onProgress?.(totalCompleted, numberOfRuns);

        // Legacy batch processing returns array of individual simulation results
        return Array.isArray(result) ? result : [result];
      }).catch(error => {
        logger.error(`Worker ${workerId} failed with legacy batch processing:`, 'WASM', error);
        // Return empty results for failed worker
        return Array(currentWorkerRuns).fill({
          success: false,
          error: error.message,
          finalNetWorth: 0,
          monthlyData: []
        });
      });

      workerPromises.push(workerPromise);
      runIndex += currentWorkerRuns;
    }
    
    // Wait for all workers to complete
    const workerResults = await Promise.all(workerPromises);
    const flatResults = workerResults.flat();

    // JSON MARSHALLING: Performance metrics and cleanup
    const totalTime = Date.now() - startTime;
    const avgTimePerSim = totalTime / numberOfRuns;
    logger.performanceLog(`Legacy batch Monte Carlo completed: ${numberOfRuns} sims in ${totalTime}ms (${avgTimePerSim.toFixed(1)}ms/sim), workers: ${workerPromises.length}`);

    // JSON MARSHALLING: Memory cleanup
    this.forceGarbageCollection();

    progressCallback?.onComplete?.(flatResults);
    return flatResults;
  }

  /**
   * ULTRA-PERFORMANCE: Update worker performance statistics for monitoring
   */
  private _updateWorkerStats(
    workerIndex: number,
    executionTime: number,
    batchSize: number,
    success: boolean
  ): void {
    const stats = this.workerStats.get(workerIndex);
    if (!stats) return;
    
    const timePerSim = executionTime / batchSize;
    
    // ULTRA-PERFORMANCE: Exponential moving average for performance tracking
    stats.averageSimulationTime = (stats.averageSimulationTime * 0.8) + (timePerSim * 0.2);
    stats.totalCompleted += batchSize;
    stats.successRate = success ? 
      (stats.successRate * 0.9) + 0.1 : 
      (stats.successRate * 0.9);
    stats.lastCompletionTime = Date.now();
  }

  /**
   * EXTREME: Minimal pre-allocation to stay under 100MB
   */
  private preAllocateResultObjects(): void {
    // EXTREME: Only 10 objects to minimize memory footprint
    for (let i = 0; i < 10; i++) {
      this.resultPool.push(this.createEmptyResult());
    }
    logger.performanceLog(`EXTREME: Pre-allocated only ${this.resultPool.length} result objects for <100MB target`);
  }
  
  /**
   * ULTRA-PERFORMANCE: Create optimized empty result object
   */
  private createEmptyResult() {
    return {
      success: false,
      finalNetWorth: 0,
      monthlyData: [],
      error: null,
      isBankrupt: false,
      // Pre-allocate common properties to maintain object shape
      totalReturn: 0,
      maxDrawdown: 0
    };
  }
  
  /**
   * ULTRA-AGGRESSIVE: Get result object from pool or create new
   */
  private acquireResultObject(): any {
    if (this.resultPool.length > 0) {
      const result = this.resultPool.pop()!;
      // Reset object properties instead of creating new
      result.success = false;
      result.finalNetWorth = 0;
      result.monthlyData = [];
      result.error = null;
      result.isBankrupt = false;
      result.totalReturn = 0;
      result.maxDrawdown = 0;
      return result;
    }
    return this.createEmptyResult();
  }
  
  /**
   * ULTRA-PERFORMANCE: Return result object to pool for reuse
   */
  private _releaseResultObject(result: any): void {
    if (this.resultPool.length < this.maxPoolSize) {
      // Clear arrays but keep object shape
      if (result.monthlyData) result.monthlyData.length = 0;
      this.resultPool.push(result);
    }
  }
  
  /**
   * ULTRA-AGGRESSIVE: Check memory pressure and force cleanup if needed
   */
  private _checkMemoryPressure(): void {
    const now = Date.now();
    if (now - this.lastGCTime < this.gcInterval) {
      return; // Don't check too frequently
    }
    
    // ULTRA-PERFORMANCE: Check memory usage if available  
    if ((performance as any).memory) {
      const memoryInfo = (performance as any).memory;
      const memoryUsageRatio = memoryInfo.usedJSHeapSize / memoryInfo.jsHeapSizeLimit;
      
      if (memoryUsageRatio > this.memoryPressureThreshold) {
        logger.performanceLog(`Memory pressure detected: ${(memoryUsageRatio * 100).toFixed(1)}% - forcing cleanup`);
        this.aggressiveMemoryCleanup();
      }
    }
    
    this.lastGCTime = now;
  }
  
  /**
   * ULTRA-AGGRESSIVE: Perform aggressive memory cleanup
   */
  private aggressiveMemoryCleanup(): void {
    // ULTRA-PERFORMANCE: Clear object pools
    this.resultPool.length = 0;
    
    // ULTRA-AGGRESSIVE: Clear large data structures
    this.workQueue.length = 0;
    
    // ULTRA-PERFORMANCE: Clear completed task references
    const now = Date.now();
    for (const [taskId, task] of this.activeTasks.entries()) {
      if ((task as any).completedTime && now - (task as any).completedTime > 1000) {
        this.activeTasks.delete(taskId);
      }
    }
    
    // ULTRA-AGGRESSIVE: Force immediate garbage collection
    this.forceGarbageCollection();
    
    // ULTRA-PERFORMANCE: Re-populate essential pools
    this.preAllocateResultObjects();
  }
  
  /**
   * ULTRA-AGGRESSIVE: Optimize message for efficient worker communication
   */
  private optimizeMessage(message: any): any {
    const { payload } = message;
    
    // ULTRA-PERFORMANCE: Cache input structures to avoid re-serialization
    if (payload && payload.input) {
      const inputHash = this.hashInput(payload.input);
      
      if (this.cachedInputs.has(inputHash)) {
        // Use cached serialized input
        return {
          ...message,
          payload: {
            ...payload,
            input: { __cached: true, hash: inputHash },
            _originalInput: this.cachedInputs.get(inputHash)
          }
        };
      } else {
        // Cache new input for future use
        if (this.cachedInputs.size >= this.maxCachedInputs) {
          // Clear oldest cache entry
          const firstKey = this.cachedInputs.keys().next().value;
          if (firstKey !== undefined) {
            this.cachedInputs.delete(firstKey);
          }
        }
        this.cachedInputs.set(inputHash, payload.input);
      }
    }
    
    return message;
  }
  
  /**
   * ULTRA-PERFORMANCE: Generate hash for input caching
   */
  private hashInput(input: any): string {
    // ULTRA-AGGRESSIVE: Fast hash based on key properties  
    const seedValue = input.config?.seedValue ?? 0;
    const key = `${input.monthsToRun}_${input.events?.length || 0}_${JSON.stringify(seedValue)}`;
    return key;
  }
  
  /**
   * ULTRA-AGGRESSIVE: Extract transferable objects for zero-copy message passing
   */
  private extractTransferables(payload: any): Transferable[] {
    const transferables: Transferable[] = [];
    
    // ULTRA-PERFORMANCE: Look for ArrayBuffers that can be transferred
    if (payload && typeof payload === 'object') {
      this.findTransferables(payload, transferables);
    }
    
    return transferables;
  }
  
  /**
   * ULTRA-PERFORMANCE: Recursively find transferable objects
   */
  private findTransferables(obj: any, transferables: Transferable[]): void {
    if (!obj || typeof obj !== 'object') return;
    
    if (obj instanceof ArrayBuffer) {
      transferables.push(obj);
    } else if (obj instanceof Float32Array || obj instanceof Float64Array) {
      transferables.push(obj.buffer);
    } else if (Array.isArray(obj)) {
      for (const item of obj) {
        this.findTransferables(item, transferables);
      }
    } else {
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          this.findTransferables(obj[key], transferables);
        }
      }
    }
  }
  
  
  /**
   * ULTRA-AGGRESSIVE: Force garbage collection and memory cleanup
   */
  private forceGarbageCollection(): void {
    // ULTRA-PERFORMANCE: Clear all references immediately
    this.workQueue.length = 0;
    this.cachedInputs.clear();
    this.transferableBuffers.length = 0;
    
    // ULTRA-AGGRESSIVE: Force GC if available
    if (typeof globalThis !== 'undefined' && (globalThis as any).gc) {
      (globalThis as any).gc();
      logger.performanceLog('Forced garbage collection after memory optimization');
    } else if (typeof window !== 'undefined' && (window as any).gc) {
      (window as any).gc();
      logger.performanceLog('Forced garbage collection after memory optimization');
    }
    
    // ULTRA-PERFORMANCE: Request idle callback for additional cleanup
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      (window as any).requestIdleCallback(() => {
        // Additional cleanup during idle time
        if ((globalThis as any).gc) {
          (globalThis as any).gc();
        } else if ((window as any).gc) {
          (window as any).gc();
        }
      });
    }
  }

  /**
   * Test WASM functionality
   */
  async testMathFunctions(): Promise<any> {
    await this.initialize();
    return await this.executeTask('TEST_MATH', {});
  }

  /**
   * ULTRA-PERFORMANCE: Enhanced pool statistics with work stealing metrics
   */
  getStats() {
    const workerPerformance = Array.from(this.workerStats.entries()).map(([index, stats]) => ({
      workerIndex: index,
      completedSimulations: stats.totalCompleted,
      averageTime: Math.round(stats.averageSimulationTime),
      successRate: (stats.successRate * 100).toFixed(1) + '%'
    }));
    
    return {
      poolSize: this.poolSize,
      initialized: this.initialized,
      availableWorkers: this.availableWorkers.length,
      busyWorkers: this.busyWorkers.size,
      queuedTasks: this.taskQueue.length,
      activeTasks: this.activeTasks.size,
      workStealingEnabled: this.workStealingEnabled,
      microBatchSize: this.microBatchSize,
      totalWorkUnits: this.totalWorkUnits,
      completedWorkUnits: this.completedWorkUnits,
      remainingWork: this.workQueue.length,
      workerPerformance,
      memoryOptimization: {
        resultPoolSize: this.resultPool.length,
        maxPoolSize: this.maxPoolSize,
        lastGCTime: this.lastGCTime,
        memoryPressureThreshold: this.memoryPressureThreshold
      }
    };
  }

  /**
   * Terminate all workers and clean up
   */
  terminate(): void {
    // Clear all timeouts
    for (const task of this.activeTasks.values()) {
      if (task.timeout) {
        window.clearTimeout(task.timeout);
      }
      // Reject pending tasks to prevent memory leaks
      task.reject(new Error('Worker pool terminated'));
    }

    // Terminate all workers with proper cleanup
    const cleanupPromises: Promise<void>[] = [];
    
    for (let i = 0; i < this.workers.length; i++) {
      const worker = this.workers[i];
      if (worker) {
        try {
          // Send cleanup message first
          const cleanupPromise = this.sendToWorker(i, 'CLEANUP', {}, 5000)
            .catch(() => {
              // Ignore cleanup failures, just terminate
            })
            .finally(() => {
              // Remove event listeners to prevent memory leaks
              worker.onmessage = null;
              worker.onerror = null;
              worker.terminate();
            });
          
          cleanupPromises.push(cleanupPromise);
        } catch (error) {
          logger.warn(`Failed to cleanup/terminate worker ${i}:`, 'WASM', error);
          // Still try to terminate
          try {
            worker.onmessage = null;
            worker.onerror = null;
            worker.terminate();
          } catch (termError) {
            logger.warn(`Failed to terminate worker ${i}:`, 'WASM', termError);
          }
        }
      }
    }
    
    // Wait for cleanup or timeout quickly
    Promise.allSettled(cleanupPromises).finally(() => {
      // Ensure all workers are terminated
      for (const worker of this.workers) {
        try {
          worker.terminate();
        } catch (error) {
          // Ignore final termination errors
        }
      }
    });

    // Reset state
    this.workers = [];
    this.availableWorkers = [];
    this.busyWorkers.clear();
    this.taskQueue = [];
    this.activeTasks.clear();
    this.initialized = false;
    this.initializationPromise = null;
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
  }

  /**
   * Broadcast a message to all workers (for configuration changes like verbosity)
   */
  async broadcastToAll(message: { type: string; payload: any }): Promise<void> {
    // Initialize workers if not already initialized
    if (!this.initialized) {
      console.info('[WorkerPool] Initializing workers before broadcast...');
      await this.initialize();
    }

    if (this.workers.length === 0) {
      console.warn('[WorkerPool] Cannot broadcast - no workers available after initialization');
      return;
    }

    console.info(`[WorkerPool] Broadcasting ${message.type} to ${this.workers.length} workers`);


    const promises = this.workers.map((worker, index) => {
      return new Promise<void>((resolve, reject) => {
        const messageId = `broadcast-${Date.now()}-${Math.random()}`;

        const handleResponse = (event: MessageEvent) => {
          if (event.data.id === messageId) {
            clearTimeout(timeoutId);
            worker.removeEventListener('message', handleResponse);
            if (event.data.type === 'SUCCESS') {
              console.info(`[WorkerPool] Worker ${index} responded to ${message.type}:`, event.data.payload);
              resolve();
            } else {
              console.error(`[WorkerPool] Worker ${index} failed ${message.type}:`, event.data.error);
              reject(new Error(event.data.error || 'Broadcast failed'));
            }
          }
        };

        worker.addEventListener('message', handleResponse);

        worker.postMessage({
          id: messageId,
          ...message
        });

        // Timeout after 5 seconds
        const timeoutId = setTimeout(() => {
          worker.removeEventListener('message', handleResponse);
          console.error(`[WorkerPool] Worker ${index} timeout for ${message.type}`);
          reject(new Error('Broadcast timeout'));
        }, 5000);
      });
    });

    const results = await Promise.allSettled(promises);
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    console.info(`[WorkerPool] Broadcast complete: ${successful} succeeded, ${failed} failed`);
  }

  // Worker recreation logic removed - handle failures gracefully instead
}

// Export singleton instance
export const wasmWorkerPool = new WASMWorkerPool();

export default wasmWorkerPool;
