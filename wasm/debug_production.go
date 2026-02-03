//go:build production
// +build production

package main

// Production build - all debug functions are no-ops
// Build with: go build -tags production

// EnableDebug no-op
func EnableDebug() {}

// DisableDebug no-op
func DisableDebug() {}

// Debugf no-op
func Debugf(format string, args ...interface{}) {}

// Debugln no-op
func Debugln(args ...interface{}) {}
