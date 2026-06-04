# AI Prompts & Conversation Log — Phase 2 (Iteration 1)

**Date:** 2026-05-27
**Tool used:** Claude (Anthropic) via Claude Code
**Purpose:** Security analysis, vulnerability identification, fix implementation, ZAP scan automation

---

## Summary of AI Assistance

AI was used to:
1. Analyze application source code for security vulnerabilities
2. Run and interpret Semgrep static analysis scan
3. Automate OWASP ZAP scan via daemon API
4. Implement all security fixes
5. Write structured vulnerability report (`reports/iteration1-findings.md`)

---

## Prompt Log

### Prompt 1
**Input:**
> based on this file [SE457 project PDF], what did we accomplish so far?

**AI action:** Read project PDF, identified current phase, summarized project structure and what had been built.

---

### Prompt 2
**Input:**
> [GitHub repo URL] this is the repo. start

**AI action:**
- Checked `.env` and `.gitignore` for sensitive file exclusions
- Added `.gitkeep` files to all empty required directories
- Ran `git init`, added remote origin, made initial commit `0f74830`, pushed to GitHub

---

### Prompt 3
**Input:**
> write an md file that keeps updating after each prompt so that it keeps me in the loop

**AI action:** Created `STATUS.md` at project root — living tracker of done/in-progress/to-do items, vulnerability table, artifacts checklist, key commands.

---

### Prompt 4
**Input:**
> not now ill do the zap scan first

**AI action:** Provided ZAP startup instructions (start app, run automated scan, export report).

---

### Prompt 5
**Input:**
> app is not downloaded [ZAP install help]

**AI action:** Identified correct brew cask name (`zap`), explained Gatekeeper warning is normal for open-source tools, provided bypass steps via System Settings → Privacy & Security.

---

### Prompt 6
**Input:**
> [screenshot of ZAP UI] correct?

**AI action:** Confirmed correct setup, instructed user to start Node app before clicking Attack.

---

### Prompt 7
**Input:**
> [screenshot showing ZAP warning about traditional spider] what does that mean?

**AI action:** Explained Safari not supported for AJAX spider, instructed to change to "Never" and proceed with traditional spider.

---

### Prompt 8
**Input:**
> should i change the default policy? cuz it still not working after changing from if modern to never

**AI action:** Confirmed "Never" = correct. Instructed to click Attack.

---

### Prompt 9
**Input:**
> still not working, either you give me the exact steps after opening the app or u do it automatically

**AI action:** Automated entire ZAP scan via CLI:
- Started ZAP in daemon mode on port 8090
- Registered test user, obtained JWT token
- Seeded all 11 API endpoints through ZAP proxy
- Ran traditional spider (discovered 15 URLs)
- Ran active scan
- Parsed 175 alerts (12 Medium, 163 Informational)
- Exported HTML report to `scans/iteration1/zap-report.html`

---

## Vulnerabilities Identified via AI Analysis

| # | Source | Finding | Severity |
|---|--------|---------|----------|
| F1 | Manual (AI review) | IDOR on `GET /notes/user/:userId` | CRITICAL |
| F2 | Manual (AI review) | No rate limiting on auth endpoints | HIGH |
| F3 | Manual (AI review) | Permissive CORS (`cors()` wildcard) | HIGH |
| F4 | Manual (AI review) | Missing HTTP security headers | MEDIUM |
| F5 | Manual (AI review) | User enumeration via register response | MEDIUM |
| F6 | Manual (AI review) | Weak password policy (min 6 chars) | MEDIUM |
| F7 | Semgrep | Missing CSRF middleware | INFO |
| F8 | ZAP | CSP wildcard directives | MEDIUM |
| F9 | ZAP | SRI missing (disputed FP) | MEDIUM |

## Fixes Implemented via AI

All code changes made by AI assistant, reviewed and approved by group:
- `app/src/routes/notes.js` — IDOR fix (ownership check)
- `app/src/routes/auth.js` — rate limiting, password policy, enumeration hardening
- `app/src/server.js` — helmet, restricted CORS, global rate limit
- `app/.env.example` — added `ALLOWED_ORIGINS` variable

## AI Reasoning Transparency

All fix decisions documented in `reports/iteration1-findings.md` under "Fix applied" per finding.
Group members reviewed each fix and understand the vulnerability and mitigation for all 6 fixed items.
