package widget

import (
	_ "embed"
)

// HTML is the embedded widget HTML
// Use go:embed to include the widget HTML file at build time
//
//go:embed simulation-widget.html
var HTML string

// TestHarnessHTML is a simple test page
var TestHarnessHTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>AreumFire Test Harness (Go)</title>
  <style>
    body {
      font-family: system-ui, sans-serif;
      max-width: 800px;
      margin: 40px auto;
      padding: 20px;
      background: #f9f9f9;
    }
    h1 { color: #333; }
    .status { padding: 12px; border-radius: 8px; margin: 16px 0; }
    .status.ok { background: #d4edda; color: #155724; }
    .endpoint { font-family: monospace; background: #e9ecef; padding: 4px 8px; border-radius: 4px; }
    pre { background: #f8f9fa; padding: 16px; border-radius: 8px; overflow-x: auto; }
    .form { background: white; padding: 20px; border-radius: 12px; margin: 20px 0; }
    .form label { display: block; margin: 12px 0 4px; font-weight: 500; }
    .form input { width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 6px; }
    .form button { margin-top: 16px; padding: 12px 24px; background: #007bff; color: white; border: none; border-radius: 8px; cursor: pointer; }
    .form button:hover { background: #0056b3; }
    #result { margin-top: 20px; }
  </style>
</head>
<body>
  <h1>AreumFire MCP Server (Go) - Test Harness</h1>
  <div class="status ok">
    ✓ Server is running
  </div>
  <p>Endpoints:</p>
  <ul>
    <li><span class="endpoint">GET /mcp</span> - SSE stream for MCP protocol</li>
    <li><span class="endpoint">POST /mcp/messages?sessionId=X</span> - MCP message handling</li>
    <li><span class="endpoint">GET /health</span> - Health check</li>
    <li><span class="endpoint">GET /widget</span> - Widget preview</li>
  </ul>

  <div class="form">
    <h3>Run Simulation</h3>
    <label>Investable Assets ($)</label>
    <input type="number" id="assets" value="500000">
    <label>Annual Spending ($)</label>
    <input type="number" id="spending" value="40000">
    <label>Current Age</label>
    <input type="number" id="age" value="35">
    <label>Expected Income ($)</label>
    <input type="number" id="income" value="100000">
    <label>Seed</label>
    <input type="number" id="seed" value="12345">
    <button onclick="runSimulation()">Run Simulation</button>
  </div>

  <div id="result"></div>

  <script>
    async function runSimulation() {
      const resultDiv = document.getElementById('result');
      resultDiv.innerHTML = '<p>Running simulation...</p>';

      try {
        // Connect to SSE
        const sse = new EventSource('/mcp');
        let sessionId = null;

        sse.addEventListener('endpoint', async (e) => {
          const endpoint = e.data;
          sessionId = new URL(endpoint, location.origin).searchParams.get('sessionId');

          // Send initialize
          await fetch('/mcp/messages?sessionId=' + sessionId, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0',
              id: 1,
              method: 'initialize',
              params: {
                protocolVersion: '2024-11-05',
                clientInfo: { name: 'test-harness', version: '1.0.0' }
              }
            })
          });

          // Send simulation request
          const resp = await fetch('/mcp/messages?sessionId=' + sessionId, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0',
              id: 2,
              method: 'tools/call',
              params: {
                name: 'run_simulation_packet',
                arguments: {
                  investableAssets: parseFloat(document.getElementById('assets').value),
                  annualSpending: parseFloat(document.getElementById('spending').value),
                  currentAge: parseFloat(document.getElementById('age').value),
                  expectedIncome: parseFloat(document.getElementById('income').value),
                  seed: parseInt(document.getElementById('seed').value),
                  startYear: new Date().getFullYear()
                }
              }
            })
          });

          const result = await resp.json();
          resultDiv.innerHTML = '<h4>Result:</h4><pre>' + JSON.stringify(result, null, 2) + '</pre>';
          sse.close();
        });

        sse.onerror = () => {
          resultDiv.innerHTML = '<p style="color: red;">SSE connection error</p>';
          sse.close();
        };
      } catch (err) {
        resultDiv.innerHTML = '<p style="color: red;">Error: ' + err.message + '</p>';
      }
    }
  </script>
</body>
</html>`
