// +build !js,!wasm

package main

import (
	"testing"
)

// TestDividendConfiguration verifies that dividends are disabled by default
func TestDividendConfiguration(t *testing.T) {
	// Get default stochastic config
	config := GetDefaultStochasticConfig()

	// Verify dividends are disabled by default
	if config.EnableDividends {
		t.Errorf("Expected EnableDividends to be false by default, got true")
	}

	// Verify dividend yields are still set (but won't be used when disabled)
	if config.DividendYieldSPY == 0 {
		t.Errorf("Expected DividendYieldSPY to be set, got 0")
	}

	if config.DividendYieldIntlStock == 0 {
		t.Errorf("Expected DividendYieldIntlStock to be set, got 0")
	}

	if config.DividendYieldBond == 0 {
		t.Errorf("Expected DividendYieldBond to be set, got 0")
	}

	t.Logf("✅ Dividend configuration test passed - dividends disabled by default")
}

// TestDividendFallbackElimination verifies that dividend functions fail fast without config
func TestDividendFallbackElimination(t *testing.T) {
	// Reset dividend config to nil to test fail-fast behavior
	originalConfig := dividendModelConfig
	dividendModelConfig = nil
	defer func() {
		dividendModelConfig = originalConfig
	}()

	// Test that GetDividendYield panics without config
	defer func() {
		if r := recover(); r != nil {
			expected := "CRITICAL: Dividend model configuration not loaded"
			if str, ok := r.(string); ok && len(str) >= len(expected) && str[:len(expected)] == expected {
				t.Logf("✅ GetDividendYield correctly panics without config: %v", r)
			} else {
				t.Errorf("GetDividendYield panic message incorrect: %v", r)
			}
		} else {
			t.Errorf("Expected GetDividendYield to panic without config")
		}
	}()

	// This should panic
	_ = GetLegacyDividendYield("AssetClassUSStocksTotalMarket")
}