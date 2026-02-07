package main

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"math"
	"path/filepath"
)

// Configuration Loader for External Financial Data
//
// This module loads all financial constants, tax rules, and market data from
// external JSON files to ensure data accuracy and maintainability.
// All data sources are documented in DATA_SOURCES_AND_CITATIONS.md with
// authoritative government and academic citations.

// External configuration structures that match the JSON files

// TaxBracketsConfig represents the external tax brackets configuration
type TaxBracketsConfig struct {
	FederalTaxBracketsSingle2024 []TaxBracket          `json:"federalTaxBracketsSingle2024"`
	FederalTaxBracketsMFJ2024    []TaxBracket          `json:"federalTaxBracketsMFJ2024"`
	FederalTaxBracketsSingle2025 []TaxBracket          `json:"federalTaxBracketsSingle2025"`
	FederalTaxBracketsMFJ2025    []TaxBracket          `json:"federalTaxBracketsMFJ2025"`
	LTCGBracketsSingle2024       []CapitalGainsBracket `json:"ltcgBracketsSingle2024"`
	LTCGBracketsMFJ2024          []CapitalGainsBracket `json:"ltcgBracketsMFJ2024"`
	LTCGBracketsSingle2025       []CapitalGainsBracket `json:"ltcgBracketsSingle2025"`
	LTCGBracketsMFJ2025          []CapitalGainsBracket `json:"ltcgBracketsMFJ2025"`
	StandardDeduction            struct {
		Single                float64 `json:"single"`
		MarriedFilingJointly  float64 `json:"marriedFilingJointly"`
		HeadOfHousehold       float64 `json:"headOfHousehold"`
	} `json:"standardDeduction"`
}

// RMDTableConfig represents the external RMD table configuration
type RMDTableConfig struct {
	RMDLifeExpectancyTable []struct {
		Age                int     `json:"age"`
		DistributionPeriod float64 `json:"distributionPeriod"`
	} `json:"rmdLifeExpectancyTable"`
}

// ContributionLimitsConfig represents the external contribution limits configuration
type ContributionLimitsConfig struct {
	RetirementContributions struct {
		E401k struct {
			BaseLimit   float64 `json:"baseLimit"`
			CatchUpLimit float64 `json:"catchUpLimit"`
			CatchUpAge  int     `json:"catchUpAge"`
		} `json:"e401k"`
		IRA struct {
			BaseLimit   float64 `json:"baseLimit"`
			CatchUpLimit float64 `json:"catchUpLimit"`
			CatchUpAge  int     `json:"catchUpAge"`
		} `json:"ira"`
		SEP struct {
			LimitPercentage float64 `json:"limitPercentage"`
			MaxAmount       float64 `json:"maxAmount"`
		} `json:"sep"`
		Simple struct {
			BaseLimit   float64 `json:"baseLimit"`
			CatchUpLimit float64 `json:"catchUpLimit"`
			CatchUpAge  int     `json:"catchUpAge"`
		} `json:"simple"`
	} `json:"retirementContributions"`
	HSAContributions struct {
		Individual  float64 `json:"individual"`
		Family      float64 `json:"family"`
		CatchUpLimit float64 `json:"catchUpLimit"`
		CatchUpAge  int     `json:"catchUpAge"`
	} `json:"hsaContributions"`
	SocialSecurityWageBase         float64 `json:"socialSecurityWageBase"`
	NetInvestmentIncomeThreshold   struct {
		Single                float64 `json:"single"`
		MarriedFilingJointly  float64 `json:"marriedFilingJointly"`
	} `json:"netInvestmentIncomeThreshold"`
}

// FICATaxConfig represents the external FICA tax configuration
type FICATaxConfig struct {
	SocialSecurityRate     float64 `json:"socialSecurityRate"`     // 6.2% for employee
	MedicareRate           float64 `json:"medicareRate"`           // 1.45% for employee
	AdditionalMedicareRate float64 `json:"additionalMedicareRate"` // 0.9% additional Medicare
	SelfEmploymentRates struct {
		SocialSecurityRate float64 `json:"socialSecurityRate"` // 12.4% for SE
		MedicareRate       float64 `json:"medicareRate"`       // 2.9% for SE
		Deduction          float64 `json:"deduction"`          // 92.35% deduction factor
	} `json:"selfEmploymentRates"`
	AdditionalMedicareThresholds struct {
		Single                float64 `json:"single"`                // $200k for Single/HOH
		MarriedFilingJointly  float64 `json:"marriedFilingJointly"`  // $250k for MFJ
		MarriedSeparately     float64 `json:"marriedSeparately"`     // $125k for MFS
	} `json:"additionalMedicareThresholds"`
	SocialSecurityThresholds struct {
		Single                  struct {
			FirstThreshold  float64 `json:"firstThreshold"`  // $25k threshold
			SecondThreshold float64 `json:"secondThreshold"` // $34k threshold
		} `json:"single"`
		MarriedFilingJointly   struct {
			FirstThreshold  float64 `json:"firstThreshold"`  // $32k threshold
			SecondThreshold float64 `json:"secondThreshold"` // $44k threshold
		} `json:"marriedFilingJointly"`
	} `json:"socialSecurityThresholds"`
	Description string `json:"description"`
	DataSource  string `json:"dataSource"`
	TaxYear     int    `json:"taxYear"`
}

// StateTaxBracketsConfig represents the external state tax brackets configuration
type StateTaxBracketsConfig struct {
	Description string `json:"description"`
	DataSource  string `json:"dataSource"`
	TaxYear     int    `json:"taxYear"`
	States      map[string]struct {
		Name     string `json:"name"`
		TaxType  string `json:"taxType"` // "progressive", "flat", "none"
		Rate     float64 `json:"rate,omitempty"` // For flat tax states
		Single   []struct {
			IncomeMin interface{} `json:"incomeMin"` // Can be number or "Infinity"
			IncomeMax interface{} `json:"incomeMax"` // Can be number or "Infinity"
			Rate      float64     `json:"rate"`
		} `json:"single,omitempty"` // For progressive tax states
		MarriedFilingJointly []struct {
			IncomeMin interface{} `json:"incomeMin"`
			IncomeMax interface{} `json:"incomeMax"`
			Rate      float64     `json:"rate"`
		} `json:"marriedFilingJointly,omitempty"`
	} `json:"states"`
}

// IRMAABracketsConfig represents the external IRMAA brackets configuration
type IRMAABracketsConfig struct {
	IRMAABrackets struct {
		Single []struct {
			MAGIMin           float64 `json:"magiMin"`
			MAGIMax           float64 `json:"magiMax"`
			MonthlyPremiumAdd float64 `json:"monthlyPremiumAdd"`
		} `json:"single"`
		MarriedFilingJointly []struct {
			MAGIMin           float64 `json:"magiMin"`
			MAGIMax           float64 `json:"magiMax"`
			MonthlyPremiumAdd float64 `json:"monthlyPremiumAdd"`
		} `json:"marriedFilingJointly"`
	} `json:"irmaaBrackets"`
	Description   string `json:"description"`
	LookBackYears int    `json:"lookBackYears"`
	Notes         string `json:"notes"`
}

// AssetReturnsConfig represents the external asset returns configuration
type AssetReturnsConfig struct {
	Description string `json:"description"`
	DataSource  string `json:"dataSource"`
	AssetClassReturns map[string]struct {
		SPY         float64 `json:"spy"`
		BND         float64 `json:"bnd"`
		Intl        float64 `json:"intl"`
		RealEstate  float64 `json:"realEstate"`
		Commodities float64 `json:"commodities"`
		Cash        float64 `json:"cash"`
		Inflation   float64 `json:"inflation"`
	} `json:"assetClassReturns"`
	IndividualStockPremiums struct {
		AnnualVolatilityMultiplier float64 `json:"annualVolatilityMultiplier"`
		RiskPremiumRange struct {
			Min  float64 `json:"min"`
			Max  float64 `json:"max"`
			Mean float64 `json:"mean"`
		} `json:"riskPremiumRange"`
		SurvivorshipBias    float64 `json:"survivorshipBias"`
		ConcentrationRisk   float64 `json:"concentrationRisk"`
	} `json:"individualStockPremiums"`
	AlternativeAssetAllocations map[string]map[string]float64 `json:"alternativeAssetAllocations"`
	CashEquivalents struct {
		SavingsAccountRate        float64 `json:"savingsAccountRate"`
		MoneyMarketRate          float64 `json:"moneyMarketRate"`
		ThreeMoTreasury          float64 `json:"threeMoTreasury"`
		SixMoCD                  float64 `json:"sixMoCD"`
		CorrelationWithInflation float64 `json:"correlationWithInflation"`
		RealReturnHistoricalAvg  float64 `json:"realReturnHistoricalAvg"`
	} `json:"cashEquivalents"`
}

// REMOVED: RealEstateConfig struct
// This structure used annual data which is mathematically incompatible with monthly simulations
// All real estate data now uses MonthlyRealEstateConfig for discrete monthly accuracy

// MonthlyRealEstateConfig represents discrete monthly real estate data configuration
// CRITICAL: This structure enforces discrete monthly data to eliminate mathematical inaccuracies
type MonthlyRealEstateConfig struct {
	Description string `json:"description"`
	DataSource  string `json:"dataSource"`
	NationalMonthlyData map[string][]struct {
		Month            int     `json:"month"`            // 1-12
		HomeAppreciation float64 `json:"homeAppreciation"` // Monthly appreciation rate
		RentGrowth       float64 `json:"rentGrowth"`       // Monthly rent growth rate
	} `json:"nationalMonthlyData"`
	RegionalMultipliers map[string]float64 `json:"regionalMultipliers"`
	TransactionCosts struct {
		Buying struct {
			Total float64 `json:"total"`
		} `json:"buying"`
		Selling struct {
			Total float64 `json:"total"`
		} `json:"selling"`
		RoundTrip float64 `json:"roundTrip"`
	} `json:"transactionCosts"`
}

// DefaultsConfig represents the centralized defaults configuration
type DefaultsConfig struct {
	Description string `json:"description"`
	Version     string `json:"version"`

	AssetAllocation struct {
		DefaultStrategy struct {
			Name         string             `json:"name"`
			Description  string             `json:"description"`
			Allocations  map[string]float64 `json:"allocations"`
			RebalanceThreshold float64       `json:"rebalanceThreshold"`
			RebalanceMethod    string        `json:"rebalanceMethod"`
		} `json:"defaultStrategy"`
		ConservativeStrategy struct {
			Name         string             `json:"name"`
			Description  string             `json:"description"`
			Allocations  map[string]float64 `json:"allocations"`
			RebalanceThreshold float64       `json:"rebalanceThreshold"`
			RebalanceMethod    string        `json:"rebalanceMethod"`
		} `json:"conservativeStrategy"`
		AggressiveStrategy struct {
			Name         string             `json:"name"`
			Description  string             `json:"description"`
			Allocations  map[string]float64 `json:"allocations"`
			RebalanceThreshold float64       `json:"rebalanceThreshold"`
			RebalanceMethod    string        `json:"rebalanceMethod"`
		} `json:"aggressiveStrategy"`
	} `json:"assetAllocation"`

	Backtesting struct {
		InitialPrices struct {
			Description string  `json:"description"`
			Stocks      float64 `json:"stocks"`
			Bonds       float64 `json:"bonds"`
			RealEstate  float64 `json:"realEstate"`
			OtherAssets float64 `json:"otherAssets"`
			Cash        float64 `json:"cash"`
		} `json:"initialPrices"`
		DefaultStartDate         string  `json:"defaultStartDate"`
		DefaultEndDate           string  `json:"defaultEndDate"`
		MonthlyContributionRate  float64 `json:"monthlyContributionRate"`
		DefaultAcquisitionDate   int     `json:"defaultAcquisitionDate"`
		DefaultAcquisitionDateDescription string `json:"defaultAcquisitionDateDescription"`
	} `json:"backtesting"`

	Strategies struct {
		AgeBasedStrategy struct {
			Description                  string  `json:"description"`
			AgeRuleConstant             int     `json:"ageRuleConstant"`
			MaxStockAllocation          float64 `json:"maxStockAllocation"`
			MinStockAllocation          float64 `json:"minStockAllocation"`
			DomesticStockProportion     float64 `json:"domesticStockProportion"`
			InternationalStockProportion float64 `json:"internationalStockProportion"`
		} `json:"ageBasedStrategy"`
		GlidePathStrategy struct {
			Description string `json:"description"`
			Brackets []struct {
				YearsToRetirementMin         int     `json:"yearsToRetirementMin"`
				StockPercentage              float64 `json:"stockPercentage"`
				DomesticStockProportion      float64 `json:"domesticStockProportion"`
				InternationalStockProportion float64 `json:"internationalStockProportion"`
			} `json:"brackets"`
		} `json:"glidePathStrategy"`
	} `json:"strategies"`

	Expenses struct {
		DefaultMonthlyExpenses struct {
			Description        string  `json:"description"`
			BaseAmount         float64 `json:"baseAmount"`
			Justification      string  `json:"justification"`
			InflationAdjusted  bool    `json:"inflationAdjusted"`
		} `json:"defaultMonthlyExpenses"`
		EmergencyFund struct {
			MonthsOfExpenses int    `json:"monthsOfExpenses"`
			Description      string `json:"description"`
		} `json:"emergencyFund"`
		SafeWithdrawalRate struct {
			Annual      float64 `json:"annual"`
			Monthly     float64 `json:"monthly"`
			Description string  `json:"description"`
		} `json:"safeWithdrawalRate"`
	} `json:"expenses"`

	Taxes struct {
		DefaultStateNoTax struct {
			Description string  `json:"description"`
			Rate        float64 `json:"rate"`
			Type        string  `json:"type"`
		} `json:"defaultStateNoTax"`
		DefaultFederalEffectiveRate float64 `json:"defaultFederalEffectiveRate"`
		DefaultStateTaxRate         float64 `json:"defaultStateTaxRate"`
		SaltCap                     float64 `json:"saltCap"`
	} `json:"taxes"`

	Inflation struct {
		DefaultAnnualRate   float64 `json:"defaultAnnualRate"`
		HistoricalAverage   float64 `json:"historicalAverage"`
		TargetRate          float64 `json:"targetRate"`
		Description         string  `json:"description"`
	} `json:"inflation"`

	CashManagement struct {
		MinimumCashBalance      float64 `json:"minimumCashBalance"`
		CashAllocationThreshold float64 `json:"cashAllocationThreshold"`
		Description             string  `json:"description"`
	} `json:"cashManagement"`

	Validation struct {
		MaxSimulationYears int     `json:"maxSimulationYears"`
		MinAccountBalance  float64 `json:"minAccountBalance"`
		MaxAccountBalance  float64 `json:"maxAccountBalance"`
		Description        string  `json:"description"`
	} `json:"validation"`
}

// DividendModelConfig represents the external dividend model configuration with discrete historical data
type DividendModelConfig struct {
	Description string `json:"description"`
	DataSource  string `json:"dataSource"`
	AssetClassDividends map[string]struct {
		// Historical discrete dividend data by year and quarter/month
		HistoricalQuarterlyYields map[string][]struct {
			Quarter     int    `json:"quarter"`
			Yield       float64 `json:"yield"`
			PaymentDate string `json:"paymentDate"`
		} `json:"historicalQuarterlyYields,omitempty"`
		HistoricalMonthlyYields map[string][]struct {
			Month int     `json:"month"`
			Yield float64 `json:"yield"`
		} `json:"historicalMonthlyYields,omitempty"`
		// Legacy fields maintained for backward compatibility
		CurrentYield          float64 `json:"currentYield"`
		GrowthRate           float64 `json:"growthRate"`
		QualifiedPercentage  float64 `json:"qualifiedPercentage"`
		PaymentFrequency     string  `json:"paymentFrequency"`
		AverageWithholdingRate float64 `json:"averageWithholdingRate"`
	} `json:"assetClassDividends"`
	DividendTiming struct {
		QuarterlyMonths []int `json:"quarterlyMonths"`
		MonthlyAssets   []string `json:"monthlyAssets"`
		SemiannualAssets []string `json:"semiannualAssets"`
		PaymentConcentration map[string]float64 `json:"paymentConcentration"`
	} `json:"dividendTiming"`
	TaxWithholding struct {
		Qualified struct {
			StandardRate      float64 `json:"standardRate"`
			HighIncomeRate    float64 `json:"highIncomeRate"`
			ThresholdSingle   float64 `json:"thresholdSingle"`
			ThresholdMFJ      float64 `json:"thresholdMFJ"`
		} `json:"qualified"`
		Ordinary struct {
			FederalRate float64 `json:"federalRate"`
			StateRate   float64 `json:"stateRate"`
			FicaRate    float64 `json:"ficaRate"`
		} `json:"ordinary"`
		International struct {
			ForeignWithholding  float64 `json:"foreignWithholding"`
			TreatyReduction     float64 `json:"treatyReduction"`
			ForeignTaxCredit    bool    `json:"foreignTaxCredit"`
		} `json:"international"`
	} `json:"taxWithholding"`
	ReinvestmentOptions struct {
		DefaultReinvestmentRate float64 `json:"defaultReinvestmentRate"`
		CommissionFree         bool    `json:"commissionFree"`
		FractionalShares       bool    `json:"fractionalShares"`
		ReinvestmentDelay      int     `json:"reinvestmentDelay"`
		ByAssetClass           map[string]struct {
			DefaultDRIP       bool    `json:"defaultDRIP"`
			ReinvestmentRate  float64 `json:"reinvestmentRate"`
		} `json:"byAssetClass"`
	} `json:"reinvestmentOptions"`
}

// Global configuration variables that will be loaded from external files
var (
	taxBracketsConfig     *TaxBracketsConfig
	rmdTableConfig        *RMDTableConfig
	contributionConfig    *ContributionLimitsConfig
	ficaTaxConfig         *FICATaxConfig
	stateTaxConfig        *StateTaxBracketsConfig
	irmaaConfig           *IRMAABracketsConfig
	assetReturnsConfig    *AssetReturnsConfig
	// realEstateConfig      *RealEstateConfig          // REMOVED: Deprecated annual data - mathematically inaccurate for monthly simulations
	monthlyRealEstateConfig *MonthlyRealEstateConfig // NEW: Discrete monthly data
	dividendModelConfig   *DividendModelConfig
	defaultsConfig        *DefaultsConfig            // NEW: Centralized defaults configuration
	configLoaded          bool
)

// LoadFinancialConfigFromFiles loads all financial configuration data from external JSON files
func LoadFinancialConfigFromFiles(configDir string) error {
	if configLoaded {
		return nil // Already loaded
	}

	var err error

	// Load tax brackets
	taxBracketsConfig, err = loadTaxBracketsConfig(filepath.Join(configDir, "tax_brackets_2024.json"))
	if err != nil {
		return fmt.Errorf("failed to load tax brackets config: %w", err)
	}

	// Load RMD table
	rmdTableConfig, err = loadRMDTableConfig(filepath.Join(configDir, "rmd_table_2024.json"))
	if err != nil {
		return fmt.Errorf("failed to load RMD table config: %w", err)
	}

	// Load contribution limits
	contributionConfig, err = loadContributionLimitsConfig(filepath.Join(configDir, "contribution_limits_2025.json"))
	if err != nil {
		return fmt.Errorf("failed to load contribution limits config: %w", err)
	}

	// Load FICA tax configuration
	ficaTaxConfig, err = loadFICATaxConfig(filepath.Join(configDir, "fica_tax_2024.json"))
	if err != nil {
		return fmt.Errorf("failed to load FICA tax config: %w", err)
	}

	// Load state tax brackets
	stateTaxConfig, err = loadStateTaxBracketsConfig(filepath.Join(configDir, "state_tax_brackets.json"))
	if err != nil {
		return fmt.Errorf("failed to load state tax brackets config: %w", err)
	}

	// Load IRMAA brackets
	irmaaConfig, err = loadIRMAABracketsConfig(filepath.Join(configDir, "irmaa_brackets_2024.json"))
	if err != nil {
		return fmt.Errorf("failed to load IRMAA brackets config: %w", err)
	}

	// Load asset returns data
	assetReturnsConfig, err = loadAssetReturnsConfig(filepath.Join(configDir, "asset_returns_historical.json"))
	if err != nil {
		return fmt.Errorf("failed to load asset returns config: %w", err)
	}

	// REMOVED: No longer loading deprecated annual real estate data
	// Annual data would require mathematical smoothing in monthly simulations, which introduces inaccuracies

	// Load monthly real estate data (preferred for mathematical accuracy)
	monthlyRealEstateConfig, err = loadMonthlyRealEstateConfig(filepath.Join(configDir, "monthly_real_estate_data.json"))
	if err != nil {
		return fmt.Errorf("failed to load monthly real estate config: %w", err)
	}

	// Load dividend model data
	dividendModelConfig, err = loadDividendModelConfig(filepath.Join(configDir, "dividend_model_data.json"))
	if err != nil {
		return fmt.Errorf("failed to load dividend model config: %w", err)
	}

	// Load defaults configuration
	defaultsConfig, err = loadDefaultsConfig(filepath.Join(configDir, "defaults.json"))
	if err != nil {
		return fmt.Errorf("failed to load defaults config: %w", err)
	}

	configLoaded = true
	simLogVerbose("✅ [CONFIG] Successfully loaded all financial configuration from %s", configDir)
	return nil
}

// Global flag to ensure configuration is initialized only once
var configInitialized = false

// InitializeFinancialData loads configuration from external files ONLY
// This should be called exactly once during application startup
// CRITICAL: No fallback logic - engine must fail if financial data is missing
func InitializeFinancialData() error {
	if configInitialized {
		return nil // Already initialized
	}

	// Load from external files - fail fast if any file is missing
	err := LoadFinancialConfigFromFiles("config")
	if err != nil {
		return fmt.Errorf("CRITICAL: Financial configuration files missing or invalid - engine cannot run with placeholder data: %w", err)
	}

	// CRITICAL: Validate all configuration data for placeholders and accuracy
	validator := NewConfigurationValidator()
	if err := validator.ValidateAllConfigurations(); err != nil {
		return fmt.Errorf("CRITICAL: Configuration validation failed - engine cannot run with invalid data: %w", err)
	}

	// Additional market data integrity check
	if err := validator.ValidateMarketDataIntegrity(); err != nil {
		return fmt.Errorf("CRITICAL: Market data integrity validation failed: %w", err)
	}

	configInitialized = true
	simLogVerbose("✅ [CONFIG] Successfully initialized and validated financial data from external sources")
	return nil
}

// Helper functions to load individual config files

func loadTaxBracketsConfig(filePath string) (*TaxBracketsConfig, error) {
	data, err := ioutil.ReadFile(filePath)
	if err != nil {
		return nil, err
	}

	var config TaxBracketsConfig
	err = json.Unmarshal(data, &config)
	if err != nil {
		return nil, fmt.Errorf("failed to parse tax brackets config: %w", err)
	}

	return &config, nil
}

func loadRMDTableConfig(filePath string) (*RMDTableConfig, error) {
	data, err := ioutil.ReadFile(filePath)
	if err != nil {
		return nil, err
	}

	var config RMDTableConfig
	err = json.Unmarshal(data, &config)
	if err != nil {
		return nil, fmt.Errorf("failed to parse RMD table config: %w", err)
	}

	return &config, nil
}

func loadContributionLimitsConfig(filePath string) (*ContributionLimitsConfig, error) {
	data, err := ioutil.ReadFile(filePath)
	if err != nil {
		return nil, err
	}

	var config ContributionLimitsConfig
	err = json.Unmarshal(data, &config)
	if err != nil {
		return nil, fmt.Errorf("failed to parse contribution limits config: %w", err)
	}

	return &config, nil
}

func loadFICATaxConfig(filePath string) (*FICATaxConfig, error) {
	data, err := ioutil.ReadFile(filePath)
	if err != nil {
		return nil, err
	}

	var config FICATaxConfig
	err = json.Unmarshal(data, &config)
	if err != nil {
		return nil, fmt.Errorf("failed to parse FICA tax config: %w", err)
	}

	return &config, nil
}

func loadStateTaxBracketsConfig(filePath string) (*StateTaxBracketsConfig, error) {
	data, err := ioutil.ReadFile(filePath)
	if err != nil {
		return nil, err
	}

	var config StateTaxBracketsConfig
	err = json.Unmarshal(data, &config)
	if err != nil {
		return nil, fmt.Errorf("failed to parse state tax brackets config: %w", err)
	}

	return &config, nil
}

func loadIRMAABracketsConfig(filePath string) (*IRMAABracketsConfig, error) {
	data, err := ioutil.ReadFile(filePath)
	if err != nil {
		return nil, err
	}

	var config IRMAABracketsConfig
	err = json.Unmarshal(data, &config)
	if err != nil {
		return nil, fmt.Errorf("failed to parse IRMAA brackets config: %w", err)
	}

	return &config, nil
}

func loadAssetReturnsConfig(filePath string) (*AssetReturnsConfig, error) {
	data, err := ioutil.ReadFile(filePath)
	if err != nil {
		return nil, err
	}

	var config AssetReturnsConfig
	err = json.Unmarshal(data, &config)
	if err != nil {
		return nil, fmt.Errorf("failed to parse asset returns config: %w", err)
	}

	return &config, nil
}

// REMOVED: loadRealEstateConfig function
// Annual real estate data loading is no longer supported to ensure mathematical accuracy

// loadMonthlyRealEstateConfig loads discrete monthly real estate data
func loadMonthlyRealEstateConfig(filePath string) (*MonthlyRealEstateConfig, error) {
	data, err := ioutil.ReadFile(filePath)
	if err != nil {
		return nil, err
	}

	var config MonthlyRealEstateConfig
	err = json.Unmarshal(data, &config)
	if err != nil {
		return nil, fmt.Errorf("failed to parse monthly real estate config: %w", err)
	}

	return &config, nil
}

func loadDividendModelConfig(filePath string) (*DividendModelConfig, error) {
	data, err := ioutil.ReadFile(filePath)
	if err != nil {
		return nil, err
	}

	var config DividendModelConfig
	err = json.Unmarshal(data, &config)
	if err != nil {
		return nil, fmt.Errorf("failed to parse dividend model config: %w", err)
	}

	return &config, nil
}

func loadDefaultsConfig(filePath string) (*DefaultsConfig, error) {
	data, err := ioutil.ReadFile(filePath)
	if err != nil {
		return nil, err
	}

	var config DefaultsConfig
	err = json.Unmarshal(data, &config)
	if err != nil {
		return nil, fmt.Errorf("failed to parse defaults config: %w", err)
	}

	return &config, nil
}

// Getter functions that use loaded config or fallback to defaults

// GetFederalTaxBrackets returns the appropriate federal tax brackets for filing status
// CRITICAL: No fallbacks - engine must fail if tax configuration is missing
// NOTE: Returns 2025 tax brackets for current simulations (tax year 2025)
func GetFederalTaxBrackets(filingStatus FilingStatus) []TaxBracket {
	if taxBracketsConfig == nil {
		panic("CRITICAL: Tax brackets configuration not loaded - engine cannot run without authoritative IRS tax data")
	}

	switch filingStatus {
	case FilingStatusMarriedJointly, FilingStatusQualifyingWidow:
		return taxBracketsConfig.FederalTaxBracketsMFJ2025
	default:
		return taxBracketsConfig.FederalTaxBracketsSingle2025
	}
}

// GetLTCGBrackets returns the appropriate long-term capital gains brackets for filing status
// CRITICAL: No fallbacks - engine must fail if tax configuration is missing
// NOTE: Returns 2025 LTCG brackets for current simulations (tax year 2025)
func GetLTCGBrackets(filingStatus FilingStatus) []CapitalGainsBracket {
	if taxBracketsConfig == nil {
		panic("CRITICAL: Tax brackets configuration not loaded - engine cannot run without authoritative IRS capital gains data")
	}

	switch filingStatus {
	case FilingStatusMarriedJointly, FilingStatusQualifyingWidow:
		return taxBracketsConfig.LTCGBracketsMFJ2025
	default:
		return taxBracketsConfig.LTCGBracketsSingle2025
	}
}

// GetStandardDeductionFromConfig returns the standard deduction for filing status from config
// CRITICAL: No fallbacks - engine must fail if tax configuration is missing
func GetStandardDeductionFromConfig(filingStatus FilingStatus) float64 {
	if taxBracketsConfig == nil {
		panic("CRITICAL: Tax brackets configuration not loaded - engine cannot run without authoritative IRS standard deduction data")
	}

	switch filingStatus {
	case FilingStatusMarriedJointly, FilingStatusQualifyingWidow:
		return taxBracketsConfig.StandardDeduction.MarriedFilingJointly
	case FilingStatusMarriedSeparately:
		return taxBracketsConfig.StandardDeduction.Single // MFS uses same as Single
	case FilingStatusHeadOfHousehold:
		return taxBracketsConfig.StandardDeduction.HeadOfHousehold
	default: // Single
		return taxBracketsConfig.StandardDeduction.Single
	}
}

// GetRMDLifeExpectancy returns the life expectancy for RMD calculation
func GetRMDLifeExpectancy(age int) (float64, bool) {


	for _, entry := range rmdTableConfig.RMDLifeExpectancyTable {
		if entry.Age == age {
			return entry.DistributionPeriod, true
		}
	}
	return 0, false
}

// GetSocialSecurityWageBase returns the SS wage base from config
func GetSocialSecurityWageBase() float64 {

	if contributionConfig == nil {
		panic("CRITICAL: Social Security wage base configuration not loaded - engine cannot run without authoritative FICA data")
	}
	return contributionConfig.SocialSecurityWageBase
}

// GetAdditionalMedicareThreshold returns the threshold for additional Medicare tax
func GetAdditionalMedicareThreshold(filingStatus FilingStatus) float64 {


	if ficaTaxConfig != nil {
		switch filingStatus {
		case FilingStatusMarriedJointly, FilingStatusQualifyingWidow:
			return ficaTaxConfig.AdditionalMedicareThresholds.MarriedFilingJointly
		case FilingStatusMarriedSeparately:
			return ficaTaxConfig.AdditionalMedicareThresholds.MarriedSeparately
		default: // Single, Head of Household
			return ficaTaxConfig.AdditionalMedicareThresholds.Single
		}
	}

	// Configuration must be loaded for accurate Medicare calculations
	panic("CRITICAL: FICA tax configuration not loaded - engine cannot run without authoritative Medicare threshold data")
}

// GetFICATaxRates returns the FICA tax rates from config
func GetFICATaxRates() (socialSecurity, medicare, additionalMedicare float64) {


	if ficaTaxConfig == nil {
		panic("CRITICAL: FICA tax configuration not loaded - engine cannot run without authoritative Social Security and Medicare rates")
	}
	return ficaTaxConfig.SocialSecurityRate, ficaTaxConfig.MedicareRate, ficaTaxConfig.AdditionalMedicareRate
}

// GetSelfEmploymentTaxRates returns the self-employment tax rates from config
func GetSelfEmploymentTaxRates() (socialSecurity, medicare, deduction float64) {


	if ficaTaxConfig == nil {
		panic("CRITICAL: FICA tax configuration not loaded - engine cannot run without authoritative self-employment tax rates")
	}
	return ficaTaxConfig.SelfEmploymentRates.SocialSecurityRate,
		   ficaTaxConfig.SelfEmploymentRates.MedicareRate,
		   ficaTaxConfig.SelfEmploymentRates.Deduction
}

// GetSocialSecurityThresholds returns the Social Security taxation thresholds
func GetSocialSecurityThresholds(filingStatus FilingStatus) (firstThreshold, secondThreshold float64) {


	if ficaTaxConfig == nil {
		panic("CRITICAL: FICA tax configuration not loaded - engine cannot run without authoritative Social Security taxation thresholds")
	}

	switch filingStatus {
	case FilingStatusMarriedJointly, FilingStatusQualifyingWidow:
		return ficaTaxConfig.SocialSecurityThresholds.MarriedFilingJointly.FirstThreshold,
			   ficaTaxConfig.SocialSecurityThresholds.MarriedFilingJointly.SecondThreshold
	default: // Single, Head of Household, Married Filing Separately
		return ficaTaxConfig.SocialSecurityThresholds.Single.FirstThreshold,
			   ficaTaxConfig.SocialSecurityThresholds.Single.SecondThreshold
	}
}

// GetStateTaxData returns the state tax configuration for a given state
func GetStateTaxData(state string) (taxType string, rate float64, brackets []TaxBracket, found bool) {


	if stateTaxConfig != nil {
		if stateData, exists := stateTaxConfig.States[state]; exists {
			switch stateData.TaxType {
			case "none":
				return "none", 0.0, nil, true
			case "flat":
				return "flat", stateData.Rate, nil, true
			case "progressive":
				// Convert the interface{} values to TaxBracket format
				var brackets []TaxBracket
				// Use single filer brackets as default (can be enhanced later for MFJ)
				for _, bracket := range stateData.Single {
					minVal, maxVal := parseIncomeValues(bracket.IncomeMin, bracket.IncomeMax)
					brackets = append(brackets, TaxBracket{
						IncomeMin: minVal,
						IncomeMax: maxVal,
						Rate:      bracket.Rate,
					})
				}
				return "progressive", 0.0, brackets, true
			}
		}
	}

	return "", 0.0, nil, false
}

// GetStateTaxBrackets returns the tax brackets for a given state and filing status
func GetStateTaxBrackets(state string, filingStatus string) []TaxBracket {


	if stateTaxConfig != nil {
		if stateData, exists := stateTaxConfig.States[state]; exists && stateData.TaxType == "progressive" {
			// Convert to TaxBracket format based on filing status
			var brackets []TaxBracket

			switch filingStatus {
			case "marriedFilingJointly":
				for _, bracket := range stateData.MarriedFilingJointly {
					minVal, maxVal := parseIncomeValues(bracket.IncomeMin, bracket.IncomeMax)
					brackets = append(brackets, TaxBracket{
						IncomeMin: minVal,
						IncomeMax: maxVal,
						Rate:      bracket.Rate,
					})
				}
			case "single":
				for _, bracket := range stateData.Single {
					minVal, maxVal := parseIncomeValues(bracket.IncomeMin, bracket.IncomeMax)
					brackets = append(brackets, TaxBracket{
						IncomeMin: minVal,
						IncomeMax: maxVal,
						Rate:      bracket.Rate,
					})
				}
			default:
				// Default to single
				for _, bracket := range stateData.Single {
					minVal, maxVal := parseIncomeValues(bracket.IncomeMin, bracket.IncomeMax)
					brackets = append(brackets, TaxBracket{
						IncomeMin: minVal,
						IncomeMax: maxVal,
						Rate:      bracket.Rate,
					})
				}
			}
			return brackets
		}
	}

	return nil
}

// parseIncomeValues converts interface{} income values to float64, handling "Infinity"
func parseIncomeValues(minVal, maxVal interface{}) (float64, float64) {
	var min, max float64

	// Parse minimum value
	switch v := minVal.(type) {
	case float64:
		min = v
	case string:
		if v == "Infinity" {
			min = math.Inf(1)
		}
	}

	// Parse maximum value
	switch v := maxVal.(type) {
	case float64:
		max = v
	case string:
		if v == "Infinity" {
			max = math.Inf(1)
		}
	}

	return min, max
}

// Get401kContributionLimit returns the 401k contribution limit for given age
func Get401kContributionLimit(age int) float64 {


	baseLimit := contributionConfig.RetirementContributions.E401k.BaseLimit
	if age >= contributionConfig.RetirementContributions.E401k.CatchUpAge {
		return baseLimit + contributionConfig.RetirementContributions.E401k.CatchUpLimit
	}
	return baseLimit
}

// GetIRAContributionLimit returns the IRA contribution limit for given age
func GetIRAContributionLimit(age int) float64 {


	baseLimit := contributionConfig.RetirementContributions.IRA.BaseLimit
	if age >= contributionConfig.RetirementContributions.IRA.CatchUpAge {
		return baseLimit + contributionConfig.RetirementContributions.IRA.CatchUpLimit
	}
	return baseLimit
}

// GetIRMAAMonthlyPremium returns the IRMAA monthly premium adjustment for given MAGI and filing status
func GetIRMAAMonthlyPremium(magi float64, filingStatus FilingStatus) float64 {


	var brackets []struct {
		MAGIMin           float64 `json:"magiMin"`
		MAGIMax           float64 `json:"magiMax"`
		MonthlyPremiumAdd float64 `json:"monthlyPremiumAdd"`
	}

	switch filingStatus {
	case FilingStatusMarriedJointly, FilingStatusQualifyingWidow:
		brackets = irmaaConfig.IRMAABrackets.MarriedFilingJointly
	default:
		brackets = irmaaConfig.IRMAABrackets.Single
	}

	for _, bracket := range brackets {
		if magi >= bracket.MAGIMin && magi < bracket.MAGIMax {
			return bracket.MonthlyPremiumAdd
		}
	}

	// If above all brackets, return the highest premium
	if len(brackets) > 0 {
		return brackets[len(brackets)-1].MonthlyPremiumAdd
	}
	return 0
}

// GetAlternativeAssetWeights returns asset allocation for "Other Assets" based on strategy
func GetAlternativeAssetWeights(strategy string) map[string]float64 {


	if weights, exists := assetReturnsConfig.AlternativeAssetAllocations[strategy]; exists {
		return weights
	}

	// Default to balanced allocation if strategy not found
	return assetReturnsConfig.AlternativeAssetAllocations["balanced"]
}

// GetIndividualStockRiskPremium returns the risk premium/discount for individual stocks
func GetIndividualStockRiskPremium() float64 {


	// Return the mean risk premium (typically negative due to concentration risk)
	return assetReturnsConfig.IndividualStockPremiums.RiskPremiumRange.Mean +
		   assetReturnsConfig.IndividualStockPremiums.SurvivorshipBias +
		   assetReturnsConfig.IndividualStockPremiums.ConcentrationRisk
}

// GetCashReturn returns the appropriate cash return rate based on cash type
func GetCashReturn(inflationRate float64) float64 {
	// Use money market rate as baseline, adjusted for inflation correlation
	baseRate := assetReturnsConfig.CashEquivalents.MoneyMarketRate
	correlation := assetReturnsConfig.CashEquivalents.CorrelationWithInflation

	// Apply defaults if config is not populated
	// Historical money market monthly rate ~0.25% (3% annualized)
	// Cash returns correlate ~0.7 with inflation historically
	if baseRate == 0 && correlation == 0 {
		baseRate = 0.0025       // ~3% annualized
		correlation = 0.7
	}

	return baseRate + inflationRate*correlation
}

// REMOVED: GetRealEstateReturn function
// This function used annual data which is mathematically incompatible with monthly simulations
// All real estate calculations now use GetMonthlyRealEstateReturn for discrete monthly data

// REMOVED: GetRentGrowthRate function
// This function used annual data which is mathematically incompatible with monthly simulations
// All rent calculations now use GetMonthlyRentGrowthRate for discrete monthly data

// GetMonthlyRealEstateReturn returns the discrete monthly real estate return for a given year, month, and region
// CRITICAL: This function uses discrete monthly data to eliminate mathematical inaccuracies from annual smoothing
func GetMonthlyRealEstateReturn(year int, month int, region string) float64 {
	if monthlyRealEstateConfig == nil {
		panic("CRITICAL: Monthly real estate config not loaded - call LoadFinancialConfigFromFiles first")
	}

	// Get monthly data for the year
	yearStr := fmt.Sprintf("%d", year)
	if monthlyData, exists := monthlyRealEstateConfig.NationalMonthlyData[yearStr]; exists {
		// Find the specific month data
		for _, monthData := range monthlyData {
			if monthData.Month == month {
				homeAppreciation := monthData.HomeAppreciation

				// Apply regional multiplier if specified
				if multiplier, regionExists := monthlyRealEstateConfig.RegionalMultipliers[region]; regionExists {
					return homeAppreciation * multiplier
				}

				return homeAppreciation
			}
		}
		panic(fmt.Sprintf("CRITICAL: Missing monthly real estate data for %d-%02d - discrete monthly data required", year, month))
	}

	// No fallback data - real estate calculations require proper discrete monthly data
	panic(fmt.Sprintf("CRITICAL: Missing monthly real estate data for year %d, region %s - engine cannot use smoothed annual data", year, region))
}

// GetMonthlyRentGrowthRate returns the discrete monthly rent growth rate for a given year, month, and region
// CRITICAL: This function uses discrete monthly data to eliminate mathematical inaccuracies from annual smoothing
func GetMonthlyRentGrowthRate(year int, month int, region string) float64 {
	if monthlyRealEstateConfig == nil {
		panic("CRITICAL: Monthly real estate config not loaded - call LoadFinancialConfigFromFiles first")
	}

	// Get monthly data for the year
	yearStr := fmt.Sprintf("%d", year)
	if monthlyData, exists := monthlyRealEstateConfig.NationalMonthlyData[yearStr]; exists {
		// Find the specific month data
		for _, monthData := range monthlyData {
			if monthData.Month == month {
				rentGrowth := monthData.RentGrowth

				// Apply regional multiplier if specified
				if multiplier, regionExists := monthlyRealEstateConfig.RegionalMultipliers[region]; regionExists {
					return rentGrowth * multiplier
				}

				return rentGrowth
			}
		}
		panic(fmt.Sprintf("CRITICAL: Missing monthly rent growth data for %d-%02d - discrete monthly data required", year, month))
	}

	// No fallback data - rent calculations require proper discrete monthly data
	panic(fmt.Sprintf("CRITICAL: Missing monthly rent growth data for year %d, region %s - engine cannot use smoothed annual data", year, region))
}

// GetDividendYield returns the discrete historical dividend yield for a given asset class, year, and quarter/month
// CRITICAL: This function uses discrete historical data to eliminate mathematical inaccuracies from annual smoothing
func GetDividendYield(assetClass string, year int, month int) float64 {
	if dividendModelConfig == nil {
		panic(fmt.Sprintf("CRITICAL: Dividend model configuration not loaded - engine cannot process dividend yield for asset class '%s'", assetClass))
	}

	// Map asset class names to config keys
	configKey := mapAssetClassToConfigKey(assetClass)

	if dividendData, exists := dividendModelConfig.AssetClassDividends[configKey]; exists {
		// First check if historical quarterly data exists
		if dividendData.HistoricalQuarterlyYields != nil {
			yearStr := fmt.Sprintf("%d", year)
			if yearData, yearExists := dividendData.HistoricalQuarterlyYields[yearStr]; yearExists {
				quarter := ((month - 1) / 3) + 1 // Convert month to quarter (1-4)
				for _, quarterData := range yearData {
					if quarterData.Quarter == quarter {
						return quarterData.Yield
					}
				}
				panic(fmt.Sprintf("CRITICAL: Missing quarterly dividend data for %s Q%d %d - discrete quarterly data required", assetClass, quarter, year))
			}
		}

		// Check if historical monthly data exists (for bonds)
		if dividendData.HistoricalMonthlyYields != nil {
			yearStr := fmt.Sprintf("%d", year)
			if yearData, yearExists := dividendData.HistoricalMonthlyYields[yearStr]; yearExists {
				for _, monthData := range yearData {
					if monthData.Month == month {
						return monthData.Yield
					}
				}
				panic(fmt.Sprintf("CRITICAL: Missing monthly dividend data for %s %d-%02d - discrete monthly data required", assetClass, year, month))
			}
		}

		// No historical data available for the requested period
		panic(fmt.Sprintf("CRITICAL: Missing historical dividend data for %s %d-%02d - engine cannot use smoothed annual yield (%f)", assetClass, year, month, dividendData.CurrentYield))
	}

	panic(fmt.Sprintf("CRITICAL: Missing dividend yield data for asset class '%s' (config key: '%s') - engine cannot use placeholder dividend yields", assetClass, configKey))
}

// GetLegacyDividendYield returns the legacy currentYield for backward compatibility only
// DEPRECATED: Use GetDividendYield with discrete historical data instead
func GetLegacyDividendYield(assetClass string) float64 {
	if dividendModelConfig == nil {
		panic(fmt.Sprintf("CRITICAL: Dividend model configuration not loaded - engine cannot process dividend yield for asset class '%s'", assetClass))
	}

	configKey := mapAssetClassToConfigKey(assetClass)

	if dividendData, exists := dividendModelConfig.AssetClassDividends[configKey]; exists {
		return dividendData.CurrentYield
	}

	panic(fmt.Sprintf("CRITICAL: Missing dividend yield data for asset class '%s' (config key: '%s')", assetClass, configKey))
}

// GetQualifiedDividendPercentage returns the percentage of dividends that are qualified
// CRITICAL: This function should only be called when dividends are enabled
func GetQualifiedDividendPercentage(assetClass string) float64 {
	if dividendModelConfig == nil {
		panic(fmt.Sprintf("CRITICAL: Dividend model configuration not loaded - engine cannot process qualified dividend percentage for asset class '%s'", assetClass))
	}

	configKey := mapAssetClassToConfigKey(assetClass)

	if dividendData, exists := dividendModelConfig.AssetClassDividends[configKey]; exists {
		return dividendData.QualifiedPercentage
	}

	panic(fmt.Sprintf("CRITICAL: Missing qualified dividend percentage for asset class '%s' (config key: '%s') - engine cannot use placeholder dividend tax rates", assetClass, configKey))
}

// GetDividendWithholdingRate returns the appropriate withholding rate for dividends
// CRITICAL: This function should only be called when dividends are enabled
func GetDividendWithholdingRate(assetClass string, isQualified bool, income float64, filingStatus FilingStatus) float64 {
	if dividendModelConfig == nil {
		panic(fmt.Sprintf("CRITICAL: Dividend model configuration not loaded - engine cannot process dividend withholding for asset class '%s'", assetClass))
	}

	if isQualified {
		// Use qualified dividend rates based on income
		var threshold float64
		switch filingStatus {
		case FilingStatusMarriedJointly, FilingStatusQualifyingWidow:
			threshold = dividendModelConfig.TaxWithholding.Qualified.ThresholdMFJ
		default:
			threshold = dividendModelConfig.TaxWithholding.Qualified.ThresholdSingle
		}

		if income > threshold {
			return dividendModelConfig.TaxWithholding.Qualified.HighIncomeRate
		}
		return dividendModelConfig.TaxWithholding.Qualified.StandardRate
	} else {
		// Ordinary dividend rates
		return dividendModelConfig.TaxWithholding.Ordinary.FederalRate
	}
}

// GetDividendPaymentTiming returns whether dividends should be paid in a given month
// CRITICAL: This function should only be called when dividends are enabled
func GetDividendPaymentTiming(assetClass string, month int) float64 {
	if dividendModelConfig == nil {
		panic(fmt.Sprintf("CRITICAL: Dividend model configuration not loaded - engine cannot process dividend timing for asset class '%s'", assetClass))
	}

	configKey := mapAssetClassToConfigKey(assetClass)

	if dividendData, exists := dividendModelConfig.AssetClassDividends[configKey]; exists {
		switch dividendData.PaymentFrequency {
		case "monthly":
			return 1.0 // Full monthly payment
		case "quarterly":
			// Check if this is a quarterly month
			for _, quarterlyMonth := range dividendModelConfig.DividendTiming.QuarterlyMonths {
				if month == quarterlyMonth {
					return 3.0 // 3 months worth of dividends
				}
			}
			return 0.0
		case "semiannual":
			if month == 6 || month == 12 {
				return 6.0 // 6 months worth of dividends
			}
			return 0.0
		default:
			panic(fmt.Sprintf("CRITICAL: Unknown dividend payment frequency '%s' for asset class '%s' - must be 'monthly', 'quarterly', or 'semiannual'", dividendData.PaymentFrequency, assetClass))
		}
	}

	panic(fmt.Sprintf("CRITICAL: Missing dividend timing data for asset class '%s' (config key: '%s') - engine cannot use placeholder dividend timing", assetClass, configKey))
}

// Helper function to map asset class to config key
func mapAssetClassToConfigKey(assetClass string) string {
	switch assetClass {
	case "AssetClassUSStocksTotalMarket":
		return "spyTotalMarket"
	case "AssetClassInternationalStocks":
		return "internationalStocks"
	case "AssetClassUSBondsTotalMarket":
		return "bondsTotalMarket"
	case "AssetClassRealEstate":
		return "realEstate"
	case "AssetClassOtherAssets":
		return "otherAssets"
	case "AssetClassIndividualStock":
		return "individualStocks"
	default:
		return "spyTotalMarket" // Standard asset class mapping
	}
}

// Getter functions for defaults configuration

// GetDefaultAssetAllocation returns the default asset allocation from config
func GetDefaultAssetAllocation() map[AssetClass]float64 {
	if defaultsConfig == nil {
		panic("CRITICAL: Defaults configuration not loaded - engine cannot run without centralized defaults")
	}

	allocations := make(map[AssetClass]float64)
	allocations[AssetClassUSStocksTotalMarket] = defaultsConfig.AssetAllocation.DefaultStrategy.Allocations["stocks"]
	allocations[AssetClassInternationalStocks] = defaultsConfig.AssetAllocation.DefaultStrategy.Allocations["internationalStocks"]
	allocations[AssetClassUSBondsTotalMarket] = defaultsConfig.AssetAllocation.DefaultStrategy.Allocations["bonds"]
	if realEstateAllocation, exists := defaultsConfig.AssetAllocation.DefaultStrategy.Allocations["realEstate"]; exists {
		allocations[AssetClassRealEstatePrimaryHome] = realEstateAllocation
	}
	allocations[AssetClassOtherAssets] = defaultsConfig.AssetAllocation.DefaultStrategy.Allocations["otherAssets"]

	return allocations
}

// GetDefaultRebalanceThreshold returns the default rebalancing threshold from config
func GetDefaultRebalanceThreshold() float64 {
	if defaultsConfig == nil {
		panic("CRITICAL: Defaults configuration not loaded - engine cannot run without centralized defaults")
	}
	return defaultsConfig.AssetAllocation.DefaultStrategy.RebalanceThreshold
}

// GetDefaultInitialStockPrice returns the default initial stock price for backtesting
func GetDefaultInitialStockPrice() float64 {
	if defaultsConfig == nil {
		panic("CRITICAL: Defaults configuration not loaded - engine cannot run without centralized defaults")
	}
	return defaultsConfig.Backtesting.InitialPrices.Stocks
}

// GetDefaultInitialBondPrice returns the default initial bond price for backtesting
func GetDefaultInitialBondPrice() float64 {
	if defaultsConfig == nil {
		panic("CRITICAL: Defaults configuration not loaded - engine cannot run without centralized defaults")
	}
	return defaultsConfig.Backtesting.InitialPrices.Bonds
}

// GetDefaultMonthlyExpenses returns the default monthly expenses assumption
func GetDefaultMonthlyExpenses() float64 {
	if defaultsConfig == nil {
		panic("CRITICAL: Defaults configuration not loaded - engine cannot run without centralized defaults")
	}
	return defaultsConfig.Expenses.DefaultMonthlyExpenses.BaseAmount
}

// GetDefaultInflationRate returns the default inflation rate assumption
func GetDefaultInflationRate() float64 {
	if defaultsConfig == nil {
		panic("CRITICAL: Defaults configuration not loaded - engine cannot run without centralized defaults")
	}
	return defaultsConfig.Inflation.DefaultAnnualRate
}

// GetEmergencyFundMonths returns the default emergency fund target (months of expenses)
func GetEmergencyFundMonths() int {
	if defaultsConfig == nil {
		panic("CRITICAL: Defaults configuration not loaded - engine cannot run without centralized defaults")
	}
	return defaultsConfig.Expenses.EmergencyFund.MonthsOfExpenses
}

// GetDefaultBacktestAcquisitionDate returns the default acquisition date for backtest initial holdings
func GetDefaultBacktestAcquisitionDate() int {
	if defaultsConfig == nil {
		panic("CRITICAL: Defaults configuration not loaded - engine cannot run without centralized defaults")
	}
	return defaultsConfig.Backtesting.DefaultAcquisitionDate
}

// GetAgeBasedStrategyParams returns the age-based strategy parameters from config
func GetAgeBasedStrategyParams() (ageRuleConstant int, maxStock, minStock, domesticProportion, intlProportion float64) {
	if defaultsConfig == nil {
		panic("CRITICAL: Defaults configuration not loaded - engine cannot run without centralized defaults")
	}
	ageStrategy := defaultsConfig.Strategies.AgeBasedStrategy
	return ageStrategy.AgeRuleConstant,
		   ageStrategy.MaxStockAllocation,
		   ageStrategy.MinStockAllocation,
		   ageStrategy.DomesticStockProportion,
		   ageStrategy.InternationalStockProportion
}

// GlidePathBracket represents a single bracket in the glide path strategy
type GlidePathBracket struct {
	YearsToRetirementMin         int     `json:"yearsToRetirementMin"`
	StockPercentage              float64 `json:"stockPercentage"`
	DomesticStockProportion      float64 `json:"domesticStockProportion"`
	InternationalStockProportion float64 `json:"internationalStockProportion"`
}

// GetGlidePathBrackets returns the glide path strategy brackets from config
func GetGlidePathBrackets() []GlidePathBracket {
	if defaultsConfig == nil {
		panic("CRITICAL: Defaults configuration not loaded - engine cannot run without centralized defaults")
	}

	// Convert from config struct to the public type
	configBrackets := defaultsConfig.Strategies.GlidePathStrategy.Brackets
	brackets := make([]GlidePathBracket, len(configBrackets))

	for i, cb := range configBrackets {
		brackets[i] = GlidePathBracket{
			YearsToRetirementMin:         cb.YearsToRetirementMin,
			StockPercentage:              cb.StockPercentage,
			DomesticStockProportion:      cb.DomesticStockProportion,
			InternationalStockProportion: cb.InternationalStockProportion,
		}
	}

	return brackets
}

// All fallback functions have been removed to enforce fail-fast behavior.
// The engine will now refuse to run with missing or placeholder configuration data,
// ensuring 100% financial accuracy by preventing operation with incomplete information.

