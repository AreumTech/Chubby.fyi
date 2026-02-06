# Claude Connector for Chubby

This guide explains how to connect Chubby's Monte Carlo financial simulation to Claude via Settings > Connectors.

## Quick Start

**Requirements:** Claude Pro/Max/Team/Enterprise with Connectors enabled.

**Notes:**
- Mobile: you can use connectors on mobile, but you must add them on web/desktop first.

### Add the Connector (Claude Web or Desktop)

1. Open Claude → **Settings > Connectors**
2. Click **Add connector**
3. Enter the MCP server URL:
   - Production: `https://mcp.chubby.fyi/mcp`
   - Local dev: use a tunnel URL (see Local Development)
4. Name it "Chubby" (or any name you prefer)
5. Click **Add**, then toggle it **On**

> Note: Remote MCP servers are added via **Settings > Connectors** (not `claude_desktop_config.json`).

## Usage

Once connected, you can ask Claude questions like:

- "Run a simulation with $500k assets, $60k spending, age 35, income $120k"
- "What if I retire at 55 with $2M saved?"
- "How much can I spend annually with $1.5M at age 60?"

Claude will:
1. Call the `run_simulation_packet` tool
2. Return a text summary with P10/P50/P75 percentiles
3. Include a link to view the interactive visualization

## Privacy Architecture

### Your Data Never Leaves Your Browser

This is not marketing — it's architecturally enforced.

When you click the visualization link, you'll see a URL like:

```
https://widget.chubby.fyi/viewer#d=eJxLTEo...
```

**The `#d=...` fragment is NEVER sent over HTTP.** This is browser security, not a choice:

- ❌ Not in access logs
- ❌ Not in CDN logs
- ❌ Not in load balancers
- ❌ Not in analytics
- ✅ The server literally cannot see it

### How It Works

1. MCP server runs simulation → gets result
2. Server compresses result: `pako.deflate(JSON.stringify(data))`
3. Server returns text summary + fragment URL
4. User clicks link → browser loads static HTML
5. JavaScript reads `window.location.hash` → decompresses → renders
6. Refresh clears everything (no localStorage)

### Privacy Boundary

```
                    ┌─────────────────────────────┐
                    │       PRIVACY BOUNDARY      │
                    │  (data crosses this line)   │
                    └─────────────────────────────┘
                                  │
    SERVER SIDE                   │              CLIENT SIDE
    (can see)                     │              (private)
                                  │
    ✓ Simulation request          │              ✗ Widget data
      (age, assets, spending)     │              ✗ Visualization
                                  │              ✗ Fragment payload
    ✓ Tool invocation logs        │
                                  │
    ✗ Fragment payload ───────────┼──────────── ✓ Fragment payload
      (never sent to server)      │              (rendered locally)
```

## Comparison: ChatGPT vs Claude

| Aspect | ChatGPT App | Claude Connector |
|--------|-------------|------------------|
| Widget rendering | Embedded iframe via `_meta` | Fragment URL → standalone viewer |
| Data transport | Server-side widget data | Client-side only (hash fragment) |
| Privacy model | OpenAI sees widget data | Zero server visibility |
| Result display | Interactive chart in chat | Text + "View visualization" link |

## Tool Reference

### `run_simulation_packet`

Run deterministic Monte Carlo financial simulation.

**Required Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `investableAssets` | number | Total investable assets in dollars |
| `annualSpending` | number | Annual spending in dollars |
| `currentAge` | number | Current age in years (18-100) |
| `expectedIncome` | number | Expected annual income in dollars |
| `seed` | number | Random seed for deterministic simulation |
| `startYear` | number | Simulation start year (e.g., 2024) |

**Optional Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `horizonMonths` | number | Simulation horizon (default: to age 80) |
| `mcPaths` | number | Monte Carlo paths (default: 100) |
| `incomeChange` | object | Income regime change (retirement, job change) |
| `spendingChange` | object | Spending regime change |
| `socialSecurity` | object | Social Security benefits |
| `contributions` | object | 401k contributions and employer match |
| `accountBuckets` | object | Asset allocation across account types |

**Example:**

```json
{
  "investableAssets": 500000,
  "annualSpending": 60000,
  "currentAge": 35,
  "expectedIncome": 120000,
  "seed": 12345,
  "startYear": 2024
}
```

## Local Development

### Running the MCP Server

```bash
cd apps/mcp-server
npm run dev
```

Server starts on `http://localhost:8000`.

### Testing with Claude Desktop

1. Start the MCP server locally
2. Start a tunnel:
   ```bash
   npm run chatgpt:tunnel
   ```
3. Copy the tunnel URL (e.g., `https://xxxx.ngrok-free.app/mcp`)
4. Add it via **Settings > Connectors > Add connector**
5. Test with: "Run a simulation with $500k assets"

### Testing with Claude.ai (Remote)

1. Start MCP server with tunnel:
   ```bash
   npm run chatgpt:tunnel
   ```
2. Copy the ngrok URL (e.g., `https://xxxx.ngrok-free.app`)
3. Add as a connector in Claude Settings
4. Test with a simulation request

### Verifying Privacy

1. Open browser DevTools → Network tab
2. Click the visualization link
3. Observe:
   - One request to load `viewer.html` (static file)
   - Zero requests containing simulation data
   - Fragment payload only visible in browser

## Deployment

### Static Sites (GitHub Pages)

| Site | Domain | Contents |
|------|--------|----------|
| Landing | `chubby.fyi` | Product info, setup guide |
| Widget | `widget.chubby.fyi` | `viewer.html`, `pako.min.js` |

### MCP Server (Fly.io)

```bash
cd apps/mcp-server
fly launch --name chubby-mcp
fly deploy
# URL: https://chubby-mcp.fly.dev/mcp
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 8000 | Server port |
| `SIMULATION_SERVICE_URL` | `http://localhost:3002` | WASM simulation service |
| `WIDGET_VIEWER_URL` | `https://widget.chubby.fyi` | Fragment viewer base URL |

## Troubleshooting

### "Tool not found" Error

- Ensure the MCP server is running
- Check the connector URL ends with `/mcp`
- Verify no trailing slash issues

### Visualization Link Not Working

- Ensure `WIDGET_VIEWER_URL` points to the correct host
- For local testing, use `http://localhost:8000/viewer`
- Check browser console for decompression errors

### Large Payload Warning

If you see "Fragment payload may be too large":
- The simulation result exceeds the recommended 8KB URL limit
- Most browsers support larger fragments, but some may truncate
- Consider reducing `mcPaths` or `horizonMonths`

## Support

- Issues: https://github.com/anthropics/claude-code/issues
- Documentation: https://chubby.fyi/docs
