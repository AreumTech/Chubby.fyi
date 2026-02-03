package main

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"unicode"
)

type JSONSchema struct {
	Title       string                        `json:"title"`
	Description string                        `json:"description"`
	Type        string                        `json:"type"`
	Properties  map[string]PropertyDefinition `json:"properties"`
	Required    []string                      `json:"required"`
	Definitions map[string]PropertyDefinition `json:"definitions"`
}

type PropertyDefinition struct {
	Type        string                        `json:"type"`
	Items       *PropertyDefinition           `json:"items"`
	Properties  map[string]PropertyDefinition `json:"properties"`
	Required    []string                      `json:"required"`
	Description string                        `json:"description"`
	Enum        []interface{}                 `json:"enum"`
	Minimum     *float64                      `json:"minimum"`
	Maximum     *float64                      `json:"maximum"`
	Ref         string                        `json:"$ref"`
}

func main() {
	schemasDir := filepath.Join("schemas")
	outputFile := filepath.Join("wasm", "generated_types.go")

	schemas := []string{
		"financial-event.json",
		"account-holdings.json",
		"monthly-data.json",
		"simulation-input.json",
		"simulation-result.json",
		"simulation-results.json",
	}

	var output strings.Builder
	output.WriteString("// Code generated from JSON Schema. DO NOT EDIT.\n")
	output.WriteString("// To regenerate: go run scripts/generate-go-types.go\n\n")
	output.WriteString("package main\n\n")

	for _, schemaFile := range schemas {
		schemaPath := filepath.Join(schemasDir, schemaFile)
		
		fmt.Printf("Processing %s...\n", schemaFile)
		
		data, err := ioutil.ReadFile(schemaPath)
		if err != nil {
			fmt.Printf("Error reading %s: %v\n", schemaFile, err)
			continue
		}

		var schema JSONSchema
		if err := json.Unmarshal(data, &schema); err != nil {
			fmt.Printf("Error parsing %s: %v\n", schemaFile, err)
			continue
		}

		goStruct := generateGoStruct(schema)
		output.WriteString(goStruct)
		output.WriteString("\n")
	}

	if err := ioutil.WriteFile(outputFile, []byte(output.String()), 0644); err != nil {
		fmt.Printf("Error writing output file: %v\n", err)
		os.Exit(1)
	}

	fmt.Printf("✅ Generated Go types in %s\n", outputFile)
}

func generateGoStruct(schema JSONSchema) string {
	var result strings.Builder
	
	if schema.Description != "" {
		result.WriteString(fmt.Sprintf("// %s\n", schema.Description))
	}
	
	structName := toPascalCase(schema.Title)
	result.WriteString(fmt.Sprintf("type %s struct {\n", structName))
	
	// Sort properties for consistent output
	var propertyNames []string
	for name := range schema.Properties {
		propertyNames = append(propertyNames, name)
	}
	sort.Strings(propertyNames)
	
	for _, propName := range propertyNames {
		prop := schema.Properties[propName]
		fieldName := toPascalCase(propName)
		fieldType := getGoType(prop)
		jsonTag := getJSONTag(propName, prop, isRequired(propName, schema.Required))
		
		comment := ""
		if prop.Description != "" {
			comment = fmt.Sprintf(" // %s", prop.Description)
		}
		
		result.WriteString(fmt.Sprintf("\t%s %s `%s`%s\n", fieldName, fieldType, jsonTag, comment))
	}
	
	result.WriteString("}\n")
	return result.String()
}

func getGoType(prop PropertyDefinition) string {
	switch prop.Type {
	case "string":
		if len(prop.Enum) > 0 {
			return "string" // Could create custom types for enums
		}
		return "string"
	case "number":
		return "float64"
	case "integer":
		return "int"
	case "boolean":
		return "bool"
	case "array":
		if prop.Items != nil {
			itemType := getGoType(*prop.Items)
			return fmt.Sprintf("[]%s", itemType)
		}
		return "[]interface{}"
	case "object":
		if len(prop.Properties) == 0 {
			return "map[string]interface{}"
		}
		// For now, use map - could generate nested structs
		return "map[string]interface{}"
	default:
		return "interface{}"
	}
}

func getJSONTag(propName string, prop PropertyDefinition, required bool) string {
	tag := fmt.Sprintf("json:\"%s", propName)
	if !required {
		tag += ",omitempty"
	}
	tag += "\""
	return tag
}

func isRequired(propName string, required []string) bool {
	for _, req := range required {
		if req == propName {
			return true
		}
	}
	return false
}

func toPascalCase(s string) string {
	// Handle special cases first
	specialCases := map[string]string{
		"FinancialEvent":                           "FinancialEvent",
		"AccountHoldingsMonthEnd":                  "AccountHoldingsMonthEnd",
		"MonthlyData":                              "MonthlyData",
		"SimulationInput":                          "SimulationInput",
		"SimulationResult":                         "SimulationResult",
		"SimulationResults":                        "SimulationResults",
		"monthOffset":                              "MonthOffset",
		"tax_deferred":                             "TaxDeferred",
		"netWorth":                                 "NetWorth",
		"cashFlow":                                 "CashFlow",
		"incomeThisMonth":                          "IncomeThisMonth",
		"expensesThisMonth":                        "ExpensesThisMonth",
		"contributionsToInvestmentsThisMonth":      "ContributionsToInvestmentsThisMonth",
		"withdrawalsFromInvestmentsThisMonth":      "WithdrawalsFromInvestmentsThisMonth",
		"taxesOwedThisMonth":                       "TaxesOwedThisMonth",
		"taxesPaidThisMonth":                       "TaxesPaidThisMonth",
		"capitalGainsRealizedThisMonth":            "CapitalGainsRealizedThisMonth",
		"capitalLossesRealizedThisMonth":           "CapitalLossesRealizedThisMonth",
		"dividendsReceivedThisMonth":               "DividendsReceivedThisMonth",
		"interestReceivedThisMonth":                "InterestReceivedThisMonth",
		"rebalancingCostsThisMonth":                "RebalancingCostsThisMonth",
		"taxLossHarvestingBenefitThisMonth":        "TaxLossHarvestingBenefitThisMonth",
		"rothConversionAmountThisMonth":            "RothConversionAmountThisMonth",
		"requiredMinimumDistributionThisMonth":     "RequiredMinimumDistributionThisMonth",
		"initialAccounts":                          "InitialAccounts",
		"monthsToRun":                              "MonthsToRun",
		"withdrawalStrategy":                       "WithdrawalStrategy",
		"monthlyData":                              "MonthlyData",
		"numberOfRuns":                             "NumberOfRuns",
		"finalNetWorthP10":                         "FinalNetWorthP10",
		"finalNetWorthP25":                         "FinalNetWorthP25",
		"finalNetWorthP50":                         "FinalNetWorthP50",
		"finalNetWorthP75":                         "FinalNetWorthP75",
		"finalNetWorthP90":                         "FinalNetWorthP90",
		"probabilityOfSuccess":                     "ProbabilityOfSuccess",
	}
	
	if special, exists := specialCases[s]; exists {
		return special
	}
	
	// Convert snake_case and kebab-case to PascalCase
	words := strings.FieldsFunc(s, func(c rune) bool {
		return c == '_' || c == '-' || c == ' '
	})
	
	var result strings.Builder
	for _, word := range words {
		if len(word) > 0 {
			result.WriteString(strings.ToUpper(string(word[0])))
			if len(word) > 1 {
				result.WriteString(strings.ToLower(word[1:]))
			}
		}
	}
	
	// Handle special cases after basic conversion
	pascalCase := result.String()
	
	// Fix common patterns
	pascalCase = strings.ReplaceAll(pascalCase, "Id", "ID")
	pascalCase = strings.ReplaceAll(pascalCase, "Rmd", "RMD")
	
	// Capitalize first letter if not already
	if len(pascalCase) > 0 && unicode.IsLower(rune(pascalCase[0])) {
		pascalCase = strings.ToUpper(string(pascalCase[0])) + pascalCase[1:]
	}
	
	return pascalCase
}