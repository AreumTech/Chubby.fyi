/**
 * API Module - Frontend-optimized data structures
 * 
 * This module contains types specifically designed for the API boundary
 * between the simulation engine and UI components. These types prioritize
 * UI consumption patterns over simulation efficiency.
 * 
 * Key Principles:
 * 1. Pre-computed aggregations (avoid UI calculations)
 * 2. Denormalized data (reduce UI complexity)
 * 3. Chart-ready formats (minimize transformation)
 * 4. Progressive disclosure (summary → details)
 * 5. Type safety with discriminated unions
 */

// =============================================================================
// RE-EXPORTS - All API types
// =============================================================================

export * from './payload';

// =============================================================================
// API RESPONSE WRAPPERS
// =============================================================================

/**
 * Standard API response wrapper for all simulation endpoints
 */
export interface ApiResponse<T> {
  /** Response data */
  data: T;
  
  /** Request metadata */
  metadata: {
    /** Timestamp when response was generated */
    timestamp: Date;
    
    /** Time taken to process request (ms) */
    processingTime: number;
    
    /** Version of simulation engine used */
    engineVersion: string;
    
    /** Request ID for debugging */
    requestId: string;
  };
  
  /** Success indicator */
  success: boolean;
  
  /** Error information if applicable */
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  
  /** Warnings or non-critical issues */
  warnings?: Array<{
    code: string;
    message: string;
    context?: any;
  }>;
}

/**
 * Simulation request parameters
 */
export interface SimulationRequest {
  /** Configuration for the simulation */
  config: SimulationConfig;
  
  /** Events to process */
  events: any[]; // FinancialEvent[] - avoid circular dependency
  
  /** Request options */
  options?: {
    /** Include detailed monthly data */
    includeMonthlyData?: boolean;
    
    /** Include sample Monte Carlo paths */
    includeSamplePaths?: boolean;
    
    /** Number of sample paths to include */
    samplePathCount?: number;
    
    /** Maximum years to project */
    maxProjectionYears?: number;
    
    /** Whether to include debug information */
    includeDebugInfo?: boolean;
  };
}

/**
 * Simplified simulation configuration for API requests
 */
export interface SimulationConfig {
  /** Basic parameters */
  startYear: number;
  endYear: number;
  monteCarloRuns: number;
  
  /** Person information */
  currentAge: number;
  filingStatus: string;
  numberOfDependents?: number;
  
  /** Market assumptions */
  marketAssumptions?: {
    stockReturn: number;
    stockVolatility: number;
    bondReturn: number;
    bondVolatility: number;
    inflationRate: number;
  };

  /** Tax payment timing - when true, taxes paid end of year instead of April (disables tax float) */
  payTaxesEndOfYear?: boolean;

  /** Strategy configurations */
  strategies?: any[]; // PlanStrategy[] - avoid circular dependency
}

// =============================================================================
// PROGRESSIVE LOADING TYPES
// =============================================================================

/**
 * Lightweight simulation summary for initial loading
 */
export interface SimulationSummaryResponse {
  /** Basic success metrics */
  summary: {
    goalSuccessRate: number;
    projectedNetWorth: number;
    planHealthScore: number;
    riskLevel: 'low' | 'moderate' | 'high';
  };
  
  /** Key insights */
  insights: Array<{
    type: 'strength' | 'risk' | 'opportunity';
    title: string;
    description: string;
  }>;
  
  /** Chart data URLs for lazy loading */
  chartDataUrls: {
    netWorth: string;
    cashFlow: string;
    assetAllocation: string;
  };
}

/**
 * Detailed chart data for specific chart types
 */
export interface ChartDataResponse {
  /** Chart type */
  chartType: 'netWorth' | 'cashFlow' | 'assetAllocation' | 'goalProgress';
  
  /** Chart-specific data */
  data: any; // NetWorthChart | CashFlowChart | AssetAllocationChart
  
  /** Chart configuration hints */
  config: {
    recommendedWidth: number;
    recommendedHeight: number;
    defaultTimeRange: 'all' | '10y' | '20y' | '30y';
    interactionHints: string[];
  };
}

// =============================================================================
// REAL-TIME UPDATES
// =============================================================================

/**
 * Real-time simulation progress updates
 */
export interface SimulationProgressUpdate {
  /** Progress percentage (0-100) */
  progress: number;
  
  /** Current processing stage */
  stage: 'preprocessing' | 'simulation' | 'analysis' | 'formatting' | 'complete';
  
  /** Stage-specific message */
  message: string;
  
  /** Estimated time remaining (seconds) */
  estimatedTimeRemaining?: number;
  
  /** Intermediate results (if available) */
  partialResults?: {
    completedRuns: number;
    totalRuns: number;
    preliminaryResults?: any;
  };
}

/**
 * WebSocket message types for real-time communication
 */
export type WebSocketMessage = 
  | { type: 'simulation_progress'; data: SimulationProgressUpdate }
  | { type: 'simulation_complete'; data: ApiResponse<any> }
  | { type: 'simulation_error'; data: { error: string; details?: any } }
  | { type: 'heartbeat'; data: { timestamp: Date } };

// =============================================================================
// CACHING AND OPTIMIZATION
// =============================================================================

/**
 * Cache metadata for optimization
 */
export interface CacheMetadata {
  /** Unique cache key */
  cacheKey: string;
  
  /** When this data was computed */
  computedAt: Date;
  
  /** When this data expires */
  expiresAt: Date;
  
  /** Data fingerprint for change detection */
  fingerprint: string;
  
  /** Dependencies that could invalidate cache */
  dependencies: string[];
  
  /** Size of cached data (bytes) */
  dataSize: number;
}

/**
 * Cached response with metadata
 */
export interface CachedResponse<T> {
  /** Cached data */
  data: T;
  
  /** Cache metadata */
  cache: CacheMetadata;
  
  /** Whether data was served from cache */
  fromCache: boolean;
}

// =============================================================================
// ERROR HANDLING
// =============================================================================

/**
 * Structured error types for better error handling
 */
export interface SimulationError {
  /** Error category */
  category: 'validation' | 'computation' | 'timeout' | 'memory' | 'system';
  
  /** Error code */
  code: string;
  
  /** Human-readable message */
  message: string;
  
  /** Technical details */
  details: {
    /** Stack trace (in development) */
    stack?: string;
    
    /** Input that caused error */
    input?: any;
    
    /** Suggested fixes */
    suggestions?: string[];
    
    /** Related documentation */
    documentation?: string;
  };
  
  /** Whether error is recoverable */
  recoverable: boolean;
  
  /** Retry information */
  retry?: {
    /** Whether retry is recommended */
    recommended: boolean;
    
    /** Suggested delay before retry (ms) */
    delayMs?: number;
    
    /** Maximum retry attempts */
    maxAttempts?: number;
  };
}