# MCP Server Security

How we protect the Chubby MCP server from abuse.

## Problem

We want to prevent:
- DDoS attacks
- Abuse (someone hammering our endpoint)
- Unnecessary compute costs

We do NOT need:
- Per-user authentication (this is an educational tool, no user data)
- Restricting access to only Claude/ChatGPT (not feasible without OAuth)

## Research Summary

### Option 1: OAuth 2.1

**How it works:** Full OAuth flow with authorization server, token exchange.

| Platform | Web UI Support | API Support |
|----------|----------------|-------------|
| Claude | Yes | Yes (`authorization_token`) |
| ChatGPT | **Required** | Yes |

**Verdict:** Overkill. OAuth is per-user authentication. We don't care about individual users.

**Sources:**
- https://platform.claude.com/docs/en/agents-and-tools/mcp-connector
- https://developers.openai.com/apps-sdk/build/auth/

### Option 2: Static API Key

| Platform | Web UI Support | API Support |
|----------|----------------|-------------|
| Claude | No | Yes |
| ChatGPT | No | Yes |

**Verdict:** Only works for API access, not web UI connectors.

### Option 3: IP Allowlisting

| Platform | Published IPs | Reliability |
|----------|--------------|-------------|
| ChatGPT | Yes | Unreliable (changes frequently) |
| Claude | **No** | Not viable |

**Verdict:** Can't work for Claude. Unreliable for ChatGPT.

**Sources:**
- https://support.claude.com/en/articles/11503834-building-custom-connectors-via-remote-mcp-servers
  > "IP allowlisting alone is not recommended as a security measure."

### Option 4: Obscure URL Path

**How it works:** Use a random path like `/mcp/a8f3b2c9...`

**Verdict:** Security theater. The URL gets shared in connector configs anyway. Adds complexity for no real benefit. Rate limiting + Cloudflare provide actual protection.

## Decision

**Rate limiting + Cloudflare.** No authentication, no obscure paths.

Rationale:
- This is an educational simulation tool, not a bank
- No user data stored
- Worst case if abused: compute costs (mitigated by rate limiting)
- Cloudflare handles DDoS at the edge

## Implementation

### Rate Limiting

```typescript
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 100;    // per IP per window
```

- In-memory store (use Redis for multi-instance)
- Respects `CF-Connecting-IP` header (Cloudflare)
- Falls back to `X-Forwarded-For` then direct IP
- Returns `429 Too Many Requests` with `Retry-After: 60`

### Cloudflare Setup

1. Add domain to Cloudflare (free tier)
2. Create DNS record:
   ```
   Type: A
   Name: mcp
   Content: <your-server-ip>
   Proxy: Proxied (orange cloud)
   ```
3. Benefits:
   - DDoS protection
   - Hides origin server IP
   - Edge caching for static assets
   - WAF rules if needed

## What We Explicitly Don't Do

### Obscure URL paths
Rejected because:
- URL shared in connector configs (leaks anyway)
- Adds env var complexity
- Provides false sense of security
- Rate limiting is the actual protection

### OAuth
Rejected because:
- Per-user auth we don't need
- Complex setup (auth provider, token refresh)
- Both web UIs require it, but we don't need web UI restrictions

### IP allowlisting
Rejected because:
- Claude doesn't publish IPs
- ChatGPT IPs change frequently
- Would break one platform or both

## Future Considerations

If we ever need to:
- **Track usage per user**: Add OAuth with Auth0/Clerk
- **Restrict to paying customers**: Add OAuth + subscription check
- **Comply with enterprise requirements**: Add SSO integration

For now, rate limiting + Cloudflare is sufficient.
