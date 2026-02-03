//go:build !production
// +build !production

package main

import "fmt"

// Debug logging functions - only included in development builds
// Build without these using: go build -tags production

var debugEnabled = false

// EnableDebug turns on debug logging
func EnableDebug() {
	debugEnabled = true
}

// DisableDebug turns off debug logging
func DisableDebug() {
	debugEnabled = false
}

// Debugf prints debug message if enabled
func Debugf(format string, args ...interface{}) {
	if debugEnabled {
		fmt.Printf(format, args...)
	}
}

// Debugln prints debug line if enabled
func Debugln(args ...interface{}) {
	if debugEnabled {
		fmt.Println(args...)
	}
}
