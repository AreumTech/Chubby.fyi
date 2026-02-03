# Security Policy

This document outlines the security principles for Chubby.

---

## 1. Zero Data Storage

Chubby stores **nothing**. This is the core security principle:

| What               | Where                   | Storage              |
| ------------------ | ----------------------- | -------------------- |
| Simulation inputs  | URL fragment (`#d=...`) | Client-side only     |
| Simulation results | URL fragment            | Client-side only     |
| User profiles      | Not supported           | None                 |
| Chat history       | ChatGPT/Claude          | Their policies apply |

**URL fragments never reach servers.** The `#` portion of a URL is not sent in HTTP requests. When you share a Chubby widget URL like `widget.chubby.fyi/#d=eJxL...`, the encoded data stays in your browser.

---

## 2. Architecture

```
User → ChatGPT/Claude → MCP Server → WASM Engine → Results
                            ↓
                      (stateless)
```

- **MCP Server**: Stateless HTTP. No database, no KV store, no logging of inputs.
- **WASM Engine**: Pure computation. No network access, no file system.
- **Widget**: Static HTML. Decodes fragment client-side.

---

## 3. What We Don't Do

- ❌ No accounts or authentication
- ❌ No server-side storage of any user data
- ❌ No analytics or tracking
- ❌ No cookies
- ❌ No logging of simulation inputs/outputs
- ❌ No external API calls

---

## 4. Input Validation

All inputs are validated before simulation:

- JSON schema validation on all tool parameters
- Numeric ranges enforced (ages, amounts, percentages)
- Account types from closed enum
- No code execution or eval()

---

## 5. Simulation Engine Isolation

The Go → WASM engine is sandboxed:

- No file system access
- No network access
- No execution of user code
- Deterministic outputs (same seed = same results)

---

## 6. Vulnerability Reporting

If you find a security issue:

1. **Do not** post in a public GitHub issue
2. Email: `admin@chubby.fyi`
3. Include steps to reproduce

We'll respond within 48 hours.

---

## References

- [ARCHITECTURE.md](./ARCHITECTURE.md)
- [Privacy Policy](https://chubby.fyi/privacy.html)
