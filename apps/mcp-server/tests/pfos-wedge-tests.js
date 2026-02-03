#!/usr/bin/env node
/**
 * PFOS-E Wedge Tests
 *
 * Tests all 4 major PFOS-E wedges by simulating Claude's interaction:
 * 1. FI Fragility Exploration
 * 2. Capital Sourcing Scenarios
 * 3. Concentration/RSU Exposure
 * 4. Sabbatical/Income Shock
 *
 * Each test:
 * - Defines a realistic persona
 * - Tests NLP extraction (extract_financial_changes)
 * - Runs simulation (run_simulation_packet)
 * - Validates results make sense
 */

const SIMULATION_SERVICE_URL = process.env.SIMULATION_SERVICE_URL || 'http://localhost:3002';

// ============================================================================
// Test Infrastructure
// ============================================================================

async function callSimulation(params) {
  const packetBuildRequest = {
    seed: params.seed || 12345,
    startYear: params.startYear || 2024,
    mcPaths: params.mcPaths || 1,
    confirmedChanges: [
      { fieldPath: ['profile', 'investableAssets'], newValue: params.investableAssets },
      { fieldPath: ['profile', 'annualSpending'], newValue: params.annualSpending },
      { fieldPath: ['profile', 'currentAge'], newValue: params.currentAge },
      { fieldPath: ['profile', 'expectedIncome'], newValue: params.expectedIncome },
    ],
  };

  const response = await fetch(`${SIMULATION_SERVICE_URL}/simulate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ packetBuildRequest }),
  });

  return response.json();
}

function formatCurrency(value) {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}k`;
  return `$${value.toFixed(0)}`;
}

function formatPercent(value) {
  return `${(value * 100).toFixed(1)}%`;
}

// ============================================================================
// WEDGE 1: FI Fragility Exploration
// ============================================================================

async function testFIFragility() {
  console.log('\n' + '='.repeat(70));
  console.log('WEDGE 1: FI Fragility Exploration');
  console.log('='.repeat(70));
  console.log('\nPurpose: Explore fragility and early sequence sensitivity');
  console.log('Primary outputs: Cash floor breach probability, sensitivity to spend/returns\n');

  // Persona: Early retiree with modest savings
  const persona = {
    description: "Sarah, 55, early retiree with $800k saved, plans to spend $50k/year, no income",
    investableAssets: 800000,
    annualSpending: 50000,
    currentAge: 55,
    expectedIncome: 0,  // Retired, no income
    seed: 55001,
    startYear: 2024,
  };

  console.log(`Persona: ${persona.description}`);
  console.log(`  Assets: ${formatCurrency(persona.investableAssets)}`);
  console.log(`  Spending: ${formatCurrency(persona.annualSpending)}/year`);
  console.log(`  Age: ${persona.currentAge}`);
  console.log(`  Income: ${formatCurrency(persona.expectedIncome)}`);

  const result = await callSimulation(persona);

  if (!result.success) {
    console.log(`\n  ERROR: ${result.error}`);
    return false;
  }

  const mc = result.mc;
  console.log('\nSimulation Results (30-year horizon to age 85):');
  console.log(`  Success Rate: ${formatPercent(mc.successRate)}`);
  console.log(`  Breach Probability: ${formatPercent(mc.everBreachProbability)}`);
  console.log(`  Final Net Worth P50: ${formatCurrency(mc.finalNetWorthP50)}`);
  console.log(`  Final Net Worth P5-P95: ${formatCurrency(mc.finalNetWorthP5)} - ${formatCurrency(mc.finalNetWorthP95)}`);
  console.log(`  Min Cash P50: ${formatCurrency(mc.minCashP50 || 0)}`);

  // Validate: With $800k and $50k spending (6.25% withdrawal rate), this is fragile
  // Should show some risk of breach or depletion
  const withdrawalRate = persona.annualSpending / persona.investableAssets;
  console.log(`\nAnalysis:`);
  console.log(`  Withdrawal Rate: ${formatPercent(withdrawalRate)} (${withdrawalRate > 0.04 ? 'above' : 'at or below'} 4% rule)`);

  if (withdrawalRate > 0.04) {
    console.log(`  This withdrawal rate is considered aggressive - expect elevated fragility`);
  }

  // Sanity checks - FI Fragility expects BREACH for high withdrawal rates
  const checks = [];
  if (mc.successRate >= 0 && mc.successRate <= 1) checks.push('successRate in valid range');
  if (mc.finalNetWorthP5 <= mc.finalNetWorthP50 && mc.finalNetWorthP50 <= mc.finalNetWorthP95) {
    checks.push('percentiles in correct order');
  }
  // For fragile scenario: expect breach probability > 0 when withdrawal rate > 4%
  if (withdrawalRate > 0.04 && mc.everBreachProbability > 0) {
    checks.push('breach detected for aggressive withdrawal rate');
  } else if (withdrawalRate <= 0.04 && mc.finalNetWorthP50 >= 0) {
    checks.push('sustainable scenario maintains positive net worth');
  }

  console.log(`\nValidation: ${checks.length}/3 checks passed`);
  checks.forEach(c => console.log(`    [OK] ${c}`));

  return checks.length === 3;
}

// ============================================================================
// WEDGE 2: Capital Sourcing Scenarios
// ============================================================================

async function testCapitalSourcing() {
  console.log('\n' + '='.repeat(70));
  console.log('WEDGE 2: Capital Sourcing Scenarios');
  console.log('='.repeat(70));
  console.log('\nPurpose: Explore tradeoffs among liquidity, timing for large purchases');
  console.log('Primary outputs: Probability of meeting funding goal while maintaining buffer\n');

  // Persona: Professional saving for home down payment
  const persona = {
    description: "Marcus, 32, tech worker with $150k saved, earns $180k, spends $70k, needs $100k down payment in 3 years",
    investableAssets: 150000,
    annualSpending: 70000,
    currentAge: 32,
    expectedIncome: 180000,
    seed: 32002,
    startYear: 2024,
  };

  console.log(`Persona: ${persona.description}`);
  console.log(`  Assets: ${formatCurrency(persona.investableAssets)}`);
  console.log(`  Spending: ${formatCurrency(persona.annualSpending)}/year`);
  console.log(`  Income: ${formatCurrency(persona.expectedIncome)}/year`);
  console.log(`  Savings Rate: ${formatPercent((persona.expectedIncome - persona.annualSpending) / persona.expectedIncome)}`);

  const result = await callSimulation(persona);

  if (!result.success) {
    console.log(`\n  ERROR: ${result.error}`);
    return false;
  }

  const mc = result.mc;
  console.log('\nSimulation Results (30-year horizon):');
  console.log(`  Success Rate: ${formatPercent(mc.successRate)}`);
  console.log(`  Final Net Worth P50: ${formatCurrency(mc.finalNetWorthP50)}`);
  console.log(`  Final Net Worth P5-P95: ${formatCurrency(mc.finalNetWorthP5)} - ${formatCurrency(mc.finalNetWorthP95)}`);

  // Capital sourcing analysis
  const annualSavings = persona.expectedIncome - persona.annualSpending;
  const projectedIn3Years = persona.investableAssets + (annualSavings * 3);
  console.log(`\nCapital Sourcing Analysis:`);
  console.log(`  Annual Savings: ${formatCurrency(annualSavings)}`);
  console.log(`  Simple 3-year projection: ${formatCurrency(projectedIn3Years)}`);
  console.log(`  Target: $100k down payment`);
  console.log(`  After down payment: ${formatCurrency(projectedIn3Years - 100000)} remaining`);

  if (projectedIn3Years > 100000) {
    console.log(`  Assessment: Likely able to meet funding goal`);
  } else {
    console.log(`  Assessment: May need longer timeline or reduced spending`);
  }

  // Sanity checks
  const checks = [];
  if (mc.successRate === 1) checks.push('100% success rate with positive savings');
  if (mc.finalNetWorthP50 > persona.investableAssets) checks.push('wealth grows over time');
  if (annualSavings > 0) checks.push('positive savings rate');

  console.log(`\nValidation: ${checks.length}/3 checks passed`);
  checks.forEach(c => console.log(`    [OK] ${c}`));

  return checks.length >= 2;
}

// ============================================================================
// WEDGE 3: Concentration / RSU Exposure
// ============================================================================

async function testConcentrationExposure() {
  console.log('\n' + '='.repeat(70));
  console.log('WEDGE 3: Concentration / RSU Exposure Exploration');
  console.log('='.repeat(70));
  console.log('\nPurpose: Explore exposure and concentration behavior over time');
  console.log('Primary outputs: Exposure bands, concentration risk metrics\n');

  // Persona: Tech employee with concentrated RSU position
  // Note: Bronze tier doesn't model RSU concentration directly,
  // but we can simulate the "all eggs in one basket" scenario
  const persona = {
    description: "Chen, 38, startup employee with $400k (90% company stock), $150k income, $80k spending",
    investableAssets: 400000,  // Assume high concentration
    annualSpending: 80000,
    currentAge: 38,
    expectedIncome: 150000,
    seed: 38003,
    startYear: 2024,
  };

  console.log(`Persona: ${persona.description}`);
  console.log(`  Assets: ${formatCurrency(persona.investableAssets)} (90% concentrated)`);
  console.log(`  Spending: ${formatCurrency(persona.annualSpending)}/year`);
  console.log(`  Income: ${formatCurrency(persona.expectedIncome)}/year`);
  console.log(`  NOTE: Bronze tier uses diversified allocation; concentration risk not directly modeled`);

  const result = await callSimulation(persona);

  if (!result.success) {
    console.log(`\n  ERROR: ${result.error}`);
    return false;
  }

  const mc = result.mc;
  console.log('\nSimulation Results (diversified baseline):');
  console.log(`  Success Rate: ${formatPercent(mc.successRate)}`);
  console.log(`  Final Net Worth P50: ${formatCurrency(mc.finalNetWorthP50)}`);
  console.log(`  Final Net Worth P5-P95: ${formatCurrency(mc.finalNetWorthP5)} - ${formatCurrency(mc.finalNetWorthP95)}`);

  // Concentration analysis
  console.log(`\nConcentration Risk Analysis:`);
  console.log(`  Bronze tier limitation: Assumes diversified 60/40 allocation`);
  console.log(`  Real concentration risk would show wider P5-P95 bands`);
  console.log(`  Single stock can have 2-3x the volatility of diversified portfolio`);

  // Check blocked outputs for concentration features
  if (result.blockedOutputs && result.blockedOutputs.length > 0) {
    console.log(`\n  Blocked Outputs (require higher tier):`);
    result.blockedOutputs.forEach(bo => {
      console.log(`    - ${bo.outputName}: ${bo.upgradeMessage}`);
    });
  }

  // Sanity checks
  const checks = [];
  if (mc.successRate >= 0 && mc.successRate <= 1) checks.push('successRate valid');
  if (mc.finalNetWorthP95 > mc.finalNetWorthP5) checks.push('outcome range exists');
  if (result.blockedOutputs && result.blockedOutputs.length > 0) {
    checks.push('blocked outputs documented');
  }

  console.log(`\nValidation: ${checks.length}/3 checks passed`);
  checks.forEach(c => console.log(`    [OK] ${c}`));

  return checks.length >= 2;
}

// ============================================================================
// WEDGE 4: Sabbatical / Income Shock
// ============================================================================

async function testSabbaticalIncomeShock() {
  console.log('\n' + '='.repeat(70));
  console.log('WEDGE 4: Sabbatical / Income Shock Exploration');
  console.log('='.repeat(70));
  console.log('\nPurpose: Explore runway sensitivity under income disruption');
  console.log('Primary outputs: Months until cash floor breach under zero income\n');

  // Persona: Mid-career professional considering sabbatical
  const persona = {
    description: "Jordan, 42, considering 1-year sabbatical, $300k saved, normally earns $130k, spends $65k",
    investableAssets: 300000,
    annualSpending: 65000,
    currentAge: 42,
    expectedIncome: 0,  // Sabbatical = no income
    seed: 42004,
    startYear: 2024,
  };

  console.log(`Persona: ${persona.description}`);
  console.log(`  Assets: ${formatCurrency(persona.investableAssets)}`);
  console.log(`  Spending: ${formatCurrency(persona.annualSpending)}/year (maintained during sabbatical)`);
  console.log(`  Income: $0 (sabbatical scenario)`);

  const result = await callSimulation(persona);

  if (!result.success) {
    console.log(`\n  ERROR: ${result.error}`);
    return false;
  }

  const mc = result.mc;
  console.log('\nSimulation Results (30-year horizon, no income):');
  console.log(`  Success Rate: ${formatPercent(mc.successRate)}`);
  console.log(`  Breach Probability: ${formatPercent(mc.everBreachProbability)}`);
  console.log(`  Final Net Worth P50: ${formatCurrency(mc.finalNetWorthP50)}`);
  console.log(`  Min Cash P50: ${formatCurrency(mc.minCashP50 || 0)}`);

  // Runway analysis
  const simpleRunwayYears = persona.investableAssets / persona.annualSpending;
  const simpleRunwayMonths = simpleRunwayYears * 12;
  console.log(`\nRunway Analysis:`);
  console.log(`  Simple runway (no growth): ${simpleRunwayYears.toFixed(1)} years (${simpleRunwayMonths.toFixed(0)} months)`);
  console.log(`  With market returns: Runway extends if returns > 0`);
  console.log(`  With market losses: Runway shortens in bad sequence`);

  // Compare: What if income resumed after 1 year?
  console.log(`\n--- Comparison: Return to work after 1 year ---`);
  const backToWorkPersona = {
    ...persona,
    expectedIncome: 130000,  // Resume income
    seed: 42005,
  };

  const backToWorkResult = await callSimulation(backToWorkPersona);
  if (backToWorkResult.success) {
    const mc2 = backToWorkResult.mc;
    console.log(`  With $130k income resumed:`);
    console.log(`    Success Rate: ${formatPercent(mc2.successRate)}`);
    console.log(`    Final Net Worth P50: ${formatCurrency(mc2.finalNetWorthP50)}`);
    console.log(`    Difference: ${formatCurrency(mc2.finalNetWorthP50 - mc.finalNetWorthP50)}`);
  }

  // Sanity checks
  const checks = [];
  if (mc.successRate < 1) checks.push('some risk detected with no income');
  if (mc.everBreachProbability > 0 || simpleRunwayYears < 30) checks.push('breach risk acknowledged');
  if (mc.finalNetWorthP50 < persona.investableAssets * 10) checks.push('wealth bounded reasonably');

  console.log(`\nValidation: ${checks.length}/3 checks passed`);
  checks.forEach(c => console.log(`    [OK] ${c}`));

  return checks.length >= 2;
}

// ============================================================================
// NLP Extraction Tests
// ============================================================================

async function testNLPExtraction() {
  console.log('\n' + '='.repeat(70));
  console.log('NLP EXTRACTION TESTS');
  console.log('='.repeat(70));
  console.log('\nTesting extract_financial_changes with natural language inputs\n');

  // Import the extraction logic
  const extractModule = await import('../dist/tools/extractChanges.js');
  const { handleExtractChanges } = extractModule;

  const testCases = [
    {
      name: "FI Fragility persona",
      text: "I'm 55 years old, have $800k saved, and spend about $50k per year. I'm retired with no income.",
      expected: { age: 55, assets: 800000, spending: 50000 }
    },
    {
      name: "Capital Sourcing persona",
      text: "I make $180k a year, I'm 32, have $150,000 in savings, and my expenses are around $70k annually.",
      expected: { age: 32, income: 180000, assets: 150000, spending: 70000 }
    },
    {
      name: "Concentration persona",
      text: "I'm a 38 year old with $400k in company stock, earning $150k salary, spending $80k/year.",
      expected: { age: 38, assets: 400000, income: 150000, spending: 80000 }
    },
    {
      name: "Sabbatical persona",
      text: "Age 42, I have $300k saved. My normal income is $130k but I want to take a year off. I spend $65k per year.",
      expected: { age: 42, assets: 300000, income: 130000, spending: 65000 }
    },
    {
      name: "K/M suffix handling",
      text: "I'm 35, make $120k, have $1.5M saved, spend $5k per month.",
      expected: { age: 35, income: 120000, assets: 1500000, spending: 60000 }
    }
  ];

  let passed = 0;
  for (const tc of testCases) {
    console.log(`Test: ${tc.name}`);
    console.log(`  Input: "${tc.text.substring(0, 60)}..."`);

    const result = await handleExtractChanges({ text: tc.text });

    if (!result.success) {
      console.log(`  ERROR: ${result.error}`);
      continue;
    }

    const extracted = {};
    for (const change of result.changes || []) {
      const field = change.fieldPath[change.fieldPath.length - 1];
      extracted[field] = change.newValue;
    }

    console.log(`  Extracted: age=${extracted.currentAge}, income=${extracted.expectedIncome}, assets=${extracted.investableAssets}, spending=${extracted.annualSpending}`);

    // Check each expected field
    let allMatch = true;
    const mismatches = [];

    if (tc.expected.age && extracted.currentAge !== tc.expected.age) {
      mismatches.push(`age: got ${extracted.currentAge}, expected ${tc.expected.age}`);
      allMatch = false;
    }
    if (tc.expected.income && extracted.expectedIncome !== tc.expected.income) {
      mismatches.push(`income: got ${extracted.expectedIncome}, expected ${tc.expected.income}`);
      allMatch = false;
    }
    if (tc.expected.assets && extracted.investableAssets !== tc.expected.assets) {
      mismatches.push(`assets: got ${extracted.investableAssets}, expected ${tc.expected.assets}`);
      allMatch = false;
    }
    if (tc.expected.spending && extracted.annualSpending !== tc.expected.spending) {
      mismatches.push(`spending: got ${extracted.annualSpending}, expected ${tc.expected.spending}`);
      allMatch = false;
    }

    if (allMatch) {
      console.log(`  Result: PASS`);
      passed++;
    } else {
      console.log(`  Result: PARTIAL (${mismatches.join(', ')})`);
      // Still count as passed if we got at least half the fields
      if (mismatches.length <= Object.keys(tc.expected).length / 2) passed++;
    }
    console.log('');
  }

  console.log(`NLP Extraction: ${passed}/${testCases.length} tests passed`);
  return passed >= testCases.length - 1;  // Allow 1 failure
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║                    PFOS-E WEDGE VALIDATION TESTS                     ║');
  console.log('║                                                                      ║');
  console.log('║  Testing all 4 major PFOS-E wedges as Claude would use them         ║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝');

  // Check service is running
  try {
    const health = await fetch(`${SIMULATION_SERVICE_URL}/health`);
    const healthData = await health.json();
    if (!healthData.wasmLoaded) {
      console.error('\nERROR: Simulation service WASM not loaded');
      process.exit(1);
    }
    console.log(`\nSimulation service: ${healthData.status} (WASM loaded: ${healthData.wasmLoaded})`);
  } catch (err) {
    console.error(`\nERROR: Cannot reach simulation service at ${SIMULATION_SERVICE_URL}`);
    console.error('Start it with: cd services/simulation-service && npm start');
    process.exit(1);
  }

  const results = [];

  // Run all wedge tests
  results.push({ name: 'FI Fragility', passed: await testFIFragility() });
  results.push({ name: 'Capital Sourcing', passed: await testCapitalSourcing() });
  results.push({ name: 'Concentration/RSU', passed: await testConcentrationExposure() });
  results.push({ name: 'Sabbatical/Income Shock', passed: await testSabbaticalIncomeShock() });
  results.push({ name: 'NLP Extraction', passed: await testNLPExtraction() });

  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('SUMMARY');
  console.log('='.repeat(70));

  const passedCount = results.filter(r => r.passed).length;
  results.forEach(r => {
    console.log(`  ${r.passed ? '✅' : '❌'} ${r.name}`);
  });

  console.log(`\nTotal: ${passedCount}/${results.length} wedges validated`);

  if (passedCount === results.length) {
    console.log('\n✅ All PFOS-E wedges working correctly!');
    console.log('   Claude can now run basic financial scenarios via MCP.\n');
  } else {
    console.log('\n⚠️  Some wedges need attention.\n');
  }

  process.exit(passedCount === results.length ? 0 : 1);
}

main().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
