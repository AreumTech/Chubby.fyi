//go:build !production
// +build !production

package main

// VERBOSE_DEBUG controls verbose logging for development builds
const VERBOSE_DEBUG = true

// SIMULATION_VERBOSITY controls simulation logging detail level
// 0 = VERBOSE: Full debug output (all events, calculations, state changes)
// 1 = EVENT: One line per event (summary of each event outcome)
// 2 = MONTHLY: Monthly summary (aggregated month statistics)
// 3 = PATH: Path summary only (final simulation result)
var SIMULATION_VERBOSITY = 3 // Default to path summary only
