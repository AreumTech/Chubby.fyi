package main

import (
    "math"
    "reflect"
)

// sanitizeForJSON walks the value recursively and replaces any NaN/Inf floats
// with 0 to guarantee JSON marshaling succeeds (encoding/json rejects NaN/Inf).
func sanitizeForJSON(v interface{}) {
    if v == nil {
        return
    }
    sanitizeValue(reflect.ValueOf(v))
}

func sanitizeValue(rv reflect.Value) {
    if !rv.IsValid() {
        return
    }

    // If it's a pointer, dereference and sanitize the element
    if rv.Kind() == reflect.Ptr {
        if rv.IsNil() {
            return
        }
        sanitizeValue(rv.Elem())
        return
    }

    switch rv.Kind() {
    case reflect.Struct:
        for i := 0; i < rv.NumField(); i++ {
            f := rv.Field(i)
            // Ensure we can set; if not addressable, try address of field
            if f.CanSet() || f.Kind() == reflect.Ptr || f.Kind() == reflect.Map || f.Kind() == reflect.Slice || f.Kind() == reflect.Struct {
                sanitizeValue(f)
            } else if f.CanAddr() {
                sanitizeValue(f.Addr())
            }
        }
    case reflect.Slice, reflect.Array:
        for i := 0; i < rv.Len(); i++ {
            sanitizeValue(rv.Index(i))
        }
    case reflect.Map:
        // Iterate and sanitize values; then set back
        for _, key := range rv.MapKeys() {
            val := rv.MapIndex(key)
            // Create a copy we can modify
            copyVal := reflect.New(val.Type()).Elem()
            copyVal.Set(val)
            sanitizeValue(copyVal)
            rv.SetMapIndex(key, copyVal)
        }
    case reflect.Float32, reflect.Float64:
        f := rv.Float()
        if math.IsNaN(f) || math.IsInf(f, 0) {
            if rv.CanSet() {
                rv.SetFloat(0)
            }
        }
    case reflect.Interface:
        if !rv.IsNil() {
            v := rv.Elem()
            sanitizeValue(v)
        }
    default:
        // primitives, strings, bools – nothing to do
    }
}

