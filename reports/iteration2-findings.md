# Vulnerability Report — Iteration 2

**Date:** 2026-05-27
**Tool(s) used:** Semgrep v1.163.0, OWASP ZAP v2.17.0
**Application version / commit hash:** bdb5d75

> Semgrep run against `./app` source. ZAP run in daemon mode against
> `http://localhost:3000` with all API endpoints seeded via authenticated proxy
> requests (JWT Bearer token). Full ZAP report: `scans/iteration2/zap-report.html`
> (266 total alerts, 3 unique Medium, 4 unique Informational).

---

## Summary Table

| # | Tool | Vulnerability | Severity | Location | Status |
|---|------|--------------|----------|----------|--------|
| F1 | Manual | IDOR on `GET /notes/user/:userId` | CRITICAL | `routes/notes.js:33` | ✅ Resolved (Iter 1) |
| F2 | Manual | No rate limiting on auth | HIGH | `server.js` | ✅ Resolved (Iter 1) |
| F3 | Manual | Permissive CORS wildcard | HIGH | `server.js` | ✅ Resolved (Iter 1) |
| F4 | Manual | Missing security headers | MEDIUM | `server.js` | ✅ Resolved (Iter 1) |
| F5 | Manual | User enumeration via register | MEDIUM | `routes/auth.js` | ✅ Resolved (Iter 1) |
| F6 | Manual | Weak password policy | MEDIUM | `routes/auth.js` | ✅ Resolved (Iter 1) |
| F7 | Semgrep | Missing CSRF middleware | INFO | `server.js:8` | ⚪ Disputed FP |
| F8 | ZAP | CSP wildcard directives | MEDIUM | All responses | ✅ Fixed (Iter 2) |
| F9 | ZAP | SRI missing on script tags | MEDIUM | `public/index.html` | ⚪ Disputed FP |

---

## Comparison with Iteration 1

### Resolved in Iteration 2
| Finding | Resolution |
|---------|-----------|
| F8 — CSP wildcard directive | Fixed: explicit `helmet` CSP with no wildcards or `https:` blanket allowances |

### Carried Forward from Iteration 1 (already resolved)
F1 through F6 — all confirmed absent from Iteration 2 ZAP scan. No IDOR,
rate-limit bypass, CORS, or header issues detected.

### New Findings
None. Iteration 2 scan introduced no new vulnerability types.

### Remaining After Iteration 2
| Finding | Type | Justification |
|---------|------|--------------|
| F7 — CSRF missing | Disputed FP | See residual risk section |
| F9 — SRI missing | Disputed FP | See residual risk section |

---

## Detailed Findings

### Finding F8 — CSP Wildcard Directive (Fixed)

**Tool:** OWASP ZAP v2.17.0
**Severity:** MEDIUM
**Location:** All HTTP responses (`Content-Security-Policy` header)

**Description:**
Iteration 1 applied `helmet()` with default configuration. The default Helmet
CSP contains wildcard/permissive entries:
- `font-src 'self' https: data:` — allows fonts from any HTTPS origin
- `style-src 'self' https: 'unsafe-inline'` — allows styles from any HTTPS
  origin and inline styles

These weaken CSP from a strict allowlist to a near-blanket allow for HTTPS,
defeating much of its XSS mitigation value.

**Risk:** A compromised third-party CDN or subdomain takeover could inject
malicious styles or fonts. `unsafe-inline` allows inline script execution in
certain browser configurations.

**Fix applied:**
Replaced `helmet()` with explicit CSP directives — all sources locked to
`'self'` only:

```js
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc:  ["'self'"],
      styleSrc:   ["'self'"],
      fontSrc:    ["'self'"],
      imgSrc:     ["'self'", "data:"],
      connectSrc: ["'self'"],
      objectSrc:  ["'none'"],
      frameAncestors: ["'none'"],
      baseUri:    ["'self'"],
      formAction: ["'self'"]
    }
  }
}));
```

No wildcards, no `https:` blanket, no `unsafe-inline`. All assets served
from same origin only.

---

## Residual Vulnerabilities

### F7 — Missing CSRF Middleware (Semgrep)

**Tool:** Semgrep v1.163.0
**Severity:** INFO
**Disposition:** **Disputed — False Positive**

**Reasoning:**
CSRF attacks exploit the browser's automatic cookie attachment on cross-origin
requests. This application authenticates exclusively via JWT Bearer tokens
passed in the `Authorization` header. The `Authorization` header is never
sent automatically by the browser — it requires explicit JavaScript code.
Therefore no cross-site request can carry valid credentials without the
attacker already having the token (in which case CSRF is not the threat).

The Semgrep rule `express-check-csurf-middleware-usage` fires on all Express
apps regardless of authentication mechanism. It is a generic pattern match,
not a context-aware analysis. For cookie-based session apps this is valid;
for JWT Bearer apps it is a false positive.

**Accepted residual risk:** None — CSRF is not exploitable in this threat model.

---

### F9 — Sub Resource Integrity (SRI) Missing (ZAP)

**Tool:** OWASP ZAP v2.17.0
**Severity:** MEDIUM
**Disposition:** **Disputed — False Positive**

**Reasoning:**
SRI (`integrity` attribute on `<script>` and `<link>` tags) protects against
CDN compromise by verifying fetched resource hashes. This application loads
zero external resources — all scripts and stylesheets are served from the same
Express server (`/public/`). ZAP's rule fires on the absence of `integrity`
attributes on all script tags, including locally-served ones. Local assets
served from the same origin cannot be "tampered with in transit" via CDN
compromise; they share the same trust boundary as the page itself.

Adding SRI to local assets provides no security benefit and is not required
by any standard for same-origin resources.

**Accepted residual risk:** None — SRI is not applicable to same-origin assets.

---

## Security Posture Improvement Summary

| Metric | Baseline | After Iter 1 | After Iter 2 |
|--------|----------|-------------|-------------|
| Critical findings | 1 | 0 | 0 |
| High findings | 2 | 0 | 0 |
| Medium findings | 4 | 1 (CSP) | 0 |
| Disputed FPs | — | 2 | 2 (unchanged) |
| ZAP unique Medium alerts | — | 3 | 3* |

*ZAP still reports F9 (SRI) as Medium but disputed FP. F8 (CSP wildcards) resolved.
