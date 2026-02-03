# Financial Data Sources and Citations

This document provides authoritative citations for all financial constants, tax rules, and market data used in the PathFinder Pro simulation engine. All data is loaded from external JSON configuration files to ensure accuracy and maintainability.

## Data Integrity Standards

- **Government Sources Only**: Tax rules sourced directly from IRS, state tax authorities, and CMS
- **Current Tax Year**: All brackets and limits current for 2024/2025 tax years
- **Authoritative Citations**: Each data point includes direct reference to government publication
- **Annual Updates**: Configuration files updated annually with new tax law changes

## Configuration Files and Sources

### 1. Federal Tax Brackets (`tax_brackets_2024.json`)

**Source**: IRS Publication 15 (2024) - Employer's Tax Guide
- **URL**: https://www.irs.gov/pub/irs-pdf/p15.pdf
- **Table References**:
  - Single filers: Table 5, page 47
  - Married filing jointly: Table 5, page 47
  - Standard deduction: Table 8, page 49

**Long-Term Capital Gains Brackets**:
- **Source**: IRS Publication 550 (2023) - Investment Income and Expenses
- **URL**: https://www.irs.gov/pub/irs-pdf/p550.pdf
- **Section**: Chapter 4, Capital Gains and Losses

### 2. Required Minimum Distributions (`rmd_table_2024.json`)

**Source**: IRS Publication 590-B (2023) - Distributions from Individual Retirement Arrangements
- **URL**: https://www.irs.gov/pub/irs-pdf/p590b.pdf
- **Table**: Appendix B, Table III (Uniform Lifetime)
- **Legal Authority**: Internal Revenue Code Section 401(a)(9)

### 3. Contribution Limits (`contribution_limits_2025.json`)

**401(k) and IRA Limits**:
- **Source**: IRS Announcement 2023-22 (2025 contribution limits)
- **URL**: https://www.irs.gov/newsroom/401k-limit-increases-to-23000-for-2024-ira-limit-rises-to-7000
- **Legal Authority**: IRC Sections 402(g), 219, 408A

**HSA Contribution Limits**:
- **Source**: IRS Revenue Procedure 2023-23
- **URL**: https://www.irs.gov/pub/irs-drop/rp-23-23.pdf
- **Legal Authority**: IRC Section 223

**Social Security Wage Base**:
- **Source**: Social Security Administration Notice 2023
- **URL**: https://www.ssa.gov/news/press/releases/2023/#10-2023-2

### 4. FICA Tax Rates (`fica_tax_2024.json`)

**Social Security and Medicare Rates**:
- **Source**: IRS Publication 15 (2024) - Employer's Tax Guide
- **URL**: https://www.irs.gov/pub/irs-pdf/p15.pdf
- **Tables**: Social Security tax rate (6.2%), Medicare tax rate (1.45%)
- **Legal Authority**: IRC Sections 3101, 3111

**Additional Medicare Tax**:
- **Source**: IRS Instructions for Form 8959 (2023)
- **URL**: https://www.irs.gov/forms-pubs/about-form-8959
- **Rate**: 0.9% on income over thresholds
- **Legal Authority**: IRC Section 3101(b)(2)

### 5. State Tax Brackets (`state_tax_brackets.json`)

**Currently Implemented States**:
- **California**: California Franchise Tax Board, 2024 Tax Table
- **New York**: NYS Department of Taxation and Finance, 2024 Tax Tables
- **Texas**: No state income tax
- **Florida**: No state income tax
- **Pennsylvania**: 3.07% flat rate (PA Department of Revenue)
- **Illinois**: 4.95% flat rate (IL Department of Revenue)
- **Ohio**: Ohio Department of Taxation, 2024 Tax Tables
- **Georgia**: Georgia Department of Revenue, 2024 Tax Tables
- **North Carolina**: 4.9% flat rate (NC Department of Revenue)
- **Michigan**: 4.25% flat rate (MI Department of Treasury)

**Verification Method**: Each state's brackets cross-referenced with official state tax forms

### 6. Medicare IRMAA Brackets (`irmaa_brackets_2024.json`)

**Source**: Centers for Medicare & Medicaid Services (CMS)
- **URL**: https://www.cms.gov/medicare/enrollment-and-renewal/medicare-premium-rates
- **Publication**: Medicare Part B and Part D Premium Rates for 2024
- **Legal Authority**: Social Security Act Section 1839(i)

**Data Points**:
- Income-Related Monthly Adjustment Amounts for Medicare Part B
- Income-Related Monthly Adjustment Amounts for Medicare Part D
- Modified Adjusted Gross Income thresholds

### 7. Historical Asset Returns (`asset_returns_historical.json`)

**Stock Market Returns (S&P 500)**:
- **Primary Source**: CRSP (Center for Research in Security Prices)
- **Secondary Source**: Robert Shiller's CAPE data
- **URL**: http://www.econ.yale.edu/~shiller/data.htm
- **Time Period**: 1926-2023 monthly returns

**Bond Returns (10-Year Treasury)**:
- **Source**: Federal Reserve Economic Data (FRED)
- **URL**: https://fred.stlouisfed.org/series/GS10
- **Series ID**: GS10 (10-Year Treasury Constant Maturity Rate)

**Inflation Data (CPI-U)**:
- **Source**: Bureau of Labor Statistics
- **URL**: https://www.bls.gov/cpi/data.htm
- **Series ID**: CUUR0000SA0 (All Urban Consumers, All Items)

### 8. Real Estate Data (`monthly_real_estate_data.json`)

**CRITICAL UPDATE**: Real estate data now uses discrete monthly data to eliminate mathematical inaccuracies from annual smoothing.

**National Home Price Indices (Monthly)**:
- **Primary Source**: FRED Economic Data - Case-Shiller U.S. National Home Price Index
- **Series ID**: CSUSHPINSA (Not Seasonally Adjusted)
- **URL**: https://fred.stlouisfed.org/series/CSUSHPINSA
- **Data Type**: Month-over-month percentage changes (discrete monthly data)

**Rent Growth Data (Monthly)**:
- **Source**: Bureau of Labor Statistics - CPI Rent of Primary Residence
- **Series ID**: CUSR0000SEHA
- **URL**: https://fred.stlouisfed.org/series/CUSR0000SEHA
- **Data Type**: Month-over-month percentage changes

**Regional Price Parities**:
- **Source**: Bureau of Economic Analysis Regional Price Parities
- **URL**: https://www.bea.gov/data/prices-inflation/regional-price-parities-state-and-metro-area
- **Usage**: Applied as multipliers to national data for regional accuracy

**Data Integrity**: NO annual smoothing or interpolation - preserves intra-year volatility and sequence-of-returns risk.

### 9. Dividend Yield Models (`dividend_model_data.json`)

**CRITICAL UPDATE**: Dividend data now uses discrete historical quarterly/monthly yields to eliminate smoothed annual approximations.

**S&P 500 Dividend Yields (Quarterly)**:
- **Source**: S&P Dow Jones Indices - S&P 500 Dividend Yield
- **URL**: https://www.spglobal.com/spdji/en/indices/equity/sp-500/
- **Data Type**: Discrete quarterly dividend yields (2020-2024)

**Bond Yields (Monthly)**:
- **Source**: BlackRock iShares Core U.S. Aggregate Bond ETF (AGG)
- **URL**: https://www.ishares.com/us/products/239458/ishares-core-total-us-bond-market-etf
- **Alternative**: FRED Economic Data - Treasury Constant Maturity Rates
- **Data Type**: Monthly SEC yield data

**International Stock Dividends (Quarterly)**:
- **Source**: Vanguard Total International Stock ETF (VXUS)
- **URL**: https://investor.vanguard.com/investment-products/etfs/profile/vxus
- **Data Type**: Quarterly distribution yield data

**Real Estate Investment Trusts (Quarterly)**:
- **Source**: FTSE Nareit All Equity REITs Index
- **URL**: https://www.reit.com/data-research/reit-indexes/monthly-index-values-returns
- **Data Type**: Quarterly dividend yield data from index provider

**Data Integrity**: Uses actual historical dividend payment timing and yields - NO annual smoothing or static yield assumptions.

### 10. Default Assumptions (`defaults.json`)

**NEW**: Centralized default assumptions to eliminate hardcoded values and ensure transparency.

**Asset Allocation Defaults**:
- **Source**: Vanguard Target Retirement Fund allocations
- **Reference**: https://investor.vanguard.com/investment-products/mutual-funds/target-retirement-funds
- **Methodology**: Based on lifecycle fund best practices for moderate risk tolerance

**Expense Assumptions**:
- **Source**: Bureau of Labor Statistics Consumer Expenditure Survey 2023
- **URL**: https://www.bls.gov/news.release/cesan.nr0.htm
- **Default**: $6,000/month (median U.S. household expenses, updated from previous $10k assumption)

**Backtesting Defaults**:
- **Initial Market Prices**: Based on historical ETF inception prices
- **Emergency Fund**: 3 months of expenses (standard financial planning practice)
- **Safe Withdrawal Rate**: 4% annually (Trinity Study methodology)

### 11. Type-Safe Event Metadata Structures

**NEW**: Structured metadata replaces error-prone map[string]interface{} parsing.

**Liability Details Metadata**:
- All mortgage and loan parameters now use strongly-typed structs
- PITI (Principal, Interest, Taxes, Insurance) components fully modeled
- Tax deductibility flags explicit and required (no defaults)

**Property Details Metadata**:
- Real estate purchases use comprehensive property modeling
- Location-based tax rates and insurance costs
- Rental property income and expenses structured

**Strategy Settings Metadata**:
- Asset allocation strategies with glide path support
- Tax optimization flags (tax-loss harvesting, asset location)
- Rebalancing parameters and risk tolerance mapping

**Benefits**: Eliminates runtime type assertion errors, makes UI-engine contract explicit, enables compile-time validation.

### 12. Enhanced Backtesting Scenarios (`monthly_historical_data.json`)

**NEW**: Event-driven backtesting scenarios for complex financial plans.

**Retire Into 2008 Crisis**:
- Historical scenario: Retirement at beginning of 2008 financial crisis
- Events: Retirement event + monthly withdrawal schedule
- Period: 2007-2010 (48 months)
- Tests: Sequence-of-returns risk during major bear market

**Dollar-Cost Average Through Dot-Com Crash**:
- Historical scenario: Monthly contributions during 2000-2003 bear market
- Events: Monthly 401k contributions + annual bonus contributions
- Period: 2000-2003 (48 months)
- Tests: Benefits of systematic investing during market downturns

**Home Purchase Before Housing Bubble**:
- Historical scenario: Home purchase in 2006 before housing market crash
- Events: Real estate purchase + mortgage liability creation
- Period: 2006-2012 (84 months)
- Tests: Real estate timing and leverage effects during housing crisis

**Data Sources for Scenarios**:
- **Stock Returns**: Yahoo Finance SPY ETF total returns
- **Bond Returns**: Yahoo Finance AGG/TLT ETF total returns
- **Home Prices**: FRED Case-Shiller Home Price Index (CSUSHPINSA)
- **Rent Growth**: FRED CPI Rent of Primary Residence (CUSR0000SEHA)
- **Inflation**: FRED Consumer Price Index (CPIAUCSL)

## Data Accuracy Improvements (September 2024)

### Mathematical Accuracy Enhancements

1. **Eliminated Annual Smoothing**:
   - Real estate data now uses discrete monthly Case-Shiller data
   - Dividend yields use actual quarterly/monthly payment schedules
   - Preserves sequence-of-returns risk and intra-year volatility

2. **Centralized Default Assumptions**:
   - All hardcoded values moved to `defaults.json` configuration
   - Transparent and configurable financial assumptions
   - Eliminates "magic numbers" in Go source code

3. **Type-Safe Event Processing**:
   - Replaced `map[string]interface{}` with strongly-typed structs
   - Eliminates runtime type assertion errors
   - Makes UI-engine contract explicit and validatable

4. **Event-Driven Backtesting**:
   - Support for complex financial plans in historical scenarios
   - Real estate purchases, mortgage creation, systematic withdrawals
   - Tests comprehensive life events against actual market history

### Data Sources Upgrade Summary

| Component | Previous Approach | New Approach | Mathematical Accuracy Gain |
|-----------|------------------|--------------|----------------------------|
| Real Estate | Annual → Monthly smoothing | Discrete monthly FRED data | Preserves intra-year volatility |
| Dividends | Single static yield | Historical quarterly yields | Eliminates smoothing artifacts |
| Defaults | Hardcoded values | Externalized configuration | Transparency and auditability |
| Metadata | Type assertions | Strongly-typed structs | Compile-time error prevention |
| Backtesting | Simple buy-and-hold | Event-driven scenarios | Real-world complexity testing |

## Data Validation Process

### 1. Cross-Reference Verification
- All tax brackets verified against multiple government sources
- Historical market data validated against academic datasets
- Medicare premiums confirmed with CMS official releases
- Real estate data cross-checked against Case-Shiller methodology

### 2. Annual Update Protocol
1. Monitor IRS Revenue Procedures for contribution limit changes
2. Check state tax authority websites for bracket updates
3. Verify Medicare premium adjustments from CMS
4. Update historical market data through current year

### 3. Accuracy Assurance
- Government source references included in JSON metadata
- Data extraction scripts document transformation process
- Unit tests validate critical calculations against known results

## File Status

### ✅ Currently Implemented
- `state_tax_brackets.json` - Complete with 10 major states
- `tax_brackets_2024.json` - Federal income tax and LTCG brackets ✅ **COMPLETE**
- `rmd_table_2024.json` - IRS Uniform Lifetime Table ✅ **COMPLETE**
- `contribution_limits_2025.json` - 401k, IRA, HSA limits ✅ **COMPLETE**
- `fica_tax_2024.json` - Social Security and Medicare rates ✅ **COMPLETE**
- `irmaa_brackets_2024.json` - Medicare premium adjustments ✅ **COMPLETE**
- `asset_returns_historical.json` - Monthly market data 2003-2025 ✅ **COMPLETE**
- `real_estate_data.json` - National and regional housing data ✅ **COMPLETE**
- `dividend_model_data.json` - Real dividend yield models ✅ **COMPLETE**

### 🔄 Required Implementation
**All critical financial data files are now implemented with authoritative sources**

## Compliance Notes

### Legal Disclaimers
- Tax calculations for informational purposes only
- Users should consult tax professionals for actual filing
- Financial projections are estimates based on historical data

### Update Frequency
- **Tax Data**: Updated annually after IRS releases new brackets
- **Market Data**: Updated monthly/quarterly as available
- **Medicare Data**: Updated annually with CMS announcements

### Data Retention
- Previous year tax brackets maintained for historical analysis
- Market data preserved for backtesting validation
- Configuration changes tracked in version control

---

**Last Updated**: September 2024
**Next Review Date**: January 2025 (for 2025 tax year updates)
**Maintainer**: PathFinder Pro Development Team