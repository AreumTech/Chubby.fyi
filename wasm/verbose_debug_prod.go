//go:build production
// +build production

package main

// VERBOSE_DEBUG disables verbose logging for production builds
const VERBOSE_DEBUG = false

// SIMULATION_VERBOSITY controls simulation logging detail level
// Production default: path summary only (level 3)
var SIMULATION_VERBOSITY = 3
