//go:build js && wasm
// +build js,wasm

package main

import "syscall/js"

// retainedJSFuncs holds references to js.Func values to prevent them
// from being garbage collected by Go. If a js.Func is GC’d, subsequent
// calls from JavaScript can crash the WASM runtime and lead to
// "Go program has already exited" errors in workers.
var retainedJSFuncs []js.Func

// registerJSFunc creates a js.Func for the provided Go callback, assigns it to
// the given global name, and retains a reference so it is not GC’d.
func registerJSFunc(name string, fn func(js.Value, []js.Value) interface{}) {
    f := js.FuncOf(fn)
    js.Global().Set(name, f)
    retainedJSFuncs = append(retainedJSFuncs, f)
}

