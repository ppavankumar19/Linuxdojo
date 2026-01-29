# LinuxDojo 🐧⚡
A learning-focused web app to master **Linux/Ubuntu commands** with:
- Command explanations + syntax
- Asciinema terminal demos
- External video explanations (YouTube / NotebookLM / any URL)
- Built-in practice mode
- Progress tracking per user
- Admin dashboard to create/publish commands

This project is built using **static HTML + CSS** on the frontend and **Node.js (Express)** as the backend server, with **Supabase** for:
- PostgreSQL database
- GitHub OAuth authentication
- Row Level Security (RLS)

---

## Tech Stack
- **Frontend:** HTML + CSS (mobile-first, responsive)
- **Backend:** Node.js + Express
- **Auth:** Supabase Auth (GitHub OAuth)
- **Database:** Supabase Postgres
- **Security:** Supabase RLS policies (Admin-only write access)

---

## Features
### User
- Browse published Linux commands on the home page
- Open command details: syntax, description, asciinema, video
- Practice commands
- Track progress (completed / in-progress) in `/me.html`

### Admin
- Admin-only access to `/admin.html`
- Create, edit, publish/unpublish, delete commands
- Live preview for asciinema + video embed

---

## Folder Structure
```

linuxdojo/
├─ public/
│  ├─ index.html          # Home: list/search/filter commands
│  ├─ command.html        # Command details
│  ├─ practice.html       # Practice mode
│  ├─ me.html             # My Progress page
│  ├─ login.html          # GitHub OAuth sign-in
│  ├─ callback.html       # OAuth redirect landing page
│  └─ admin.html          # Admin dashboard (admin-only)
├─ server.js              # Express server + /config.js endpoint
├─ package.json
├─ package-lock.json
└─ .env                   # local secrets (NOT committed)

````

---

## Supabase Database Schema (SQL)
Create these tables and policies in Supabase SQL Editor.

### Tables
- `profiles` — one row per authenticated user (role stored here)
- `commands` — Linux commands list
- `progress` — tracks per-user practice completion (if enabled)

> Use the SQL you already added in Supabase (tables + triggers + RLS).

### Admin Role
To promote an account to an admin:
```sql
Update the public. profiles
set role = 'admin'
where email = 'YOUR_EMAIL_HERE';

select email, role from public. profiles;
````

---

## Environment Variables

Create a `.env` file in the  project root:

```env
SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
SUPABASE_ANON_KEY=YOUR_ANON_PUBLIC_KEY
PORT=3000
```

---

## Run Locally (Git Bash / Windows)

```bash
npm install
node server.js
```

App will run at:

* [http://localhost:3000](http://localhost:3000)

---

## Routes

* `/` → Home
* `/login.html` → GitHub login
* `/callback.html` → OAuth landing redirect
* `/command.html?slug=cd` → command details
* `/practice.html?slug=cd` → practice mode
* `/me.html` → progress
* `/admin.html` → admin dashboard (admin role required)

---

## Deploy (Render)

**Planned deployment** on Render:

* Build command: `npm install`
* Start command: `node server.js`
* Add environment variables in the Render dashboard:

  * `SUPABASE_URL`
  * `SUPABASE_ANON_KEY`
  * `PORT` (Render sets this automatically)

Also update Supabase OAuth Redirect URLs for production:

* Add `https://YOUR_RENDER_DOMAIN/callback.html` in:

  * Supabase → Authentication → URL Configuration
  * Supabase → GitHub Provider settings

---

## License

Educational/personal project.

---
