/**
 * Test script for MCP Server optimization
 * Verifies the _meta.widgetData split works correctly
 */

import { handleRunSimulation } from "./dist/tools/runSimulation.js";

async function testChatGPTIntegration() {
  console.log("=".repeat(60));
  console.log("CHATGPT APPS SDK INTEGRATION TEST");
  console.log("=".repeat(60));

  // Simulate a simulation request
  const params = {
    investableAssets: 1200000,
    annualSpending: 80000,
    currentAge: 50,
    expectedIncome: 180000,
    seed: 42,
    startYear: 2024,
    mcPaths: 50,
    horizonMonths: 360,
    incomeChange: {
      monthOffset: 180,  // 15 years = age 65
      newAnnualIncome: 0,
      description: "Retirement"
    },
    socialSecurity: {
      claimingAge: 67,
      monthlyBenefit: 3000
    }
  };

  console.log("\n📨 Running simulation with params:");
  console.log("   Age:", params.currentAge);
  console.log("   Assets:", params.investableAssets.toLocaleString());
  console.log("   Spending:", params.annualSpending.toLocaleString());
  console.log("   Income:", params.expectedIncome.toLocaleString());
  console.log("   Retirement age:", 50 + Math.floor(params.incomeChange.monthOffset / 12));
  console.log("   SS claiming:", params.socialSecurity.claimingAge);

  const result = await handleRunSimulation(params);

  // Sample trajectory for model (same logic as server-sse.ts)
  const sampleTrajectoryForModel = (trajectory, currentAge, horizonMonths) => {
    if (!trajectory || trajectory.length === 0) return [];
    const horizonYears = Math.floor(horizonMonths / 12);
    const interval = horizonYears > 25 ? 10 : 5;
    const sampled = [];
    const seenAges = new Set();

    const findPoint = (targetMonth) => {
      let closest = trajectory[0];
      let minDiff = Math.abs((trajectory[0]?.monthOffset ?? trajectory[0]?.month ?? 0) - targetMonth);
      for (const pt of trajectory) {
        const diff = Math.abs((pt.monthOffset ?? pt.month ?? 0) - targetMonth);
        if (diff < minDiff) { minDiff = diff; closest = pt; }
      }
      return closest;
    };

    // Start
    const startPt = findPoint(0);
    sampled.push({ age: currentAge, p10: Math.round(startPt?.p10 ?? 0), p50: Math.round(startPt?.p50 ?? 0), p75: Math.round(startPt?.p75 ?? 0) });
    seenAges.add(currentAge);

    // Intervals
    const endAge = currentAge + horizonYears;
    for (let age = Math.ceil(currentAge / interval) * interval; age < endAge; age += interval) {
      if (seenAges.has(age)) continue;
      const pt = findPoint((age - currentAge) * 12);
      sampled.push({ age, p10: Math.round(pt?.p10 ?? 0), p50: Math.round(pt?.p50 ?? 0), p75: Math.round(pt?.p75 ?? 0) });
      seenAges.add(age);
    }

    // End
    if (!seenAges.has(endAge)) {
      const endPt = findPoint(horizonMonths);
      sampled.push({ age: endAge, p10: Math.round(endPt?.p10 ?? 0), p50: Math.round(endPt?.p50 ?? 0), p75: Math.round(endPt?.p75 ?? 0) });
    }

    return sampled.sort((a, b) => a.age - b.age);
  };

  const currentAge = result.inputs?.currentAge ?? 35;
  const horizonMonths = result.inputs?.horizonMonths ?? 360;

  // Build modelSummary (what model sees)
  const modelSummary = {
    success: result.success,
    runId: result.runId,
    pathsRun: result.pathsRun,
    planDuration: result.planDuration,
    inputs: {
      currentAge: result.inputs?.currentAge,
      investableAssets: result.inputs?.investableAssets,
      annualSpending: result.inputs?.annualSpending,
      expectedIncome: result.inputs?.expectedIncome,
      horizonMonths: result.inputs?.horizonMonths,
    },
    mc: {
      runwayP10: result.mc?.runwayP10,
      runwayP50: result.mc?.runwayP50,
      runwayP75: result.mc?.runwayP75,
      finalNetWorthP50: result.mc?.finalNetWorthP50,
      everBreachProbability: result.mc?.everBreachProbability,
    },
    trajectoryByAge: sampleTrajectoryForModel(result.netWorthTrajectory, currentAge, horizonMonths),
    schedule: result.schedule,
    phaseInfo: result.phaseInfo,
  };

  // Simulate MCP response structure
  const mcpResponse = {
    content: [{ type: "text", text: "Simulation complete" }],
    structuredContent: modelSummary,
    _meta: {
      "openai/outputTemplate": "ui://widget/simulation-summary-v8.html",
      widgetData: result
    }
  };

  console.log("\n" + "=".repeat(60));
  console.log("MCP RESPONSE STRUCTURE");
  console.log("=".repeat(60));

  const modelSize = JSON.stringify(modelSummary).length;
  const widgetSize = JSON.stringify(result).length;

  console.log("\n📊 Payload sizes:");
  console.log("   structuredContent (model):", modelSize, "bytes");
  console.log("   _meta.widgetData (widget):", widgetSize, "bytes");
  console.log("   Reduction:", Math.round((1 - modelSize / widgetSize) * 100) + "%");

  console.log("\n📋 Model receives (structuredContent):");
  console.log("   Keys:", Object.keys(modelSummary).join(", "));
  console.log("   planDuration.horizonSaturated:", modelSummary.planDuration?.horizonSaturated);
  console.log("   mc.runwayP50:", modelSummary.mc?.runwayP50, "months");
  console.log("   mc.finalNetWorthP50:", modelSummary.mc?.finalNetWorthP50?.toLocaleString());

  console.log("\n📈 Model trajectory (sampled for narration):");
  if (modelSummary.trajectoryByAge) {
    modelSummary.trajectoryByAge.forEach(pt => {
      const fmt = (n) => n >= 1e6 ? `$${(n/1e6).toFixed(1)}M` : `$${Math.round(n/1e3)}K`;
      console.log(`   Age ${pt.age}: ${fmt(pt.p50)} median (${fmt(pt.p10)}–${fmt(pt.p75)} range)`);
    });
  }

  console.log("\n🎨 Widget receives (_meta.widgetData):");
  console.log("   Has netWorthTrajectory:", result.netWorthTrajectory ? "yes (" + result.netWorthTrajectory.length + " points)" : "no");
  console.log("   Has annualSnapshots:", result.annualSnapshots ? "yes (" + result.annualSnapshots.length + " years)" : "no");
  console.log("   Has schedule.scheduledEvents:", result.schedule?.scheduledEvents ? "yes (" + result.schedule.scheduledEvents.length + " events)" : "no");

  // Test widget data extraction (simulating widget init)
  console.log("\n" + "=".repeat(60));
  console.log("WIDGET DATA EXTRACTION TEST");
  console.log("=".repeat(60));

  // Simulate what widget does
  const raw = mcpResponse;
  const widgetData = raw._meta?.widgetData || raw.structuredContent || raw.result || raw;
  const source = raw._meta?.widgetData ? "_meta.widgetData (optimized)" :
                 raw.structuredContent ? "structuredContent (legacy)" :
                 raw.result ? "result" : "raw";

  console.log("\n✅ Widget extraction:");
  console.log("   Source:", source);
  console.log("   Has trajectory:", widgetData.netWorthTrajectory ? "yes" : "no");
  console.log("   Has snapshots:", widgetData.annualSnapshots ? "yes" : "no");
  console.log("   Can render Year Inspector:", widgetData.annualSnapshots ? "yes" : "no");

  // Verify all required widget data is present
  const requiredFields = ["planDuration", "inputs", "mc", "netWorthTrajectory", "schedule"];
  const missingFields = requiredFields.filter(f => !widgetData[f]);

  if (missingFields.length === 0) {
    console.log("\n✅ All required widget fields present!");
  } else {
    console.log("\n❌ Missing fields:", missingFields.join(", "));
    process.exit(1);
  }

  console.log("\n" + "=".repeat(60));
  console.log("TEST COMPLETE - ALL CHECKS PASSED");
  console.log("=".repeat(60));
}

testChatGPTIntegration().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
