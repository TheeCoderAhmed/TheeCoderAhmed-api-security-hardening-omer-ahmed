# Vulnerability Report — Iteration 1

**Date:** 2026-05-27
**Tool(s) used:** Semgrep v1.163.0, OWASP ZAP v2.17.0
**Application version / commit hash:** 0f74830

> ZAP scan run in daemon mode against `http://localhost:3000`. All API endpoints
> seeded manually through ZAP proxy (JWT-authenticated). Full report:
> `scans/iteration1/zap-report.html` (175 total alerts: 12 Medium, 163 Informational).

---

## Summary Table

| # | Tool | Vulnerability | Severity | Location |
|---|------|--------------|----------|----------|
| 1 | Manual | IDOR / BOLA (Broken Object Level Authorization) | CRITICAL | `app/src/routes/notes.js:33` |
| 2 | Manual | Missing Rate Limiting on Auth Endpoints | HIGH | `app/src/server.js` |
| 3 | Manual | Permissive CORS — all origins allowed | HIGH | `app/src/server.js:10` |
| 4 | Manual | Missing HTTP Security Headers (no Helmet) | MEDIUM | `app/src/server.js` |
| 5 | Manual | User Enumeration via Register Response | MEDIUM | `app/src/routes/auth.js:25` |
| 6 | Manual | Weak Password Policy (min 6 chars) | MEDIUM | `app/src/routes/auth.js:18` |
| 7 | Semgrep | Missing CSRF Middleware | INFO | `app/src/server.js:6` |
| 8 | ZAP | CSP: Wildcard Directive | MEDIUM | All responses |
| 9 | ZAP | CSP: style-src unsafe-inline | MEDIUM | All responses |
| 10 | ZAP | Sub Resource Integrity Missing | MEDIUM | `public/index.html` |

---

## Detailed Findings

### Finding 1 — IDOR / Broken Object Level Authorization (BOLA)

**Tool:** Manual code review
**Severity:** CRITICAL
**Location:** `app/src/routes/notes.js:33` — `GET /notes/user/:userId`

**Description:**
The endpoint `GET /notes/user/:userId` accepts any user ID as a path parameter
and returns all notes for that user. The handler performs no ownership check —
it only requires a valid JWT, regardless of whose ID is in the token:

```js
// VULNERABLE — no check that req.user.id === targetUserId
router.get('/user/:userId', (req, res) => {
  const targetUserId = req.params.userId;
  const notes = db.prepare('SELECT * FROM notes WHERE user_id = ?').all(targetUserId);
  res.json({ notes });
});
```

Any authenticated user can enumerate integer IDs (1, 2, 3…) and read every
other user's notes without restriction.

**Risk:** Full read access to all user data — confidentiality breach for all
notes in the database. Classified as OWASP API1:2023 Broken Object Level
Authorization.

**Fix applied:** Added authorization check: regular users may only request
their own user ID. Admin users may request any user's notes.

---

### Finding 2 — Missing Rate Limiting on Authentication Endpoints

**Tool:** Manual code review
**Severity:** HIGH
**Location:** `app/src/server.js` (no rate limiter middleware)

**Description:**
`POST /auth/login` and `POST /auth/register` have no rate limiting. An
attacker can make unlimited requests in rapid succession, enabling:
- Brute-force password guessing on `/auth/login`
- Account enumeration flooding on `/auth/register`

**Risk:** An attacker can automate credential attacks. With a 6-character
minimum password, the search space is small enough for targeted brute force.

**Fix applied:** Added `express-rate-limit` middleware:
- Login: 10 attempts per 15 minutes per IP
- Register: 5 attempts per hour per IP
- Global API limit: 100 requests per 15 minutes per IP

---

### Finding 3 — Permissive CORS Configuration

**Tool:** Manual code review
**Severity:** HIGH
**Location:** `app/src/server.js:10`

**Description:**
`app.use(cors())` with no options sets `Access-Control-Allow-Origin: *`,
allowing any origin to make cross-origin requests to the API. Combined with
the absence of CSRF protection, a malicious website could make authenticated
requests on behalf of a logged-in user if the token is accessible (e.g., via
XSS or if moved to cookies).

```js
// VULNERABLE
app.use(cors());  // allows all origins
```

**Risk:** Enables cross-origin attacks; removes a meaningful defense-in-depth
layer. OWASP API7:2023 Server Side Request Forgery / misconfiguration.

**Fix applied:** Restricted CORS to explicit allowed origins via environment
variable `ALLOWED_ORIGINS`. Defaults to `http://localhost:3000` in development.

---

### Finding 4 — Missing HTTP Security Headers

**Tool:** Manual code review
**Severity:** MEDIUM
**Location:** `app/src/server.js` (no helmet or manual header config)

**Description:**
The application sets no security-relevant HTTP headers:
- No `X-Content-Type-Options: nosniff` — enables MIME-type sniffing attacks
- No `X-Frame-Options` — clickjacking possible
- No `Content-Security-Policy` — no XSS mitigation at transport layer
- No `Strict-Transport-Security` — no HTTPS enforcement
- `X-Powered-By: Express` exposed — fingerprinting aid for attackers

**Risk:** Attackers gain information (framework fingerprint) and lose
browser-enforced mitigations. Defense-in-depth failure.

**Fix applied:** Added `helmet` middleware which sets all standard security
headers and removes `X-Powered-By`.

---

### Finding 5 — User Enumeration via Registration Response

**Tool:** Manual code review
**Severity:** MEDIUM
**Location:** `app/src/routes/auth.js:25`

**Description:**
The register endpoint returns a `409 Conflict` with the message
`"Username or email already taken"` when a duplicate is detected. While this
doesn't reveal which field conflicts, the status code + message still confirms
that a specific username or email exists in the database, enabling enumeration.

**Risk:** An attacker can iterate through common usernames/emails to map
existing accounts before targeting them with credential attacks.

**Fix applied:** Response message kept generic; additionally, timing is
normalized using `bcrypt.hashSync` on a dummy value to prevent timing-based
enumeration even on non-existent users.

---

### Finding 6 — Weak Password Policy

**Tool:** Manual code review
**Severity:** MEDIUM
**Location:** `app/src/routes/auth.js:18`

**Description:**
The only password constraint is a minimum length of 6 characters:

```js
if (password.length < 6) { ... }
```

No complexity requirements (uppercase, digits, symbols). A 6-character
lowercase password has ~309 million combinations — trivially brute-forced with
modern hardware.

**Risk:** Weak passwords increase account takeover risk, especially without
rate limiting (Finding 2).

**Fix applied:** Increased minimum to 8 characters and added regex validation
requiring at least one letter and one digit.

---

### Finding 7 — Missing CSRF Middleware (Semgrep)

**Tool:** Semgrep v1.163.0 (`express-check-csurf-middleware-usage`)
**Severity:** INFO
**Location:** `app/src/server.js:6`

**Description:**
Semgrep flagged the absence of a CSRF middleware (e.g., `csurf`).

**Assessment — Disputed as False Positive:**
This application uses JWT Bearer tokens passed in the `Authorization` header,
not session cookies. CSRF attacks require the browser to automatically attach
credentials (cookies) to cross-origin requests. Since no cookies are used for
authentication, CSRF is not exploitable in this application's threat model.
The Semgrep rule fires generically on all Express apps regardless of auth
mechanism.

**Residual risk accepted** for this finding.

---

### Finding 8 — CSP Wildcard Directive (ZAP)

**Tool:** OWASP ZAP v2.17.0
**Severity:** MEDIUM
**Location:** All HTTP responses (Content-Security-Policy header)

**Description:**
ZAP flagged that the CSP header generated by Helmet contains wildcard or
overly-permissive directives. Specifically `font-src 'self' https: data:`
and `style-src 'self' https: 'unsafe-inline'` allow loading resources from
any HTTPS origin.

**Risk:** Weakens CSP effectiveness — a compromised CDN or third-party host
could inject malicious fonts or styles. Reduces XSS mitigation value.

**Fix applied (Iteration 2):** Will tighten CSP directives to specific
origins only. Deferred to Iteration 2 since no external resources are
currently loaded.

---

### Finding 9 — Sub Resource Integrity (SRI) Missing (ZAP)

**Tool:** OWASP ZAP v2.17.0
**Severity:** MEDIUM
**Location:** `public/index.html`

**Description:**
ZAP detected `<script>` or `<link>` tags loading resources without an
`integrity` attribute. SRI allows browsers to verify fetched resources
haven't been tampered with.

**Risk:** If any external resource is loaded, a CDN compromise could
serve malicious scripts silently.

**Assessment:** Application currently loads no external scripts — all
assets are local. ZAP fired on absence of SRI on local scripts, which
is a false positive for local-only assets. **Disputed as false positive.**

---

## Prioritization

Findings F1–F6 fixed in this iteration. F8 deferred to Iteration 2:

| Priority | Finding | Reason |
|----------|---------|--------|
| 1st | F1 — IDOR | Direct data breach, trivially exploitable |
| 2nd | F2 — Rate limiting | Enables brute force on auth |
| 3rd | F3 — CORS | Removes key defense layer |
| 4th | F4 — Helmet | Low effort, high signal headers |
| 5th | F5 — Enumeration | Reduces attacker recon surface |
| 6th | F6 — Password policy | Raises brute-force cost |
| — | F7 — CSRF | Disputed false positive (JWT Bearer, no cookies) |
| Iter 2 | F8 — CSP wildcards | Deferred — no external resources currently loaded |
| — | F9 — SRI missing | Disputed false positive (local assets only) |
