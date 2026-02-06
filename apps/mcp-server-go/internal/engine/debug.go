//go:build !debug

package engine

// VERBOSE_DEBUG controls debug output — const false enables dead-code elimination
const VERBOSE_DEBUG = false

// DebugPrintf is a no-op when VERBOSE_DEBUG is false
// The compiler eliminates all `if VERBOSE_DEBUG { ... }` blocks at compile time
func DebugPrintf(format string, args ...interface{}) {}
