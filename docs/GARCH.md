# GARCH(1,1) Volatility Model

## Overview

The Monte Carlo engine uses GARCH(1,1) with standardized Student's t(5) innovations to model volatility clustering — the empirical observation that large market moves tend to be followed by large moves, and calm periods tend to persist.

This produces realistic fat-tailed return distributions and time-varying volatility, unlike constant-volatility models which understate both crash risk and calm-period stability.

## The Model

For each asset class, monthly returns are generated as:

```
r_t = μ + σ_t · z_t
```

where:
- `μ` = monthly mean return (converted from annual)
- `σ_t` = conditional monthly volatility (from GARCH process)
- `z_t` = standardized Student's t(5) shock with E[z²] = 1

The conditional variance follows GARCH(1,1):

```
σ²_t = ω + α · ε²_{t-1} + β · σ²_{t-1}
```

where `ε_{t-1} = r_{t-1} - μ` is the previous period's return shock.

## Parameter Roles

| Parameter | Role | Effect |
|-----------|------|--------|
| **ω** (omega) | Baseline variance | Anchors long-run vol to target; derived at runtime |
| **α** (alpha) | Shock impact | How much a large return increases next-period vol |
| **β** (beta) | Persistence | How much current vol carries into next period |
| **α + β** | Total persistence | Controls mean-reversion speed of volatility |
| **df** | Degrees of freedom | Fat-tail heaviness (df=5 → excess kurtosis = 6) |

## Stationarity

For the GARCH process to be stationary (mean-reverting), we need:

```
α + β < 1
```

This holds because our t-distribution is **standardized** (E[z²] = 1). With raw (non-standardized) t(df), the condition would be the stricter `α · df/(df-2) + β < 1`, which forces artificially low parameters.

## Standardized Student's t

The raw Student's t(df) distribution has variance df/(df-2), not 1. We standardize by generating:

```
z = Z / √(χ² / (df - 2))     instead of     Z / √(χ² / df)
```

where Z ~ N(0,1) and χ² ~ χ²(df). This gives E[z²] = 1, which means:

1. The GARCH unconditional variance formula remains `ω / (1 - α - β)`
2. Standard stationarity condition `α + β < 1` applies
3. We can use historically calibrated α/β values directly
4. Fat tails are preserved (same shape, just rescaled to unit variance)

## Omega Derivation

Omega is **not a free parameter** — it's derived from the target annual volatility:

```
σ²_monthly = (σ_annual / √12)²

ω = σ²_monthly · (1 - α - β)
```

This ensures the unconditional (long-run average) variance equals the target:

```
E[σ²] = ω / (1 - α - β) = σ²_monthly  ✓
```

Omega is computed once in `PrecomputeConfigParameters()` and cached. The `GarchSPYOmega` field in `StochasticModelConfig` is a legacy placeholder and is **ignored at runtime**.

## Variance Clamping

To prevent extreme but theoretically possible volatility explosions in finite samples, variance is clamped:

```
σ²_t = min(σ²_t, 6.25 · σ²_unconditional)
```

This allows volatility up to 2.5× the target (e.g., SPY: 16% → max 40%), which covers historical extremes like 2008 (VIX peaked ~80% but monthly realized vol was ~40%).

## Monthly Calibration

**Key insight**: GARCH parameters from daily data (α ≈ 0.09, β ≈ 0.90 from NYU V-Lab) don't translate directly to monthly frequency. Monthly aggregation reduces autocorrelation.

The volatility half-life (time for a shock to decay by half) relates to persistence:

```
t_{1/2} = ln(2) / ln(1/(α + β))
```

| α + β | Half-life (months) | Appropriate for |
|-------|-------------------|-----------------|
| 0.99  | 69 months (5.8 yr) | Daily data only |
| 0.95  | 13 months          | Monthly equities |
| 0.93  | 10 months          | Monthly intl/alts |
| 0.90  | 7 months           | Monthly single stocks |

The VIX mean-reverts with a half-life of ~4-6 months, supporting monthly α+β ≈ 0.90-0.95.

### Default Parameters

| Asset Class | α (shock) | β (persist) | α+β | Half-life | Target Vol |
|------------|-----------|-------------|-----|-----------|------------|
| S&P 500    | 0.15      | 0.80        | 0.95 | 13 mo    | 16%        |
| Bonds      | 0.08      | 0.85        | 0.93 | 10 mo    | 5%         |
| Intl Equities | 0.15   | 0.78        | 0.93 | 10 mo    | 20%        |
| Alternatives | 0.18    | 0.75        | 0.93 | 10 mo    | 25%        |
| Individual Stocks | 0.20 | 0.70      | 0.90 | 7 mo     | 35%        |

Rationale:
- **Higher α for riskier assets**: Single stocks react more violently to shocks
- **Lower β for riskier assets**: Idiosyncratic vol dissipates faster than systematic vol
- **Bonds**: Lowest shock sensitivity, highest relative persistence (rate regimes are sticky)

## Correlation Structure

The 8 asset shocks (SPY, Bond, Intl, Inflation, Home, Rental, Other, Individual) are correlated via Cholesky decomposition of the correlation matrix. Independent standardized t(5) shocks are generated first, then transformed:

```
z_correlated = L · z_independent
```

where L is the lower-triangular Cholesky factor of the 8×8 correlation matrix.

## Code Locations

- **Parameters**: `wasm/config.go` — `GetDefaultStochasticConfig()`
- **Omega derivation + caching**: `wasm/math.go` — `PrecomputeConfigParameters()`
- **Validation**: `wasm/math.go` — `validateStochasticConfig()`
- **GARCH update (unseeded)**: `wasm/math.go` — `GenerateAdvancedStochasticReturns()`
- **GARCH update (seeded)**: `wasm/math.go` — `GenerateAdvancedStochasticReturnsSeeded()`
- **t-distribution**: `wasm/math.go` — `StudentTRandom()`, `wasm/seeded_rng.go` — `StudentTRandomSeeded()`
- **State initialization**: `wasm/math.go` — `InitializeStochasticState()`
- **Diagnostic test**: `wasm/garch_diagnostic_test.go`

## References

- Bollerslev, T. (1986). "Generalized Autoregressive Conditional Heteroskedasticity." *Journal of Econometrics*.
- Bollerslev, T. (1987). "A Conditionally Heteroskedastic Time Series Model for Speculative Prices and Rates of Return." *Review of Economics and Statistics*. (Introduced GARCH-t)
- NYU Stern V-Lab: https://vlab.stern.nyu.edu/volatility/VOL.SPX:IND-R.GARCH (Live S&P 500 GARCH estimates)
- Engle, R.F. (1982). "Autoregressive Conditional Heteroscedasticity with Estimates of the Variance of United Kingdom Inflation." *Econometrica*.
