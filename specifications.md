# LinuxDojo — Technical Specifications

## Overview

LinuxDojo is a Linux command learning platform. Users browse, search, and practice Linux commands through a guided step-by-step system. Progress is tracked per-user via Supabase. An admin dashboard allows full CRUD management of command content.

---

## Architecture

### Stack

| Layer       | Technology                                 |
|-------------|--------------------------------------------|
| Frontend    | HTML + CSS + Vanilla JS (ES Modules)       |
| Backend     | Node.js 18+ with Express 5                 |
| Auth        | Supabase Auth — GitHub OAuth               |
| Database    | Supabase Postgres (hosted)                 |
| Security    | Supabase Row Level Security (RLS)          |
| CDN deps    | Supabase JS client, Google Fonts           |
| Deployment  | Render (Node.js Web Service)               |

### Architectural Pattern

```
Browser
  ├── Loads HTML/JS/CSS from Express static server
  ├── Fetches /config.js → window.__CONFIG__ (Supabase creds injected server-side)
  └── Supabase JS client (CDN)
        ├── Auth: GitHub OAuth (session managed by Supabase)
        └── DB: Direct queries to Supabase Postgres
                ├── commands  (content)
                ├── profiles  (user roles)
                └── progress  (practice tracking)

Express Backend (server.js)
  ├── GET /config.js  → serves SUPABASE_URL + SUPABASE_ANON_KEY from env vars
  └── Serves /public/** as static files
```

> The backend does NOT proxy database queries. All DB access happens from the browser via the Supabase JS client, enforced by RLS policies.

---

## File Structure

```
linuxdojo/
├── server.js                # Express: /config.js + static file server
├── package.json             # Dependencies: express, dotenv
├── .env                     # Local env vars (not committed)
├── .gitignore
├── README.md
├── specifications.md        # This file
├── scope.md
├── features.md
└── public/
    ├── index.html           # Home: browse, search, filter commands
    ├── login.html           # GitHub OAuth login
    ├── callback.html        # OAuth redirect handler
    ├── command.html         # Command detail (description, media)
    ├── practice.html        # Guided practice mode
    ├── me.html              # My Progress (auth required)
    ├── admin.html           # Admin dashboard (admin role required)
    └── js/
        └── app.js           # Shared: getSupabase, getSessionAndRole, renderNav, escapeHtml
```

---

## Backend Specification

### server.js

**Runtime:** Node.js with `"type": "module"` (ES Modules)

**Dependencies:**
- `express` ^5.2.1 — HTTP server
- `dotenv` ^17.2.3 — `.env` loader

**Routes:**

| Method | Path        | Description                                            |
|--------|-------------|--------------------------------------------------------|
| GET    | `/config.js`| Returns JS that sets `window.__CONFIG__` with Supabase creds |
| ALL    | `/*`        | Serves static files from `/public`                    |

**Critical ordering:** `/config.js` route is registered **before** `express.static`. This prevents a static `config.js` file from shadowing the dynamic route.

**Environment variables:**

| Variable           | Required | Description                            |
|--------------------|----------|----------------------------------------|
| `SUPABASE_URL`     | Yes      | Supabase project URL                   |
| `SUPABASE_ANON_KEY`| Yes      | Supabase public anon key               |
| `PORT`             | No       | HTTP port (default: 4000)              |

**Config injection response format:**
```javascript
window.__CONFIG__ = {"SUPABASE_URL":"https://xxx.supabase.co","SUPABASE_ANON_KEY":"eyJ..."};
```

---

## Frontend Specification

### app.js (Shared Module)

Exported functions used by all pages:

#### `getSupabase()`
- Reads `window.__CONFIG__`
- Creates and returns a Supabase JS client instance
- Throws if `window.__CONFIG__` is undefined (config.js not loaded)

#### `getSessionAndRole(supabase)`
- Calls `supabase.auth.getSession()`
- Queries `profiles` table for `role` and `email`
- Returns `{ user, email, role }` — `role` is `"admin"` or `"user"`

#### `renderNav(targetEl, state)`
- Builds navigation bar HTML
- `state` shape: `{ loggedIn, isAdmin }`
- Logged-in nav: Admin (if admin), Practice, Progress, Logout
- Logged-out nav: Practice, Login

#### `escapeHtml(s)`
- XSS sanitization: escapes `& < > " '`
- Used on all user-visible DB strings rendered as HTML

---

## Database Specification

### Supabase Project

All tables live in the `public` schema. Supabase Auth handles `auth.users`.

---

### Table: `profiles`

Auto-created on first login via Supabase trigger.

| Column      | Type        | Constraints              | Notes                    |
|-------------|-------------|--------------------------|--------------------------|
| id          | uuid        | PK, references auth.users | Matches auth.users.id   |
| email       | text        |                          |                          |
| role        | text        | DEFAULT 'user'           | `'user'` or `'admin'`   |
| created_at  | timestamptz | DEFAULT now()            |                          |

---

### Table: `commands`

| Column         | Type        | Constraints         | Notes                           |
|----------------|-------------|---------------------|---------------------------------|
| id             | uuid        | PK, DEFAULT gen_random_uuid() |                     |
| slug           | text        | UNIQUE NOT NULL     | URL-safe identifier, e.g. `cd`  |
| title          | text        | NOT NULL            | Display name                    |
| syntax         | text        | NOT NULL            | e.g. `cd [directory]`           |
| description    | text        |                     | Full explanation (HTML safe)    |
| asciinema_url  | text        |                     | Link or embed URL               |
| video_url      | text        |                     | YouTube, Vimeo, or direct URL   |
| tags           | text[]      |                     | Categories / difficulty labels  |
| lesson_steps   | text[]      |                     | Ordered practice commands       |
| published      | boolean     | DEFAULT false       | Only published cmds shown publicly |
| created_at     | timestamptz | DEFAULT now()       |                                 |
| updated_at     | timestamptz |                     | Updated on every edit           |

---

### Table: `progress`

| Column        | Type        | Constraints                         | Notes                      |
|---------------|-------------|-------------------------------------|----------------------------|
| id            | uuid        | PK, DEFAULT gen_random_uuid()       |                            |
| user_id       | uuid        | REFERENCES auth.users, UNIQUE (user_id, command_slug) |         |
| command_slug  | text        | NOT NULL                            |                            |
| step_index    | int         | DEFAULT 0                           | Current step (0-indexed)   |
| is_completed  | boolean     | DEFAULT false                       |                            |
| completed_at  | timestamptz |                                     | Set when is_completed=true |
| updated_at    | timestamptz |                                     |                            |

---

### Row Level Security (RLS)

| Table      | Operation | Policy                                    |
|------------|-----------|-------------------------------------------|
| `commands` | SELECT    | `published = true` OR user is admin       |
| `commands` | INSERT    | role = 'admin'                            |
| `commands` | UPDATE    | role = 'admin'                            |
| `commands` | DELETE    | role = 'admin'                            |
| `profiles` | SELECT    | `id = auth.uid()`                         |
| `profiles` | UPDATE    | `id = auth.uid()`                         |
| `progress` | ALL       | `user_id = auth.uid()`                    |

---

## Authentication Specification

### Provider
- GitHub OAuth via Supabase Auth

### Flow

```
1. User visits /login.html
2. Clicks "Continue with GitHub"
3. supabase.auth.signInWithOAuth({ provider: "github", redirectTo: origin + "/callback.html" })
4. GitHub OAuth redirects to /callback.html with auth code in URL fragment
5. callback.html calls supabase.auth.getSession() — Supabase processes the fragment
6. On first login: Supabase trigger inserts row into public.profiles with role='user'
7. Session stored in browser (cookie/localStorage, managed by Supabase)
8. Redirect to /
```

### Session Access Pattern (all pages)
```javascript
const supabase = getSupabase();
const { user, email, role } = await getSessionAndRole(supabase);
if (!user) { window.location.href = "/login.html"; return; }
if (role !== "admin") { window.location.href = "/login.html"; return; }
```

### Promoting to Admin
```sql
UPDATE public.profiles SET role = 'admin' WHERE email = 'user@example.com';
```

---

## Page Specifications

### `/` — index.html (Home)

**Auth:** Optional (used to show completed status)

**Data fetched:**
- `SELECT * FROM commands WHERE published = true` (always)
- `SELECT command_slug FROM progress WHERE user_id = $uid AND is_completed = true` (if logged in)

**UI Components:**
- Hero: title, description, stats (total commands, completed, categories)
- Search bar: real-time filter on title, slug, syntax
- Tag filter chips: click to filter by tag
- Command grid: cards with title, syntax, slug, tags, difficulty, "Done" badge

---

### `/command.html?slug=<slug>` — Command Detail

**Auth:** Optional

**Data fetched:**
- `SELECT * FROM commands WHERE slug = $slug AND published = true`

**UI Components:**
- Title + syntax badge
- Tags list
- Description
- Asciinema embed (normalized URL → iframe)
- Video embed (YouTube / Vimeo / direct video)
- "Practice" button → `/practice.html?slug=<slug>`

---

### `/practice.html?slug=<slug>` — Guided Practice

**Auth:** Optional (progress saved to localStorage; synced to DB if logged in)

**Data fetched:**
- `SELECT * FROM commands WHERE slug = $slug`
- `SELECT * FROM progress WHERE user_id = $uid AND command_slug = $slug` (if logged in)

**Data written:**
- UPSERT into `progress` (step_index, is_completed, completed_at)

**UI Components:**
- Left panel: step list, current step highlight, progress pill, DB sync status
- Right panel: textarea, Check / Clear buttons, feedback message, hint box
- Validation: normalizes whitespace, checks last non-empty line

---

### `/me.html` — My Progress

**Auth:** Required (redirects to `/login.html` if not logged in)

**Data fetched:**
- `SELECT * FROM progress WHERE user_id = $uid`
- `SELECT title, syntax, slug FROM commands WHERE slug IN ($slugs)`

**UI Components:**
- Completed commands card (is_completed = true)
- In-progress commands card (step_index > 0, is_completed = false)

---

### `/admin.html` — Admin Dashboard

**Auth:** Required, role = 'admin'

**Data fetched/written:**
- Full CRUD on `commands` table

**UI Components:**
- Left: form (all command fields + publish toggle)
- Right: live asciinema preview, live video preview, commands list with action buttons

---

### `/login.html` — Login

**Auth:** None required

**UI:** GitHub OAuth button, sign-out button (if already logged in), info box

---

### `/callback.html` — OAuth Callback

**Auth:** Processes session from URL fragment

**Logic:** `supabase.auth.getSession()` → success redirect to `/` or error message

---

## Media Handling

### Asciinema
- Input: `https://asciinema.org/a/<id>` or embed URL
- Normalized to: `https://asciinema.org/a/<id>/iframe`
- Rendered as: `<iframe>` with fixed dimensions

### Video
- YouTube: URL → embed URL (`/embed/<id>`) in `<iframe>`
- Vimeo: URL → embed URL (`https://player.vimeo.com/video/<id>`) in `<iframe>`
- Direct video (`.mp4`, `.webm`, `.ogg`): `<video>` tag

---

## Security Model

| Concern          | Mitigation                                           |
|------------------|------------------------------------------------------|
| XSS              | `escapeHtml()` on all DB strings rendered as HTML    |
| SQL injection    | Supabase JS client uses parameterized queries        |
| Credential leak  | `.env` excluded from git; creds served via `/config.js` |
| Unauthorized DB writes | RLS policies on all tables                    |
| Admin bypass     | Role checked in DB (profiles.role), not just client  |
| Auth spoofing    | Session managed by Supabase Auth (JWT-based)         |

---

## Deployment

### Render (Production)

1. Connect GitHub repo as Node.js Web Service
2. Build command: `npm install`
3. Start command: `node server.js`
4. Environment variables: `SUPABASE_URL`, `SUPABASE_ANON_KEY`
5. Supabase OAuth redirect URLs: add `https://<render-domain>/callback.html`

### Local Development

```bash
# 1. Create .env in project root
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
PORT=4000

# 2. Install and run
npm install
npm run dev
# → http://localhost:4000
```

---

## Dependencies

```json
{
  "dependencies": {
    "express": "^5.2.1",
    "dotenv": "^17.2.3"
  }
}
```

Frontend CDN:
- `https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js`
- Google Fonts (Inter)
