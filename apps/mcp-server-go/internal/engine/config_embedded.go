package engine

import (
	"embed"
	"encoding/json"
	"fmt"
)

//go:embed config/*.json
var embeddedConfigs embed.FS

// LoadEmbeddedFinancialConfig loads all financial configs from embedded JSON files at compile time.
// This removes the runtime dependency on JS-driven config loading while retaining full config depth.
func LoadEmbeddedFinancialConfig() error {
	if configLoaded {
		return nil
	}

	// Helper to read and unmarshal a config file
	readJSON := func(name string, v interface{}) error {
		data, err := embeddedConfigs.ReadFile("config/" + name)
		if err != nil {
			return fmt.Errorf("read %s: %w", name, err)
		}
		if err := json.Unmarshal(data, v); err != nil {
			return fmt.Errorf("unmarshal %s: %w", name, err)
		}
		return nil
	}

	// Load each config into the existing global variables
	// Load both 2024 and 2025 tax brackets
	var tb2024 TaxBracketsConfig
	if err := readJSON("tax_brackets_2024.json", &tb2024); err != nil {
		return err
	}

	var tb2025 TaxBracketsConfig
	if err := readJSON("tax_brackets_2025.json", &tb2025); err != nil {
		return err
	}

	// Merge both into a single config
	taxBracketsConfig = &TaxBracketsConfig{
		FederalTaxBracketsSingle2024: tb2024.FederalTaxBracketsSingle2024,
		FederalTaxBracketsMFJ2024:    tb2024.FederalTaxBracketsMFJ2024,
		FederalTaxBracketsSingle2025: tb2025.FederalTaxBracketsSingle2025,
		FederalTaxBracketsMFJ2025:    tb2025.FederalTaxBracketsMFJ2025,
		LTCGBracketsSingle2024:       tb2024.LTCGBracketsSingle2024,
		LTCGBracketsMFJ2024:          tb2024.LTCGBracketsMFJ2024,
		LTCGBracketsSingle2025:       tb2025.LTCGBracketsSingle2025,
		LTCGBracketsMFJ2025:          tb2025.LTCGBracketsMFJ2025,
		StandardDeduction:            tb2025.StandardDeduction, // Use 2025 as default
	}

	var rmd RMDTableConfig
	if err := readJSON("rmd_table_2024.json", &rmd); err != nil {
		return err
	}
	rmdTableConfig = &rmd

	var contrib ContributionLimitsConfig
	if err := readJSON("contribution_limits_2025.json", &contrib); err != nil {
		return err
	}
	contributionConfig = &contrib

	var fica FICATaxConfig
	if err := readJSON("fica_tax_2024.json", &fica); err != nil {
		return err
	}
	ficaTaxConfig = &fica

	var st StateTaxBracketsConfig
	if err := readJSON("state_tax_brackets.json", &st); err != nil {
		return err
	}
	stateTaxConfig = &st

	var ir IRMAABracketsConfig
	if err := readJSON("irmaa_brackets_2024.json", &ir); err != nil {
		return err
	}
	irmaaConfig = &ir

	var ar AssetReturnsConfig
	if err := readJSON("asset_returns_historical.json", &ar); err != nil {
		return err
	}
	assetReturnsConfig = &ar

	var mre MonthlyRealEstateConfig
	if err := readJSON("monthly_real_estate_data.json", &mre); err != nil {
		return err
	}
	monthlyRealEstateConfig = &mre

	var div DividendModelConfig
	if err := readJSON("dividend_model_data.json", &div); err != nil {
		return err
	}
	dividendModelConfig = &div

	var def DefaultsConfig
	if err := readJSON("defaults.json", &def); err != nil {
		return err
	}
	defaultsConfig = &def

	configLoaded = true
	return nil
}

func init() {
	// Auto-load embedded configs on package init
	if err := LoadEmbeddedFinancialConfig(); err != nil {
		// Log error but don't panic - configs may be loaded separately
		DebugPrintf("Warning: failed to load embedded configs: %v", err)
	}
}
