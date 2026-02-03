# Schema-Based Type Generation

This directory contains JSON Schema definitions that serve as the single source of truth for data structures shared between the Go WASM simulation engine and the TypeScript frontend.

## Overview

The AreumFire application uses a sophisticated type system to ensure data consistency between:
- **Go WASM Engine**: Financial simulation processing
- **TypeScript Frontend**: UI and data presentation

Instead of manually maintaining parallel type definitions, we use JSON Schema as the authoritative definition and automatically generate both Go structs and TypeScript interfaces.

## Architecture

```
JSON Schema (schemas/) 
    ↓
    ├── TypeScript Types (src/types/generated/)
    └── Go Structs (wasm/generated_types.go)
```

## Schema Files

### Core Data Structures
- **`financial-event.json`** - Financial events that occur during simulation
- **`account-holdings.json`** - Account holdings with tax lots and cost basis
- **`monthly-data.json`** - Comprehensive monthly simulation snapshot

### Simulation Types  
- **`simulation-input.json`** - Input parameters for simulation runs
- **`simulation-result.json`** - Results from a single simulation run
- **`simulation-results.json`** - Aggregated Monte Carlo simulation results

## Type Generation

### Automatic Generation
Types are automatically generated during the build process:

```bash
npm run build  # Generates types, builds WASM, then builds frontend
```

### Manual Generation
You can generate types independently:

```bash
# Generate both TypeScript and Go types
npm run generate-types

# Generate only TypeScript types
npm run generate-types:ts

# Generate only Go types  
npm run generate-types:go
```

### Generated Files

**TypeScript**: `src/types/generated/`
- `financial-event.ts`
- `account-holdings.ts` 
- `monthly-data.ts`
- `simulation-input.ts`
- `simulation-result.ts`
- `simulation-results.ts`
- `index.ts` (exports all types)

**Go**: `wasm/generated_types.go`
- Contains all struct definitions with proper JSON tags
- Includes documentation comments from schema descriptions

## Schema Design Principles

### 1. Single Source of Truth
- All type definitions originate from JSON Schema
- No manual type definitions in Go or TypeScript
- Schema serves as documentation and contract

### 2. Validation Support
- JSON Schema enables runtime validation
- Can validate API payloads against schema
- Catch type mismatches early in development

### 3. Documentation Integration
- Schema descriptions become code comments
- Self-documenting API contracts
- Always up-to-date documentation

### 4. Build-Time Safety
- Type generation fails if schema is invalid
- Prevents deployment of incompatible types
- Enforces consistency across languages

## Best Practices

### Modifying Types

1. **Edit the JSON Schema** (not the generated code)
2. **Regenerate types** with `npm run generate-types`
3. **Update consuming code** if interfaces changed
4. **Run tests** to ensure compatibility

### Schema Guidelines

- Use descriptive `title` and `description` fields
- Define `required` fields explicitly
- Use appropriate data types (`string`, `number`, `integer`, `boolean`)
- Include validation constraints (`minimum`, `maximum`, `enum`)
- Document complex fields with descriptions

### Example Schema Structure

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "ExampleType",
  "description": "Description of the data structure",
  "type": "object",
  "properties": {
    "id": {
      "type": "string",
      "description": "Unique identifier"
    },
    "amount": {
      "type": "number",
      "minimum": 0,
      "description": "Monetary amount"
    },
    "status": {
      "type": "string",
      "enum": ["pending", "completed", "failed"],
      "description": "Current status"
    }
  },
  "required": ["id", "amount", "status"]
}
```

## Tools and Dependencies

### TypeScript Generation
- **json-schema-to-typescript**: Converts JSON Schema to TypeScript interfaces
- **Generated Location**: `src/types/generated/`
- **Features**: Type safety, JSDoc comments, enum support

### Go Generation  
- **Custom Generator**: `scripts/generate-go-types.go`
- **Generated Location**: `wasm/generated_types.go`
- **Features**: Proper naming conventions, JSON tags, comments

## Integration with Existing Code

### TypeScript Usage
```typescript
import { FinancialEvent, SimulationInput, MonthlyData } from '@/types/generated';

// Type-safe usage
const event: FinancialEvent = {
  id: "event-1",
  type: "income", 
  monthOffset: 12,
  amount: 5000
};
```

### Go Usage
```go
// Import generated types
import "your-module/wasm"

// Type-safe usage
event := FinancialEvent{
    ID:          "event-1",
    Type:        "income",
    MonthOffset: 12,
    Amount:      5000,
}
```

## Migration Strategy

### Phase 1: Core Types ✅
- FinancialEvent
- AccountHoldings  
- MonthlyData
- Simulation input/output types

### Phase 2: Strategy Types (Future)
- AssetAllocationStrategy
- RebalancingParameters
- TaxLossHarvestingSettings
- WithdrawalStrategy

### Phase 3: Complex Types (Future)
- TaxCalculationResult
- StochasticModelConfig
- EventMetadata variations

## Troubleshooting

### Common Issues

**Type generation fails**:
- Verify JSON Schema syntax is valid
- Check that all referenced schemas exist
- Ensure required fields are properly defined

**Generated types don't match expectations**:
- Review the JSON Schema definition
- Check field naming in the schema
- Verify data types are correct

**Build failures after type changes**:
- Update consuming code to match new interfaces
- Run `npm run generate-types` before building
- Check TypeScript compilation errors

### Validation

Test your schemas with online validators:
- [JSON Schema Validator](https://www.jsonschemavalidator.net/)
- [Schema Store](https://schemastore.org/)

## Benefits

### Development Experience
- **Type Safety**: Catch errors at compile time
- **IntelliSense**: Full IDE support with autocomplete
- **Refactoring**: Safe renames and structural changes

### Maintenance
- **Single Source**: One place to update type definitions  
- **Consistency**: Impossible for types to drift between languages
- **Documentation**: Always up-to-date interface docs

### Quality Assurance
- **Validation**: Runtime validation against schemas
- **Testing**: Mock data generation from schemas
- **API Contracts**: Clear interface definitions

This schema-driven approach eliminates the most common source of bugs in full-stack applications: type mismatches between frontend and backend.