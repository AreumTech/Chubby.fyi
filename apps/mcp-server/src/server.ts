#!/usr/bin/env node

/**
 * AreumFire MCP Server (SSE Transport)
 *
 * Server-Sent Events transport for ChatGPT Apps SDK integration.
 * This server exposes the same tools as the stdio server but uses HTTP/SSE
 * for browser-based clients.
 *
 * Endpoints:
 *   GET  /mcp          - SSE stream for MCP messages
 *   POST /mcp/messages - POST endpoint for client messages
 *   GET  /health       - Health check
 *   GET  /viewer       - Privacy-first fragment viewer
 *
 * Based on: reference/openai-apps-sdk-examples/kitchen_sink_server_node
 *
 * Claude Connector Support:
 *   In addition to OpenAI's _meta widget protocol, we generate a fragment URL
 *   for privacy-first viewing. The fragment payload is NEVER sent to the server.
 */

import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import * as pako from 'pako';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListResourceTemplatesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
  type CallToolRequest,
  type Resource,
  type ResourceTemplate,
  type Tool,
} from '@modelcontextprotocol/sdk/types.js';

import { handleRunSimulation } from './tools/runSimulation.js';
import { RUN_SIMULATION_TOOL, WIDGET_TEMPLATE_URI, WIDGET_VERSION } from './tools/toolDefinition.js';
import type { RunSimulationParams } from './types.js';

// Directory paths
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.resolve(__dirname, '..', 'public');

// WIDGET_VERSION and WIDGET_TEMPLATE_URI imported from toolDefinition.ts
const WIDGET_MIME_TYPE = 'text/html+skybridge';

// Fragment viewer URL for Claude connector (privacy-first)
// The payload in the fragment (#d=...) is NEVER sent to the server
const WIDGET_VIEWER_BASE_URL = process.env.WIDGET_VIEWER_URL || 'https://widget.chubby.fyi';

/**
 * Generate a privacy-first fragment URL for the simulation viewer.
 *
 * The fragment payload (#d=...) is NEVER sent to the server per browser security:
 * - Not in access logs, CDN logs, load balancers, or analytics
 * - The server literally cannot see it
 *
 * This enables Claude users to view simulation results without any data
 * being sent to external servers.
 *
 * @param result - Simulation result to encode
 * @returns Fragment URL or null if compression fails
 */
function generateFragmentUrl(result: any): string | null {
  try {
    // Build lean payload for fragment (minimize size)
    // Target: <2KB compressed for URL safety
    const leanPayload = {
      runId: result.runId,
      success: result.success,
      inputs: result.inputs,
      mc: result.mc ? {
        finalNetWorthP10: result.mc.finalNetWorthP10,
        finalNetWorthP50: result.mc.finalNetWorthP50,
        finalNetWorthP75: result.mc.finalNetWorthP75,
        runwayP10: result.mc.runwayP10,
        runwayP50: result.mc.runwayP50,
        runwayP75: result.mc.runwayP75,
        constraintProbability: result.mc.constraintProbability,
        netWorthTrajectory: result.mc.netWorthTrajectory,
      } : undefined,
      netWorthTrajectory: result.netWorthTrajectory,
      planDuration: result.planDuration,
      schedule: result.schedule,
      phaseInfo: result.phaseInfo,
      pathsRun: result.pathsRun,
      baseSeed: result.baseSeed,
      // Start year for calendar calculations
      startYear: result.startYear,
      // Year inspector data (~420 bytes compressed)
      annualSnapshots: result.annualSnapshots,
      // First-month events for "show the math" (~420 bytes compressed total)
      firstMonthEvents: result.firstMonthEvents,
    };

    // Compress with pako (gzip)
    const jsonStr = JSON.stringify(leanPayload);
    const compressed = pako.deflate(jsonStr);

    // Convert to base64
    const base64 = Buffer.from(compressed).toString('base64');

    // Log payload size for monitoring
    const originalSize = jsonStr.length;
    const compressedSize = base64.length;
    console.error(`📦 Fragment payload: ${originalSize} bytes → ${compressedSize} bytes (${Math.round(compressedSize / originalSize * 100)}%)`);

    // Warn if payload is too large for URL
    if (compressedSize > 8000) {
      console.error(`⚠️ Fragment payload may be too large for some browsers (${compressedSize} bytes)`);
    }

    return `${WIDGET_VIEWER_BASE_URL}/viewer#d=${base64}`;
  } catch (err) {
    console.error('Failed to generate fragment URL:', err);
    return null;
  }
}

/**
 * Read widget HTML from public directory
 */
function readWidgetHtml(): string {
  const widgetPath = path.join(PUBLIC_DIR, 'simulation-widget.html');
  if (!fs.existsSync(widgetPath)) {
    throw new Error(`Widget HTML not found at ${widgetPath}`);
  }
  return fs.readFileSync(widgetPath, 'utf8');
}

/**
 * OpenAI Apps SDK metadata for tool descriptors
 */
function toolDescriptorMeta() {
  return {
    'openai/outputTemplate': WIDGET_TEMPLATE_URI,
    'openai/toolInvocation/invoking': 'Running Monte Carlo simulation...',
    'openai/toolInvocation/invoked': 'Simulation complete',
    'openai/widgetAccessible': true,
    'openai/widgetDomain': 'chubby-simulation',
    'openai/widgetCSP': {
      connect_domains: [],
      resource_domains: [],
    },
  } as const;
}

// Load widget HTML at startup
let widgetHtml: string;
try {
  widgetHtml = readWidgetHtml();
} catch (e) {
  console.error('Warning: Widget HTML not loaded. Widget resources will not be available.');
  widgetHtml = '<html><body>Widget not available</body></html>';
}

/**
 * Tool definitions for MCP (imported from shared toolDefinition.ts)
 */
const tools: Tool[] = [
  {
    ...RUN_SIMULATION_TOOL,
    _meta: toolDescriptorMeta(),
  } as Tool,
];


/**
 * Resource definitions for widget HTML
 */
const resources: Resource[] = [
  {
    name: 'Simulation Summary Widget',
    uri: WIDGET_TEMPLATE_URI,
    description: 'AreumFire simulation summary widget for ChatGPT inline display',
    mimeType: WIDGET_MIME_TYPE,
    _meta: toolDescriptorMeta(),
  },
];

const resourceTemplates: ResourceTemplate[] = [
  {
    name: 'Simulation Summary Widget Template',
    uriTemplate: WIDGET_TEMPLATE_URI,
    description: 'AreumFire simulation summary widget template',
    mimeType: WIDGET_MIME_TYPE,
    _meta: toolDescriptorMeta(),
  },
];

/**
 * Create MCP server instance with all handlers
 */
function createMcpServer(): Server {
  const server = new Server(
    {
      name: 'areumfire-mcp-server',
      version: '1.0.0',
    },
    {
      capabilities: {
        resources: {},
        tools: {},
      },
    }
  );

  // List tools handler
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools,
  }));

  // List resources handler
  server.setRequestHandler(ListResourcesRequestSchema, async () => ({
    resources,
  }));

  // List resource templates handler
  server.setRequestHandler(ListResourceTemplatesRequestSchema, async () => ({
    resourceTemplates,
  }));

  // Read resource handler (serves widget HTML)
  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    if (request.params.uri === WIDGET_TEMPLATE_URI) {
      // ETag for cache validation (based on widget version)
      const etag = `"widget-${WIDGET_VERSION}"`;

      return {
        contents: [
          {
            uri: WIDGET_TEMPLATE_URI,
            mimeType: WIDGET_MIME_TYPE,
            text: widgetHtml,
            _meta: {
              ...toolDescriptorMeta(),
              // Cache headers for widget resource
              'cache-control': 'public, max-age=3600', // 1 hour
              etag: etag,
            },
          },
        ],
      };
    }
    throw new Error(`Unknown resource: ${request.params.uri}`);
  });

  // Call tool handler
  server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest) => {
    const { name, arguments: args } = request.params;

    // Log incoming request for debugging
    console.error(`\n${'='.repeat(60)}`);
    console.error(`📨 MCP Request: ${name}`);
    console.error(`${'='.repeat(60)}`);
    console.error(`Arguments: ${JSON.stringify(args, null, 2)}`);
    console.error(`${'='.repeat(60)}\n`);

    if (name === 'run_simulation_packet') {
      const params = args as unknown as RunSimulationParams;

      // Log key params for quick debugging
      console.error(`🔧 Simulation params:`);
      console.error(`   seed: ${params.seed}`);
      console.error(`   currentAge: ${params.currentAge}`);
      console.error(`   investableAssets: ${params.investableAssets}`);
      console.error(`   annualSpending: ${params.annualSpending}`);
      console.error(`   expectedIncome: ${params.expectedIncome}`);
      console.error(`   horizonMonths: ${params.horizonMonths || 360}`);
      console.error(`   mcPaths: ${params.mcPaths || 100}`);
      if (params.incomeChange) console.error(`   incomeChange: ${JSON.stringify(params.incomeChange)}`);
      if (params.spendingChange) console.error(`   spendingChange: ${JSON.stringify(params.spendingChange)}`);
      if (params.socialSecurity) console.error(`   socialSecurity: ${JSON.stringify(params.socialSecurity)}`);

      const startTime = Date.now();
      const result = await handleRunSimulation(params);
      const elapsed = Date.now() - startTime;

      console.error(`✅ Simulation complete in ${elapsed}ms`);

      // Format runway for text summary (phase-aware)
      const horizonMonths = result.inputs?.horizonMonths || 360;
      const horizonYears = Math.round(horizonMonths / 12);
      const breachPct = result.mc?.everBreachProbability
        ? Math.round(result.mc.everBreachProbability * 100)
        : 0;
      const phase = result.phaseInfo?.phase || 'transition';

      // Format runway months as human-readable string
      const formatRunwayText = (months?: number): string => {
        if (months === undefined || months === null) return '?';
        if (months >= horizonMonths) return `≥${horizonYears} yr`;
        const years = Math.floor(months / 12);
        const mo = months % 12;
        if (years === 0) return `${mo} mo`;
        if (mo === 0) return `${years} yr`;
        return `${years} yr ${mo} mo`;
      };

      // Use P75 not P90 (no tail theater)
      const runwayP75 = result.mc?.runwayP75 !== undefined ? result.mc.runwayP75 : result.mc?.runwayP90;

      // Build phase-aware text summary
      let textSummary: string;
      if (!result.success && !result.mc) {
        textSummary = `Simulation failed: ${result.error}`;
      } else if (phase === 'accumulation') {
        // Mode A: Lead with net worth growth, runway is secondary
        textSummary = `Simulation complete (${result.runId}).

Net worth trajectories show outcome dispersion over ${horizonYears} years.
Widget displays growth potential across P10/P50/P75 paths.

Ask "what if income changed?" or "what if I retired at X?" to explore.`;
      } else if (phase === 'decumulation') {
        // Mode C: Lead with runway, mention flexibility if available
        const runwayText = breachPct <= 2
          ? `No constraint observed within ${horizonYears}-year horizon`
          : `${formatRunwayText(result.mc?.runwayP50)} median runway`;

        const flexNote = result.flexibilityCurve && result.flexibilityCurve.length > 0
          ? ' Flexibility curve shows spending headroom.'
          : '';

        textSummary = `Simulation complete (${result.runId}).

${runwayText}. ${breachPct}% of paths reached constraint.${flexNote}

Ask "what if spending increased?" to explore scenarios.`;
      } else {
        // Mode B (transition): Show both runway and trajectory note
        const runwayText = breachPct === 0
          ? `≥${horizonYears} years (no constraint observed)`
          : `${formatRunwayText(result.mc?.runwayP50)} median, ${formatRunwayText(result.mc?.runwayP10)}–${formatRunwayText(runwayP75)} range`;

        textSummary = `Simulation complete (${result.runId}).

Runway: ${runwayText}
Shows growth phase then retirement drawdown.

The widget shows trajectories and constraint timing.`;
      }

      // Sample trajectory at key intervals for model narration
      // Uses 5-year intervals for horizons ≤25yr, 10-year for longer
      const sampleTrajectoryForModel = (
        trajectory: Array<{ monthOffset?: number; month?: number; p10?: number; p50?: number; p75?: number }> | undefined,
        currentAge: number,
        horizonMonths: number
      ) => {
        if (!trajectory || trajectory.length === 0) return [];

        const horizonYears = Math.floor(horizonMonths / 12);
        const interval = horizonYears > 25 ? 10 : 5;

        // Sample at intervals + always include start and end
        const sampled: Array<{ age: number; p10: number; p50: number; p75: number }> = [];
        const seenAges = new Set<number>();

        // Helper to find closest point for a given month offset
        const findPoint = (targetMonth: number) => {
          let closest = trajectory[0];
          let minDiff = Math.abs((trajectory[0]?.monthOffset ?? trajectory[0]?.month ?? 0) - targetMonth);
          for (const pt of trajectory) {
            const diff = Math.abs((pt.monthOffset ?? pt.month ?? 0) - targetMonth);
            if (diff < minDiff) {
              minDiff = diff;
              closest = pt;
            }
          }
          return closest;
        };

        // Start (age now)
        const startPt = findPoint(0);
        sampled.push({
          age: currentAge,
          p10: Math.round(startPt?.p10 ?? startPt?.p50 ?? 0),
          p50: Math.round(startPt?.p50 ?? 0),
          p75: Math.round(startPt?.p75 ?? startPt?.p50 ?? 0),
        });
        seenAges.add(currentAge);

        // Interval points (5yr or 10yr)
        const endAge = currentAge + horizonYears;
        for (let age = Math.ceil(currentAge / interval) * interval; age < endAge; age += interval) {
          if (seenAges.has(age)) continue;
          const monthOffset = (age - currentAge) * 12;
          const pt = findPoint(monthOffset);
          sampled.push({
            age,
            p10: Math.round(pt?.p10 ?? pt?.p50 ?? 0),
            p50: Math.round(pt?.p50 ?? 0),
            p75: Math.round(pt?.p75 ?? pt?.p50 ?? 0),
          });
          seenAges.add(age);
        }

        // End (horizon age)
        if (!seenAges.has(endAge)) {
          const endPt = findPoint(horizonMonths);
          sampled.push({
            age: endAge,
            p10: Math.round(endPt?.p10 ?? endPt?.p50 ?? 0),
            p50: Math.round(endPt?.p50 ?? 0),
            p75: Math.round(endPt?.p75 ?? endPt?.p50 ?? 0),
          });
        }

        return sampled.sort((a, b) => a.age - b.age);
      };

      const currentAge = result.inputs?.currentAge ?? 35;
      const horizonMo = result.inputs?.horizonMonths ?? 360;

      // Build payload for both model context and widget rendering
      // Widget needs full trajectory; model gets sampled trajectoryByAge for narration
      const modelSummary = {
        success: result.success,
        runId: result.runId,
        pathsRun: result.pathsRun,
        baseSeed: result.baseSeed,
        // Plan duration summary (primary output)
        planDuration: result.planDuration,
        // Key inputs for context
        inputs: result.inputs,
        // MC percentiles
        mc: {
          runwayP10: result.mc?.runwayP10,
          runwayP50: result.mc?.runwayP50,
          runwayP75: result.mc?.runwayP75,
          finalNetWorthP50: result.mc?.finalNetWorthP50,
          everBreachProbability: result.mc?.everBreachProbability,
        },
        // Full trajectory for widget rendering (required for bar chart)
        netWorthTrajectory: result.netWorthTrajectory,
        // Sampled trajectory for model narration (5-7 points instead of 30+)
        trajectoryByAge: sampleTrajectoryForModel(result.netWorthTrajectory, currentAge, horizonMo),
        // Schedule summary
        schedule: result.schedule,
        // Annual snapshots for year inspector
        annualSnapshots: result.annualSnapshots,
        // Phase info
        phaseInfo: result.phaseInfo,
        // Error if any
        ...(result.error && { error: result.error }),
      };

      // Log response summary
      const modelSummarySize = JSON.stringify(modelSummary).length;
      const fullResultSize = JSON.stringify(result).length;
      console.error(`📤 Response summary:`);
      console.error(`   success: ${result.success}`);
      console.error(`   runId: ${result.runId}`);
      if (result.mc) {
        console.error(`   finalNetWorthP50: ${result.mc.finalNetWorthP50?.toLocaleString()}`);
        console.error(`   runwayP50: ${result.mc.runwayP50}`);
        console.error(`   trajectoryPoints: ${result.netWorthTrajectory?.length || 0}`);
      }
      // Debug: Log annualSnapshots and firstMonthEvents presence
      console.error(`   annualSnapshots: ${result.annualSnapshots?.length || 0} entries`);
      console.error(`   firstMonthEvents: ${Object.keys(result.firstMonthEvents || {}).length} ages`);
      if (result.traceNote) {
        console.error(`   ⚠️ traceNote: ${result.traceNote.message}`);
      }
      if (result.error) {
        console.error(`   ❌ error: ${result.error}`);
      }
      console.error(`📊 Payload optimization:`);
      console.error(`   structuredContent (model): ${modelSummarySize} bytes`);
      console.error(`   _meta.widgetData (widget): ${fullResultSize} bytes`);
      console.error(`   Reduction: ${Math.round((1 - modelSummarySize / fullResultSize) * 100)}%`);
      console.error(`${'='.repeat(60)}\n`);

      // Generate fragment URL for Claude connector (privacy-first)
      // The fragment payload is NEVER sent to the server
      const fragmentUrl = generateFragmentUrl(result);

      // Build text content with visualization link for Claude
      // Claude ignores _meta, so we include the link in the text content
      let textContent = textSummary;
      if (fragmentUrl) {
        textContent += `\n\n📊 [View interactive visualization](${fragmentUrl})\n\n_Your data never leaves your browser._`;
      }

      return {
        content: [
          {
            type: 'text',
            text: textContent,
          },
        ],
        // Apps SDK: lean summary for model context (no trajectory arrays)
        structuredContent: modelSummary,
        // Apps SDK: full data for widget rendering + template metadata
        // Claude ignores these, ChatGPT uses them for embedded widget
        _meta: {
          'openai/outputTemplate': WIDGET_TEMPLATE_URI,
          'openai/toolInvocation/invoking': 'Running Monte Carlo simulation...',
          'openai/toolInvocation/invoked': 'Simulation complete',
          // Full result for widget (not sent to model)
          widgetData: result,
        },
      };
    }

    throw new Error(`Unknown tool: ${name}`);
  });

  return server;
}

// Session management for SSE connections
type SessionRecord = {
  server: Server;
  transport: SSEServerTransport;
};

const sessions = new Map<string, SessionRecord>();

// HTTP endpoints
const SSE_PATH = '/mcp';
const POST_PATH = '/mcp/messages';

/**
 * Handle SSE connection request
 */
async function handleSseRequest(res: ServerResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const server = createMcpServer();
  const transport = new SSEServerTransport(POST_PATH, res);
  const sessionId = transport.sessionId;

  sessions.set(sessionId, { server, transport });

  transport.onclose = () => {
    sessions.delete(sessionId);
    console.error(`🔌 Session closed: ${sessionId}`);
    // Note: Don't call server.close() here as it creates a circular call
    // The session is already being cleaned up by deleting from sessions map
  };

  transport.onerror = (error) => {
    console.error('SSE transport error:', error);
  };

  try {
    await server.connect(transport);
    console.error(`\n${'🔗'.repeat(20)}`);
    console.error(`🔗 MCP Client Connected! Session: ${sessionId}`);
    console.error(`${'🔗'.repeat(20)}\n`);
  } catch (error) {
    sessions.delete(sessionId);
    console.error('Failed to start SSE session:', error);
    if (!res.headersSent) {
      res.writeHead(500).end('Failed to establish SSE connection');
    }
  }
}

/**
 * Handle POST message from client
 */
async function handlePostMessage(req: IncomingMessage, res: ServerResponse, url: URL) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'content-type');

  const sessionId = url.searchParams.get('sessionId');

  if (!sessionId) {
    res.writeHead(400).end('Missing sessionId query parameter');
    return;
  }

  const session = sessions.get(sessionId);

  if (!session) {
    res.writeHead(404).end('Unknown session');
    return;
  }

  try {
    await session.transport.handlePostMessage(req, res);
  } catch (error) {
    console.error('Failed to process message:', error);
    if (!res.headersSent) {
      res.writeHead(500).end('Failed to process message');
    }
  }
}

/**
 * Serve static files from public directory
 * Includes path traversal protection
 */
function serveStaticFile(res: ServerResponse, filePath: string) {
  // Resolve to absolute path and prevent directory traversal
  const fullPath = path.resolve(PUBLIC_DIR, filePath);

  // Security: ensure resolved path is within PUBLIC_DIR
  if (!fullPath.startsWith(PUBLIC_DIR + path.sep) && fullPath !== PUBLIC_DIR) {
    res.writeHead(403).end('Forbidden');
    return;
  }

  if (!fs.existsSync(fullPath)) {
    res.writeHead(404).end('Not Found');
    return;
  }

  const ext = path.extname(filePath);
  const contentType =
    ext === '.html' ? 'text/html' :
    ext === '.css' ? 'text/css' :
    ext === '.js' ? 'application/javascript' :
    'text/plain';

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', contentType);
  res.writeHead(200);
  fs.createReadStream(fullPath).pipe(res);
}

// Server port
const PORT = Number(process.env.PORT ?? 8000);

// Create HTTP server
const httpServer = createServer(async (req: IncomingMessage, res: ServerResponse) => {
  if (!req.url) {
    res.writeHead(400).end('Missing URL');
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host ?? 'localhost'}`);

  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'content-type',
    });
    res.end();
    return;
  }

  // Root path - return server info for ChatGPT connector discovery
  if (req.method === 'GET' && url.pathname === '/') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');
    res.writeHead(200).end(JSON.stringify({
      name: 'areumfire-mcp-server',
      version: '1.0.0',
      description: 'AreumFire Monte Carlo financial simulation',
      mcp_endpoint: '/mcp'
    }));
    return;
  }

  // Health check
  if (req.method === 'GET' && url.pathname === '/health') {
    res.setHeader('Content-Type', 'application/json');
    res.writeHead(200).end(JSON.stringify({ status: 'ok', sessions: sessions.size }));
    return;
  }

  // SSE stream
  if (req.method === 'GET' && url.pathname === SSE_PATH) {
    await handleSseRequest(res);
    return;
  }

  // POST messages
  if (req.method === 'POST' && url.pathname === POST_PATH) {
    await handlePostMessage(req, res, url);
    return;
  }

  // Static files (widget HTML, etc.)
  if (req.method === 'GET' && url.pathname.startsWith('/public/')) {
    const filePath = url.pathname.replace('/public/', '');
    serveStaticFile(res, filePath);
    return;
  }

  // Serve widget directly at /widget or /simulation-widget.html
  if (req.method === 'GET' && (url.pathname === '/widget' || url.pathname === '/simulation-widget.html')) {
    serveStaticFile(res, 'simulation-widget.html');
    return;
  }

  // Serve test harness at /test or /widget-test.html
  if (req.method === 'GET' && (url.pathname === '/test' || url.pathname === '/widget-test.html')) {
    serveStaticFile(res, 'widget-test.html');
    return;
  }

  // Serve privacy-first fragment viewer at /viewer or /viewer.html
  // This is the Claude connector visualization endpoint
  if (req.method === 'GET' && (url.pathname === '/viewer' || url.pathname === '/viewer.html')) {
    serveStaticFile(res, 'viewer.html');
    return;
  }

  // OAuth discovery endpoints - return JSON 404 to indicate no OAuth
  // This prevents ChatGPT connector from getting confused by HTML 404
  if (url.pathname === '/.well-known/oauth-authorization-server' ||
      url.pathname === '/.well-known/oauth-protected-resource' ||
      url.pathname === '/.well-known/openid-configuration' ||
      url.pathname === '/register' ||
      url.pathname === '/authorize' ||
      url.pathname === '/token') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');
    res.writeHead(404).end(JSON.stringify({
      error: 'not_found',
      error_description: 'This server does not require authentication'
    }));
    return;
  }

  res.writeHead(404).end('Not Found');
});

httpServer.on('clientError', (err: Error, socket) => {
  console.error('HTTP client error:', err);
  socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
});

httpServer.listen(PORT, () => {
  console.log(`\nAreumFire MCP Server (SSE) listening on http://localhost:${PORT}`);
  console.log(`\nEndpoints:`);
  console.log(`  GET  http://localhost:${PORT}${SSE_PATH}              - SSE stream for MCP`);
  console.log(`  POST http://localhost:${PORT}${POST_PATH}?sessionId=X - POST messages`);
  console.log(`  GET  http://localhost:${PORT}/health                  - Health check`);
  console.log(`  GET  http://localhost:${PORT}/widget                  - Widget preview (ChatGPT)`);
  console.log(`  GET  http://localhost:${PORT}/viewer                  - Fragment viewer (Claude)`);
  console.log(`  GET  http://localhost:${PORT}/test                    - Test harness`);
  console.log(`\nSessions: ${sessions.size}`);
});
