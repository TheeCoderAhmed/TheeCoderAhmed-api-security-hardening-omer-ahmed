# NoteVault — API Security Hardening Project

**Course:** SE457 Secure Software Development
**Project:** Iterative Security Hardening of a Web Application

---

## Application Overview

NoteVault is a 3-tier web application for managing personal notes, with user auth and an admin panel.

### Architecture

| Tier | Technology |
|------|------------|
| Presentation | Plain HTML + JavaScript (served statically) |
| Logic | Node.js + Express REST API |
| Data | SQLite (via `better-sqlite3`) |

### API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/register` | None | Register a new user |
| POST | `/auth/login` | None | Login, returns JWT |
| GET | `/notes` | User | Get all notes for logged-in user |
| POST | `/notes` | User | Create a new note |
| GET | `/notes/:id` | User | Get a specific note |
| PUT | `/notes/:id` | User | Update a note |
| DELETE | `/notes/:id` | User | Delete a note |
| GET | `/notes/user/:userId` | User | Get notes for any user (cross-user) |
| GET | `/admin/users` | Admin | List all users and their notes |
| GET | `/admin/users/:id` | Admin | Get a specific user profile and notes |
| DELETE | `/admin/users/:id` | Admin | Delete a user |

### Data Model

```
users:  id, username, email, password (bcrypt), role, created_at
notes:  id, title, content, user_id (FK), created_at, updated_at
```

---

## Setup & Run Instructions

### Prerequisites
- Node.js v18+

### Steps

```bash
cd app
npm install
node src/server.js
```

Open: http://localhost:3000

### Create an Admin User

After registering, run:
```bash
sqlite3 notes.db "UPDATE users SET role='admin' WHERE username='yourusername';"
```

---

## Repository Structure

```
/app                        # Application source code
  /public                   # Static frontend
  /src
    server.js
    db.js
    /routes/auth.js         # POST /auth/register, POST /auth/login
    /routes/notes.js        # Notes CRUD + cross-user endpoint
    /routes/admin.js        # Admin endpoints
    /middleware/auth.js     # JWT middleware
  package.json
  .env / .env.example
/scans/iteration1           # Semgrep + ZAP scan outputs (Phase 2)
/scans/iteration2           # Re-scan outputs (Phase 3)
/reports                    # Vulnerability findings reports
/prompts/phase1             # AI prompts used during app generation
/prompts/phase2             # AI prompts used during Iteration 1
/prompts/phase3             # AI prompts used during Iteration 2
/screenshots                # Tool evidence screenshots
README.md
```

---

## Group Members

| Name | Student ID |
|------|------------|
| Ahmed Haidar | 20244710088 |
| Omer Alobaida | 20244710103 |
