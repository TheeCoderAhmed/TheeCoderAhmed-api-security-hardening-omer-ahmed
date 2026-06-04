# Phase 1 — AI Prompt History

**Tool used:** Claude Sonnet (claude.ai)
**Date:** May 2026
**Purpose:** Application design and initial implementation

---

## Prompt 1

**User:**

> I've got this project that I need to do, and I need you to do exactly what it says, we gonna start phase by phase, and don't do any executions before you explain to me what you will do and what I have to do.
> [attached: SE457 project specification PDF]

**Claude response summary:**
Provided a full phase-by-phase breakdown of the project. Explained what Claude would do vs what the student needs to do manually. Asked clarifying questions about tech stack preferences before proceeding.

---

## Prompt 2 (User selections)

**User:**

> Q: What backend language/framework do you prefer? → Node.js (Express)
> Q: What database do you prefer? → SQLite (simplest, no setup)
> Q: Do you want a frontend UI, or just a REST API? → Simple HTML/JS frontend

**Claude response summary:**
Confirmed the stack. Proposed a Notes app as the application topic. Outlined all 8 endpoints, the folder structure, and the data model. Asked for confirmation before generating code.

---

## Prompt 3

**User:**

> Yes, follow exactly what the project requires.

**Claude response summary:**
Generated all application files:

* `app/package.json`
* `app/.env` / `.env.example`
* `app/src/db.js` — SQLite database setup with users and notes tables
* `app/src/server.js` — Express entry point
* `app/src/middleware/auth.js` — JWT authentication middleware
* `app/src/routes/auth.js` — POST /auth/register, POST /auth/login
* `app/src/routes/notes.js` — Full notes CRUD + cross-user endpoint
* `app/src/routes/admin.js` — Admin panel endpoints
* `app/public/index.html` — Frontend UI
* `app/public/app.js` — Frontend JavaScript
* `README.md`
* All required empty folders: /scans, /reports, /prompts, /screenshots

---

## Prompt 4

**User:**

> Create a new folder for them on the desktop and I'll put them to GitHub.

**Claude response summary:**
Used Desktop Commander MCP to create the full folder structure at `/Users/ahmedhaidar/Desktop/Projects/api-security-hardening/` and wrote all files directly to disk.

---

## Prompt 5

**User:**

> There is only 1 auth file got created, which one is it and make the other one.

**Claude response summary:**
Inspected the directory, identified which `auth.js` was present (the middleware one), moved misplaced files (`db.js`), and wrote all missing files directly to the correct locations.

---

## Prompt 6

**User:**

> Can you double check the files are following what the project requires, something is wrong.

**Claude response summary:**
Read all files in full. Identified 4 issues:

1. Missing `.gitignore` — would expose `node_modules`, `.env`, and `notes.db` to GitHub
2. `requireAdmin` middleware had a bug (potential "headers already sent" crash)
3. Cross-user endpoint naming could better match the spec example
4. Intentional security vulnerabilities present in the code (by design, for scanning in Phase 2)

User clarified not to fix security issues as they are intentional. Created `.gitignore` files only.

---

## Prompt 7

**User:**

> Don't fix any security issues in the code cuz that's what's intended, just make the .gitignore.

**Claude response summary:**
Confirmed `.gitignore` was already created. No security fixes applied — intentional vulnerabilities left in place for Phase 2 scanning.

---

## Prompt 8

**User:**

> Give me the prompts md for phase one (this chat basically).

**Claude response summary:**
Generated this file.

---

## Application Summary

**Topic:** NoteVault — a personal notes manager
**Stack:** Node.js + Express / SQLite / Plain HTML + JS
**Auth:** JWT (jsonwebtoken + bcryptjs)

**Endpoints implemented:**

| Method | Endpoint            | Description                            |
| ------ | ------------------- | -------------------------------------- |
| POST   | /auth/register      | Register new user                      |
| POST   | /auth/login         | Login, returns JWT                     |
| GET    | /notes              | Get current user's notes               |
| POST   | /notes              | Create a note                          |
| GET    | /notes/:id          | Get a specific note                    |
| PUT    | /notes/:id          | Update a note                          |
| DELETE | /notes/:id          | Delete a note                          |
| GET    | /notes/user/:userId | Get any user's notes (cross-user)      |
| GET    | /admin/users        | List all users + notes (admin only)    |
| GET    | /admin/users/:id    | Get specific user profile (admin only) |
| DELETE | /admin/users/:id    | Delete a user (admin only)             |

**Data model:**

* `users` table: id, username, email, password (bcrypt), role, created_at
* `notes` table: id, title, content, user_id (FK), created_at, updated_at
