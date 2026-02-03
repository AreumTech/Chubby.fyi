#!/usr/bin/env node
/**
 * Claude Interaction Demo
 *
 * Demonstrates how Claude would use the MCP tools to answer a user's question
 * about their financial situation.
 */

const SIMULATION_SERVICE_URL = process.env.SIMULATION_SERVICE_URL || 'http://localhost:3002';

// Import extraction tool
async function extractChanges(text) {
  const module = await import('../dist/tools/extractChanges.js');
  return module.handleExtractChanges({ text });
}

// Call simulation
async function runSimulation(params) {
  const response = await fetch(`${SIMULATION_SERVICE_URL}/simulate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      packetBuildRequest: {
        seed: params.seed || Math.floor(Math.random() * 100000),
        startYear: 2024,
        mcPaths: 1,
        confirmedChanges: [
          { fieldPath: ['profile', 'investableAssets'], newValue: params.investableAssets },
          { fieldPath: ['profile', 'annualSpending'], newValue: params.annualSpending },
          { fieldPath: ['profile', 'currentAge'], newValue: params.currentAge },
          { fieldPath: ['profile', 'expectedIncome'], newValue: params.expectedIncome },
        ],
      },
    }),
  });
  return response.json();
}

function formatCurrency(v) {
  if (v === undefined || v === null) return 'N/A';
  if (v >= 1e6) return `$${(v/1e6).toFixed(2)}M`;
  if (v >= 1e3) return `$${(v/1e3).toFixed(0)}k`;
  return `$${Math.round(v)}`;
}

async function main() {
  console.log('=' .repeat(70));
  console.log('CLAUDE INTERACTION DEMO');
  console.log('Simulating how Claude would use MCP to answer user questions');
  console.log('='.repeat(70));

  // User's question
  const userQuestion = `
    I'm 35 years old with about $500k saved up. I make $120k per year
    and spend around $60k. I'm thinking about retiring early - what
    tends to happen if I stop working at 45?
  `;

  console.log('\n📝 USER QUESTION:');
  console.log(userQuestion.trim());

  // Step 1: Claude extracts financial data using NLP
  console.log('\n' + '-'.repeat(70));
  console.log('STEP 1: Claude uses extract_financial_changes to parse user input');
  console.log('-'.repeat(70));

  const extraction = await extractChanges(userQuestion);

  if (!extraction.success) {
    console.log(`Error: ${extraction.error}`);
    process.exit(1);
  }

  console.log('\nExtracted data:');
  const params = { seed: 35001 };
  for (const change of extraction.changes) {
    const field = change.fieldPath[change.fieldPath.length - 1];
    console.log(`  ${field}: ${change.newValue} (confidence: ${change.confidence})`);
    params[field] = change.newValue;
  }

  // Step 2: Claude runs baseline simulation (current path)
  console.log('\n' + '-'.repeat(70));
  console.log('STEP 2: Claude runs baseline simulation (current trajectory)');
  console.log('-'.repeat(70));

  const baseline = await runSimulation(params);

  if (!baseline.success) {
    console.log(`Simulation error: ${baseline.error}`);
    process.exit(1);
  }

  console.log('\nBaseline Results (continue working to 65):');
  console.log(`  Success Rate: ${(baseline.mc.successRate * 100).toFixed(0)}%`);
  console.log(`  Final Net Worth (median): ${formatCurrency(baseline.mc.finalNetWorthP50)}`);
  console.log(`  Breach Probability: ${(baseline.mc.everBreachProbability * 100).toFixed(0)}%`);

  // Step 3: Claude runs scenario (early retirement at 45)
  console.log('\n' + '-'.repeat(70));
  console.log('STEP 3: Claude runs scenario (stop working at 45)');
  console.log('-'.repeat(70));

  // Early retirement: 10 years of income, then $0
  // For Bronze tier, we simulate this by adjusting effective income
  // (In full implementation, this would be an event-based scenario)
  const yearsOfIncome = 45 - params.currentAge; // 10 years
  const totalYears = 30;
  const effectiveIncome = (params.expectedIncome * yearsOfIncome) / totalYears;

  const earlyRetirement = await runSimulation({
    ...params,
    seed: 35002,
    expectedIncome: effectiveIncome, // Approximation for Bronze tier
  });

  console.log(`\nEarly Retirement Scenario (stop income at 45):`);
  console.log(`  Effective annual income over 30 years: ${formatCurrency(effectiveIncome)}`);
  console.log(`  Success Rate: ${(earlyRetirement.mc.successRate * 100).toFixed(0)}%`);
  console.log(`  Final Net Worth (median): ${formatCurrency(earlyRetirement.mc.finalNetWorthP50)}`);
  console.log(`  Breach Probability: ${(earlyRetirement.mc.everBreachProbability * 100).toFixed(0)}%`);

  // Step 4: Claude's response
  console.log('\n' + '-'.repeat(70));
  console.log('STEP 4: Claude formulates response to user');
  console.log('-'.repeat(70));

  console.log(`
🤖 CLAUDE'S RESPONSE:
═══════════════════════════════════════════════════════════════════════

Based on the information you provided, I ran two simulations to explore
what tends to happen under these assumptions:

**Your Current Profile:**
- Age: ${params.currentAge}
- Investable Assets: ${formatCurrency(params.investableAssets)}
- Annual Income: ${formatCurrency(params.expectedIncome)}
- Annual Spending: ${formatCurrency(params.annualSpending)}
- Savings Rate: ${((params.expectedIncome - params.annualSpending) / params.expectedIncome * 100).toFixed(0)}%

**Baseline (Continue Working to 65):**
Under current assumptions, if you continue working until traditional
retirement age:
- Projected final net worth at 65: ${formatCurrency(baseline.mc.finalNetWorthP50)}
- Success rate (never running out of money): ${(baseline.mc.successRate * 100).toFixed(0)}%

**Scenario: Stop Working at 45:**
If you stop earning income at age 45 (10 years from now):
- Projected final net worth at 65: ${formatCurrency(earlyRetirement.mc.finalNetWorthP50)}
- Success rate: ${(earlyRetirement.mc.successRate * 100).toFixed(0)}%
- Breach probability: ${(earlyRetirement.mc.everBreachProbability * 100).toFixed(0)}%

**Key Observations:**
${baseline.mc.finalNetWorthP50 > earlyRetirement.mc.finalNetWorthP50 ?
`- The baseline scenario shows approximately ${formatCurrency(baseline.mc.finalNetWorthP50 - earlyRetirement.mc.finalNetWorthP50)}
  more in final net worth compared to early retirement.` : ''}
${earlyRetirement.mc.successRate < 1 ?
`- The early retirement scenario shows some risk of cash depletion.
  This is sensitive to spending levels and market returns.` :
`- Both scenarios show 100% success rate under these assumptions.`}

**Important Caveats:**
- This is a Bronze-tier simulation with simplified assumptions
- Results are conditional on assumed return distributions
- Does not include Social Security, pensions, or tax optimization
- For higher-fidelity analysis, additional inputs would be needed

**Blocked Outputs (Bronze tier):**
${baseline.blockedOutputs.map(b => `- ${b.outputName}: ${b.upgradeMessage}`).join('\n')}

─────────────────────────────────────────────────────────────────────
⚠️ Educational simulation only. Results are conditional on assumptions
   and are not advice, recommendations, or predictions.
═══════════════════════════════════════════════════════════════════════
`);

  console.log('\n✅ Demo complete - This shows how Claude would use MCP to answer financial questions.\n');
}

main().catch(console.error);
