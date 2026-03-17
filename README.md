# LinuxDojo 🐧

A learning-focused web app to master **Linux/Ubuntu commands** with:
- Command browser with search and category filters
- Asciinema terminal demos + video explanations
- Guided practice mode with step-by-step lessons
- Per-user progress tracking (completed / in-progress)
- Admin dashboard to create, edit, and publish commands

Built with **static HTML + CSS** on the frontend, **Node.js (Express)** as the server, and **Supabase** for the database, auth, and security.

---

## Tech Stack

| Layer       | Technology                                |
|-------------|-------------------------------------------|
| Frontend    | HTML + CSS + Vanilla JS (ES Modules)      |
| Backend     | Node.js + Express                         |
| Auth        | Supabase Auth (GitHub OAuth)              |
| Database    | Supabase Postgres                         |
| Security    | Supabase Row Level Security (RLS)         |
| Deployment  | Render                                    |

---

## Features

### User
- Browse all published Linux commands on the home page
- Search by name, slug, or syntax; filter by category tag
- Open a command to view description, asciinema demo, and video
- Practice commands in guided step-by-step mode
- Track completed and in-progress commands on `/me.html`

### Admin
- Admin-only access to `/admin.html` (role check via Supabase RLS)
- Create, edit, publish/unpublish, and delete commands
- Live preview for asciinema embed and video embed

---

## Project Structure

```
linuxdojo/
├── public/
│   ├── index.html        # Home: browse, search, filter commands
│   ├── command.html      # Command detail: description, media
│   ├── practice.html     # Guided practice mode
│   ├── me.html           # My Progress (auth required)
│   ├── login.html        # GitHub OAuth sign-in
│   ├── callback.html     # OAuth redirect handler
│   ├── admin.html        # Admin dashboard (admin role required)
│   └── js/
│       └── app.js        # Shared: getSupabase, getSessionAndRole, renderNav, escapeHtml
├── server.js             # Express: serves /config.js dynamically + static files
├── package.json
├── .env                  # ← Create this in the project root for local dev (see below)
└── .gitignore            # .env is excluded from git
```

---

## Architecture & Data Flow

### Backend → Frontend Config Flow

```
Browser requests /config.js
        │
        ▼
server.js: GET /config.js route (runs BEFORE static middleware)
        │   Reads SUPABASE_URL, SUPABASE_ANON_KEY from env vars
        │   Returns: window.__CONFIG__ = { SUPABASE_URL, SUPABASE_ANON_KEY }
        ▼
Browser: window.__CONFIG__ is available
        │
        ▼
public/js/app.js: getSupabase() reads window.__CONFIG__ → creates Supabase client
```

> The `/config.js` route in server.js is registered **before** `express.static` so it always
> serves the dynamic version from environment variables, not a hardcoded static file.

### Frontend → Supabase Data Flow

The frontend communicates **directly with Supabase** via the Supabase JS client (CDN).
The Express server only serves files and the config — it does not proxy database queries.

```
User action (search, practice, login, etc.)
        │
        ▼
Browser: Supabase JS client (from CDN)
        │   Authenticated via GitHub OAuth session cookie (managed by Supabase)
        │   All writes/reads go through RLS policies
        ▼
Supabase Postgres
  ├── commands  — Linux command content (read: public; write: admin RLS)
  ├── profiles  — One row per user, stores role (read: own row only)
  └── progress  — Per-user step tracking (read/write: own rows only via RLS)
```

### Auth Flow (GitHub OAuth)

```
1. User clicks "Login" on /login.html
2. Browser calls supabase.auth.signInWithOAuth({ provider: "github", redirectTo: window.location.origin + "/callback.html" })
3. GitHub OAuth → redirects back to /callback.html
4. callback.html calls supabase.auth.getSession() — session is auto-stored by Supabase
5. On success: redirects to / (home page)
6. Supabase trigger creates a row in public.profiles on first login
7. app.js getSessionAndRole() reads profiles.role for admin check
```

### Page Navigation Flow

```
/                    Home page — browse + search commands
  │
  ├─ /command.html?slug=cd    Command detail (description, asciinema, video)
  │        └─ /practice.html?slug=cd    Guided practice for that command
  │
  ├─ /me.html                  My Progress (auth required — redirects to login if not)
  ├─ /login.html               GitHub OAuth login
  ├─ /callback.html            OAuth redirect handler (auto-redirects to /)
  └─ /admin.html               Admin dashboard (admin role required)
```

---

## Supabase Database Schema

### Tables

**`profiles`** — one row per authenticated user (auto-created by trigger)
```sql
id         uuid  PRIMARY KEY (references auth.users)
email      text
role       text  DEFAULT 'user'  -- 'user' | 'admin'
created_at timestamptz
```

**`commands`** — Linux command content
```sql
id             uuid  PRIMARY KEY DEFAULT gen_random_uuid()
slug           text  UNIQUE NOT NULL
title          text  NOT NULL
syntax         text  NOT NULL
description    text
asciinema_url  text
video_url      text
tags           text[]
lesson_steps   text[]
published      boolean DEFAULT false
created_at     timestamptz
updated_at     timestamptz
```

**`progress`** — per-user practice tracking
```sql
id            uuid  PRIMARY KEY DEFAULT gen_random_uuid()
user_id       uuid  REFERENCES auth.users (UNIQUE with command_slug)
command_slug  text
step_index    int   DEFAULT 0
is_completed  boolean DEFAULT false
completed_at  timestamptz
updated_at    timestamptz
```

### Promote a user to Admin

```sql
UPDATE public.profiles
SET role = 'admin'
WHERE email = 'YOUR_EMAIL_HERE';

-- Verify
SELECT email, role FROM public.profiles;
```

---

## Environment Variables

Create a `.env` file **in the project root** (same folder as `server.js` and `package.json`):

```
linuxdojo/
├── .env          ← here
├── server.js
└── package.json
```

```env
SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
SUPABASE_ANON_KEY=YOUR_ANON_PUBLIC_KEY
PORT=4000
```

> `SUPABASE_ANON_KEY` is the **public anon key** — safe to expose in client-side code.
> The server serves it to the browser via `/config.js`.
> `.env` is listed in `.gitignore` and will never be committed.

---

## Run Locally

```bash
npm install
node server.js
# or
npm run dev
```

App runs at: [http://localhost:4000](http://localhost:4000)

---

## Routes

| URL                            | Description                            |
|--------------------------------|----------------------------------------|
| `/`                            | Home — command list, search, filter    |
| `/login.html`                  | GitHub OAuth sign-in                   |
| `/callback.html`               | OAuth redirect handler                 |
| `/command.html?slug=<slug>`    | Command detail page                    |
| `/practice.html?slug=<slug>`   | Guided practice for a command          |
| `/practice.html`               | Free practice mode (no slug)           |
| `/me.html`                     | My Progress (login required)           |
| `/admin.html`                  | Admin dashboard (admin role required)  |
| `/config.js`                   | Dynamic config endpoint (server-side)  |

---

## Deploy on Render

1. Connect your GitHub repo to Render (Web Service)
2. **Build command:** `npm install`
3. **Start command:** `node server.js`
4. Add environment variables in the Render dashboard:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `PORT` (Render sets this automatically)

5. Update Supabase OAuth redirect URLs (in Supabase dashboard → Authentication → URL Configuration):
   - Add `https://YOUR_RENDER_DOMAIN/callback.html`
   - Add `https://YOUR_RENDER_DOMAIN` as Site URL

> **Note:** The OAuth `redirectTo` URL is set dynamically using `window.location.origin` in
> `login.html`, so it works automatically on both localhost and production — no code change needed.

---

## License

Educational / personal project.
