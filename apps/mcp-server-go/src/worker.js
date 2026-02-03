/**
 * Cloudflare Worker glue code for AreumFire MCP Server
 *
 * This Worker proxies requests to the Go container running on Cloudflare Containers.
 * The Go server handles all MCP protocol logic and simulation computation.
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // CORS preflight handling
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    // Route to container
    const containerUrl = new URL(url.pathname + url.search, 'http://localhost:8080');

    // Forward the request to the container
    const containerRequest = new Request(containerUrl, {
      method: request.method,
      headers: request.headers,
      body: request.body,
    });

    try {
      const response = await fetch(containerRequest);

      // Clone response and add CORS headers
      const headers = new Headers(response.headers);
      headers.set('Access-Control-Allow-Origin', '*');

      // For SSE, ensure proper headers
      if (url.pathname === '/mcp' && response.headers.get('Content-Type')?.includes('text/event-stream')) {
        headers.set('Cache-Control', 'no-cache');
        headers.set('Connection', 'keep-alive');
      }

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    } catch (error) {
      console.error('Container proxy error:', error);
      return new Response(JSON.stringify({ error: 'Container unavailable' }), {
        status: 503,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
  },
};
