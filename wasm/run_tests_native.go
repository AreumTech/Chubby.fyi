//go:build ignore

package main

import (
	"fmt"
	"os"
)

// RunAllTests runs all the test functions and reports results
func RunAllTests() {
	fmt.Println("🧪 Running PathFinder Financial Engine Tests...")
	fmt.Println("=" + string(make([]byte, 50)))

	testsPassed := 0
	testsFailed := 0

	// Test suite runner
	runTest := func(name string, testFunc func() error) {
		fmt.Printf("\n📋 %s\n", name)
		if err := testFunc(); err != nil {
			fmt.Printf("❌ FAILED: %v\n", err)
			testsFailed++
		} else {
			fmt.Printf("PASSED\n")
			testsPassed++
		}
	}

	// Run all test suites
	runTest("Math Functions", func() error {
		TestMathFunctions(nil)
		return nil
	})

	runTest("Tax Calculations", func() error {
		TestTaxCalculations(nil)
		return nil
	})

	runTest("Simulation Engine", func() error {
		TestSimulationEngine(nil)
		return nil
	})

	runTest("Social Security", func() error {
		TestSocialSecurityEdgeCases(nil)
		return nil
	})

	// Summary
	fmt.Printf("\n" + "=" + string(make([]byte, 50)) + "\n")
	fmt.Printf("Test Results: %d passed, %d failed\n", testsPassed, testsFailed)

	if testsFailed > 0 {
		os.Exit(1)
	}
}

// Main entry point for native test runner
func main() {
	RunAllTests()
}
