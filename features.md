# LinuxDojo — Features & Roadmap

This document covers all current features, their workflows, and planned/candidate features for future implementation.

---

## Current Features (v1.0)

---

### 1. Command Library (Browse & Search)

**Page:** `/` (index.html)

**Workflow:**
```
User opens home page
  → Express serves index.html
  → Browser loads /config.js → window.__CONFIG__
  → app.js creates Supabase client
  → SELECT * FROM commands WHERE published = true
  → If logged in: SELECT command_slug FROM progress WHERE is_completed = true
  → Render command cards (with "Done" badge if completed)
  → User types in search bar → real-time JS filter on title/slug/syntax
  → User clicks tag chip → filter by tag
  → User clicks command card → navigate to /command.html?slug=<slug>
```

**Key behaviors:**
- Search is client-side (no extra DB queries)
- Tag filter chips are auto-generated from all unique tags in loaded commands
- Difficulty label derived from tags (Beginner / Intermediate / Advanced)
- Stats bar shows total commands, completed count, category count

---

### 2. Command Detail Page

**Page:** `/command.html?slug=<slug>`

**Workflow:**
```
User navigates to /command.html?slug=cd
  → SELECT * FROM commands WHERE slug = 'cd' AND published = true
  → Render: title, syntax, tags, description
  → Render asciinema embed (asciinema.org iframe)
  → Render video embed (YouTube iframe / Vimeo iframe / <video> tag)
  → "Practice" button → /practice.html?slug=cd
```

**Media normalization:**
- Asciinema: `https://asciinema.org/a/<id>` → `https://asciinema.org/a/<id>/iframe`
- YouTube: extracts video ID → embed URL
- Vimeo: extracts video ID → player.vimeo.com URL
- Direct video: `.mp4/.webm/.ogg` → `<video>` tag with controls

---

### 3. Guided Practice Mode

**Page:** `/practice.html?slug=<slug>`

**Workflow:**
```
User arrives from command detail or nav
  → Load command: SELECT * FROM commands WHERE slug = $slug
  → If logged in: load saved progress from DB (step_index, is_completed)
  → If not logged in: load step_index from localStorage
  → Render step list (highlight current step)
  → User types command in textarea
  → User clicks "Check"
      → Trim last non-empty line of input
      → Normalize whitespace
      → Compare to lesson_steps[current_index]
      → If match: advance step_index, show success, save progress
      → If no match: show "Try again" + hint (expected vs typed)
  → On final step completion:
      → is_completed = true, completed_at = now()
      → UPSERT into progress table (if logged in)
      → Show completion message
  → "Reset" button: step_index = 0, clear textarea
```

**Progress save logic:**
```
If user is logged in:
  → UPSERT progress (user_id, command_slug, step_index, is_completed)
  → Show sync status: "Saved" / "Saving..." / "Error"
If user is not logged in:
  → Save to localStorage only
  → Show "Login to save progress" hint
```

**Free practice mode** (`/practice.html` with no slug):
- No command loaded, no step list
- Just a textarea for free-form command entry

---

### 4. GitHub OAuth Authentication

**Pages:** `/login.html`, `/callback.html`

**Workflow:**
```
User visits /login.html
  → If already logged in: show email + sign-out button
  → If not logged in: show "Continue with GitHub" button

User clicks "Continue with GitHub"
  → supabase.auth.signInWithOAuth({
      provider: "github",
      redirectTo: window.location.origin + "/callback.html"
    })
  → Redirect to GitHub OAuth consent screen
  → GitHub redirects to /callback.html?code=...

/callback.html
  → supabase.auth.getSession() → Supabase processes the auth code
  → First-ever login: Supabase trigger creates public.profiles row (role = 'user')
  → On success: show "Welcome back! <email>" → redirect to / after 1.5s
  → On failure: show error + link to /login.html

Sign out (any page nav):
  → supabase.auth.signOut()
  → Redirect to /login.html
```

---

### 5. Progress Tracking (My Progress)

**Page:** `/me.html`

**Workflow:**
```
User navigates to /me.html
  → getSessionAndRole() → if not logged in, redirect to /login.html
  → SELECT * FROM progress WHERE user_id = auth.uid()
  → Extract all command slugs from results
  → SELECT title, syntax, slug FROM commands WHERE slug IN ($slugs)
  → Render two sections:
      - "Completed" (is_completed = true)
      - "In Progress" (step_index > 0, is_completed = false)
  → Each card: title, syntax, slug, status badge, View + Practice buttons
```

---

### 6. Admin Dashboard (CRUD)

**Page:** `/admin.html`

**Workflow:**
```
Admin navigates to /admin.html
  → getSessionAndRole() → if role != 'admin', redirect to /login.html
  → SELECT * FROM commands (all, including unpublished)
  → Render command list (right panel)
  → Render empty form (left panel)

Create new command:
  → Fill form (title, slug, syntax, description, asciinema URL, video URL, tags, lesson steps)
  → Toggle "Published" checkbox
  → Click "Save"
  → Validate all required fields
  → INSERT INTO commands (...)
  → Reload list

Edit command:
  → Click "Edit" on a command in the list
  → Form populates with existing values
  → Admin modifies fields
  → Click "Save"
  → UPDATE commands SET ... WHERE id = $id
  → Reload list

Delete command:
  → Click "Delete" → browser confirm dialog
  → DELETE FROM commands WHERE id = $id
  → Reload list

Publish / Unpublish:
  → Click "Publish" or "Unpublish" button
  → UPDATE commands SET published = $value WHERE id = $id
  → Reload list

Live preview:
  → Asciinema URL field input → preview iframe updates in real-time
  → Video URL field input → preview embed updates in real-time
```

---

## Planned Features (v2.0+)

The features below are candidates for future implementation. Each includes a description, implementation notes, and the workflow it would introduce.

---

### F-01: Real Browser Terminal (WebSocket Shell)

**Priority:** High
**Complexity:** High

**Description:**
Replace the textarea-based practice mode with a real embedded terminal running in the browser. Commands would execute in a sandboxed shell environment.

**Workflow:**
```
User opens practice page
  → Backend spins up isolated Docker container or uses a shared sandbox
  → WebSocket connection established between browser and backend
  → User types into terminal (xterm.js)
  → Input sent over WebSocket to sandboxed shell
  → Output streamed back to browser terminal
  → Backend validates output / checks command history
  → On correct command: advance step
```

**Implementation notes:**
- Frontend: xterm.js for terminal UI
- Backend: WebSocket server (ws or Socket.io), Docker sandbox or VM per session
- Security: strong sandboxing required (no network, limited filesystem)
- Add `SANDBOX_URL` env var for WebSocket endpoint

---

### F-02: Additional OAuth Providers

**Priority:** Medium
**Complexity:** Low

**Description:**
Allow login with Google, GitLab, or other providers supported by Supabase Auth.

**Workflow:**
```
/login.html shows multiple OAuth buttons (GitHub, Google, GitLab)
  → Each button calls supabase.auth.signInWithOAuth({ provider: "google" })
  → Same callback.html flow handles all providers
```

**Implementation notes:**
- Enable provider in Supabase dashboard → Authentication → Providers
- Add provider buttons to login.html
- No backend changes needed

---

### F-03: Learning Paths / Command Sequences

**Priority:** High
**Complexity:** Medium

**Description:**
Group commands into ordered learning paths (e.g., "File System Basics" → 8 commands in sequence). Users complete paths step-by-step.

**New DB table:**
```sql
paths (
  id          uuid PK,
  slug        text UNIQUE NOT NULL,
  title       text NOT NULL,
  description text,
  command_slugs text[],   -- ordered list of command slugs
  published   boolean DEFAULT false,
  created_at  timestamptz
)

path_progress (
  id            uuid PK,
  user_id       uuid REFERENCES auth.users,
  path_slug     text,
  command_index int DEFAULT 0,
  is_completed  boolean DEFAULT false,
  completed_at  timestamptz
)
```

**Workflow:**
```
User visits /paths.html
  → Browse published learning paths
  → Click path → see ordered list of commands
  → Start path → guided through commands in order
  → Progress tracked in path_progress table
  → On completion: badge/achievement awarded
```

---

### F-04: Achievements & Badges

**Priority:** Medium
**Complexity:** Medium

**Description:**
Award badges when users hit milestones (first command completed, 10 commands, first path, etc.).

**New DB table:**
```sql
achievements (
  id          uuid PK,
  key         text UNIQUE NOT NULL,   -- e.g. 'first_command'
  title       text NOT NULL,
  description text,
  icon        text                    -- emoji or URL
)

user_achievements (
  id             uuid PK,
  user_id        uuid REFERENCES auth.users,
  achievement_key text,
  earned_at      timestamptz
)
```

**Workflow:**
```
After any practice step is saved:
  → Check milestone conditions (count of completed commands, etc.)
  → If threshold crossed: INSERT INTO user_achievements
  → Show achievement popup/toast on page
  → Display badges on /me.html
```

---

### F-05: User-Submitted Command Suggestions

**Priority:** Medium
**Complexity:** Medium

**Description:**
Logged-in users can suggest new commands for the admin to review and publish.

**New DB table:**
```sql
suggestions (
  id          uuid PK,
  user_id     uuid REFERENCES auth.users,
  title       text NOT NULL,
  slug        text,
  description text,
  status      text DEFAULT 'pending',  -- 'pending' | 'approved' | 'rejected'
  created_at  timestamptz
)
```

**Workflow:**
```
User visits /suggest.html (auth required)
  → Fills in title, slug, description
  → INSERT INTO suggestions
  → Admin sees suggestions queue in /admin.html
  → Admin clicks "Approve" → creates command record
  → Admin clicks "Reject" → marks suggestion as rejected
```

---

### F-06: Command Ratings & Difficulty Voting

**Priority:** Medium
**Complexity:** Low

**Description:**
Users rate command difficulty (Easy / Medium / Hard) after completing practice. Aggregate shown on command card.

**New DB table:**
```sql
ratings (
  id            uuid PK,
  user_id       uuid REFERENCES auth.users,
  command_slug  text,
  difficulty    int CHECK (difficulty IN (1,2,3)),  -- 1=Easy, 2=Medium, 3=Hard
  created_at    timestamptz,
  UNIQUE (user_id, command_slug)
)
```

**Workflow:**
```
After completing a command:
  → Show difficulty rating prompt (Easy / Medium / Hard)
  → User clicks → UPSERT into ratings
  → Command card on home shows average difficulty rating
```

---

### F-07: Admin Analytics Dashboard

**Priority:** Medium
**Complexity:** Medium

**Description:**
Admins can view engagement metrics: most practiced commands, completion rates, drop-off steps, active users.

**Workflow:**
```
Admin visits /admin.html → "Analytics" tab
  → Queries:
      - Total users (COUNT profiles)
      - Most completed commands (COUNT progress WHERE is_completed=true GROUP BY command_slug)
      - Completion rate per command
      - Step drop-off analysis (step_index distribution per command)
      - Daily active users (updated_at date distribution)
  → Render bar charts / tables
```

**Implementation notes:**
- Use Supabase aggregation queries (no new tables needed)
- Could use Chart.js (CDN) for visualization

---

### F-08: Dark Mode

**Priority:** Low
**Complexity:** Low

**Description:**
Toggle between light and dark themes. Preference saved to localStorage.

**Workflow:**
```
User clicks moon/sun icon in nav
  → Toggle class on <body>
  → Save preference: localStorage.setItem('theme', 'dark')
  → On page load: read preference and apply class
  → CSS variables flip color scheme based on .dark class
```

---

### F-09: SEO & Meta Tags

**Priority:** Medium
**Complexity:** Low

**Description:**
Add Open Graph, Twitter Card, and standard meta tags to all pages for better shareability and discoverability.

**Implementation:**
- `index.html`: Generic LinuxDojo meta
- `command.html`: Dynamic meta (title = command title, description = first 160 chars)
- Add `<link rel="canonical">` to all pages
- Add `robots.txt` and `sitemap.xml` (generated from published commands)

---

### F-10: Comment / Discussion Threads

**Priority:** Low
**Complexity:** High

**Description:**
Allow users to ask questions or leave tips on each command page.

**New DB table:**
```sql
comments (
  id            uuid PK,
  command_slug  text NOT NULL,
  user_id       uuid REFERENCES auth.users,
  body          text NOT NULL,
  created_at    timestamptz,
  updated_at    timestamptz
)
```

**Workflow:**
```
User visits command detail page (logged in)
  → Sees existing comments (SELECT * FROM comments WHERE command_slug = $slug ORDER BY created_at)
  → Types comment → INSERT INTO comments
  → Comment appears in thread
  → User can delete own comment
  → Admin can delete any comment
```

---

### F-11: AI-Assisted Hints

**Priority:** Low
**Complexity:** High

**Description:**
When a user is stuck on a practice step, they can request an AI-generated hint or explanation.

**Workflow:**
```
User clicks "Get AI Hint" during practice
  → Backend receives: command slug, current step, what the user typed
  → Calls Claude API with context
  → Returns a plain-English explanation of why the command is wrong and what to try
  → Displayed in hint box (no answer given directly)
```

**Implementation notes:**
- Requires Claude API integration in server.js
- Add `ANTHROPIC_API_KEY` env var
- Rate-limit hints per user per day (avoid abuse)

---

### F-12: REST API for Command Data

**Priority:** Low
**Complexity:** Low

**Description:**
Expose a public read-only JSON API for published commands. Useful for external integrations, CLI tools, or mobile apps.

**Endpoints:**
```
GET /api/commands          → list of all published commands
GET /api/commands/:slug    → single command detail
```

**Implementation notes:**
- Add routes in server.js before static middleware
- Auth via `SUPABASE_SERVICE_KEY` on server (bypasses RLS for read-only access)
- Rate-limit with express-rate-limit

---

### F-13: Progress Export

**Priority:** Low
**Complexity:** Low

**Description:**
Users can download their progress as a CSV or JSON file from `/me.html`.

**Workflow:**
```
User clicks "Export Progress" on /me.html
  → Query all progress records for user
  → Join with commands to get titles
  → Generate CSV/JSON in browser
  → Trigger download via Blob URL
```

---

### F-14: Email Notifications

**Priority:** Low
**Complexity:** Medium

**Description:**
Send transactional emails (welcome email, streak reminder, path completion).

**Implementation notes:**
- Supabase supports custom SMTP or Resend integration
- Supabase Edge Functions can trigger on DB events (e.g., first login → welcome email)
- Requires user to provide email (or use GitHub email via OAuth)

---

## Feature Priority Matrix

| Feature                          | Priority | Complexity | Value     |
|----------------------------------|----------|------------|-----------|
| F-01: Real Terminal              | High     | High       | Very High |
| F-03: Learning Paths             | High     | Medium     | High      |
| F-02: More OAuth Providers       | Medium   | Low        | Medium    |
| F-04: Achievements & Badges      | Medium   | Medium     | High      |
| F-05: Command Suggestions        | Medium   | Medium     | Medium    |
| F-06: Difficulty Voting          | Medium   | Low        | Medium    |
| F-07: Admin Analytics            | Medium   | Medium     | High      |
| F-09: SEO & Meta Tags            | Medium   | Low        | Medium    |
| F-08: Dark Mode                  | Low      | Low        | Low       |
| F-12: REST API                   | Low      | Low        | Medium    |
| F-13: Progress Export            | Low      | Low        | Low       |
| F-10: Comments                   | Low      | High       | Medium    |
| F-11: AI Hints                   | Low      | High       | High      |
| F-14: Email Notifications        | Low      | Medium     | Low       |

---

## Complete System Workflow (Current v1.0)

```
                        ┌─────────────────────────────────────────────┐
                        │               BROWSER (Frontend)            │
                        │                                             │
                        │  1. Load HTML → fetch /config.js           │
                        │  2. window.__CONFIG__ = {URL, KEY}          │
                        │  3. app.js: createClient(URL, KEY)          │
                        │                                             │
                        │  ┌─────────────────────────────────────┐   │
                        │  │         Page-Level Logic             │   │
                        │  │                                      │   │
                        │  │  index.html → browse/search cmds     │   │
                        │  │  command.html → view detail/media    │   │
                        │  │  practice.html → step-by-step input  │   │
                        │  │  me.html → view own progress         │   │
                        │  │  admin.html → CRUD commands          │   │
                        │  │  login.html → GitHub OAuth           │   │
                        │  │  callback.html → session handler     │   │
                        │  └─────────────────────────────────────┘   │
                        └──────────────────┬──────────────────────────┘
                                           │
                        ┌──────────────────┼──────────────────────────┐
                        │   Express (server.js)                        │
                        │                  │                           │
                        │  GET /config.js ─┘                           │
                        │    → reads SUPABASE_URL, ANON_KEY from .env  │
                        │    → returns window.__CONFIG__ = {...}        │
                        │                                              │
                        │  ALL /* → express.static("public/")         │
                        └──────────────────────────────────────────────┘
                                           │
                        ┌──────────────────▼──────────────────────────┐
                        │           Supabase (Hosted)                  │
                        │                                             │
                        │  ┌─────────────┐  ┌────────────────────┐   │
                        │  │  Auth        │  │  Postgres + RLS     │   │
                        │  │             │  │                     │   │
                        │  │  GitHub     │  │  commands           │   │
                        │  │  OAuth      │  │  profiles           │   │
                        │  │             │  │  progress           │   │
                        │  │  Session →  │  │                     │   │
                        │  │  JWT token  │  │  RLS enforces:      │   │
                        │  │             │  │  - read own rows    │   │
                        │  │  Trigger:   │  │  - admin writes     │   │
                        │  │  create     │  │  - public reads     │   │
                        │  │  profiles   │  │    (published only) │   │
                        │  │  row        │  │                     │   │
                        │  └─────────────┘  └────────────────────┘   │
                        └─────────────────────────────────────────────┘
```

---

## Authentication Workflow (Detailed)

```
/login.html
    │
    ├── Already logged in?
    │       → Show email + sign-out button
    │
    └── Not logged in?
            → Show "Continue with GitHub" button
            │
            ▼
        supabase.auth.signInWithOAuth({
          provider: "github",
          redirectTo: origin + "/callback.html"
        })
            │
            ▼
        GitHub OAuth Consent Screen
            │
            ▼
        /callback.html (with auth code in URL fragment)
            │
            ▼
        supabase.auth.getSession()
            │
            ├── First login?
            │       → Supabase trigger: INSERT INTO profiles (id, email, role='user')
            │
            ├── Success → show "Welcome <email>" → redirect to / after 1.5s
            │
            └── Error → show error message + link back to /login.html
```

---

## Practice Workflow (Detailed)

```
/practice.html?slug=cd
    │
    ├── Load command (SELECT * FROM commands WHERE slug='cd')
    │
    ├── Load saved progress:
    │       → If logged in: SELECT from progress WHERE user_id=uid AND slug='cd'
    │       → If not logged in: read from localStorage
    │
    ├── Render:
    │       Left: step list, current step highlighted, progress pill
    │       Right: textarea, Check/Clear buttons
    │
    ├── User types in textarea and clicks "Check"
    │       │
    │       ├── Extract last non-empty line
    │       ├── Normalize whitespace
    │       ├── Compare to lesson_steps[step_index]
    │       │
    │       ├── Match:
    │       │       → Increment step_index
    │       │       → If logged in: UPSERT progress
    │       │       → If not logged in: save to localStorage
    │       │       → Advance to next step OR show completion
    │       │
    │       └── No match:
    │               → Show "Try again" message
    │               → Show hint: expected vs typed
    │
    └── On completion (all steps done):
            → is_completed = true, completed_at = now()
            → UPSERT progress (if logged in)
            → Show "Command mastered!" message
```
