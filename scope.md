# LinuxDojo — Project Scope

## Purpose

LinuxDojo is a self-paced Linux command learning platform. The goal is to help beginners and intermediate users learn Linux/Ubuntu commands through browsing, reading, watching demos, and hands-on guided practice — all tracked per-user.

---

## Current Scope (v1.0)

### In Scope

#### Content
- Linux/Ubuntu command library managed by admins
- Each command has: title, slug, syntax, description, asciinema demo, video, tags, and lesson steps
- Commands are published/unpublished by admins — only published commands are visible to users

#### Learning Experience
- Browse and search commands on the home page
- Filter commands by category tags
- View command detail: description, asciinema terminal demo, video explanation
- Guided practice: step-by-step command input with validation and hints
- Free practice mode (no specific command selected)

#### User Accounts
- GitHub OAuth login (via Supabase Auth)
- No username/password registration — GitHub only
- One role system: `user` (default) and `admin`
- Admins are promoted manually via SQL

#### Progress Tracking
- Practice progress saved to `progress` table (step_index, is_completed)
- Progress also saved locally via localStorage as fallback
- My Progress page shows completed and in-progress commands per user

#### Admin
- Full CRUD for commands (create, read, update, delete)
- Publish / unpublish commands
- Live preview for asciinema and video embeds

#### Infrastructure
- Node.js + Express backend (serves static files + config injection)
- Supabase Postgres database with RLS
- Supabase Auth (GitHub OAuth)
- Deployment on Render

---

## Out of Scope (v1.0)

The following are explicitly **not included** in v1.0 and are candidates for future versions:

| Feature                           | Reason deferred                                      |
|-----------------------------------|------------------------------------------------------|
| Email / password auth             | GitHub OAuth is sufficient for v1                   |
| Multiple OAuth providers          | GitHub only for now                                 |
| Real terminal in browser          | Complex infra (WebSocket + sandboxed shell)         |
| Command auto-grading via shell    | Requires server-side shell execution                |
| Leaderboards / social features    | Not part of core learning loop                      |
| Comments / forums                 | Needs moderation system                             |
| Command difficulty ratings by users | Not enough data in v1                             |
| Email notifications               | No email provider configured                        |
| Mobile app                        | Web-only in v1                                      |
| Multiple languages (i18n)         | English only for now                                |
| Paid tiers / subscriptions        | Free educational tool                               |
| Analytics dashboard               | No analytics infra in v1                            |
| AI-generated content              | Manual content only in v1                           |
| Search engine indexing (SEO)      | Meta tags minimal in v1                             |
| Dark/light mode toggle            | Single theme only                                   |
| Command version history           | No audit log in v1                                  |

---

## Constraints

### Technical
- Frontend is vanilla JS (no React, Vue, or other frameworks)
- No build step — files served as-is from `/public`
- Database access is exclusively from the browser via Supabase JS client
- Express backend is intentionally thin (config injection + static files only)
- No server-side rendering

### Content
- All command content is manually entered by admins via the admin dashboard
- Asciinema recordings must be hosted on asciinema.org
- Videos must be on YouTube, Vimeo, or a direct-link host

### Security
- `SUPABASE_ANON_KEY` is the public anon key — intentionally exposed to the browser
- All data access control is enforced by Supabase RLS, not application code
- Admin privilege requires a manual database UPDATE — no self-promotion possible

### Auth
- Only GitHub accounts can sign in
- No anonymous practice tracking (progress requires login)
- localStorage used as offline/unauthenticated fallback for step progress

---

## Stakeholders

| Role         | Description                                               |
|--------------|-----------------------------------------------------------|
| Admin        | Manages command content, promotes users to admin          |
| Logged-in user | Practices commands, tracks their own progress          |
| Anonymous user | Browses and reads commands, practices without saving   |

---

## Success Criteria (v1.0)

- [ ] Any user can browse and search all published commands without logging in
- [ ] Any user can view a command detail page with media
- [ ] Any user can enter free practice mode
- [ ] Logged-in users can complete guided practice and have progress saved
- [ ] Logged-in users can view their completed and in-progress commands on `/me.html`
- [ ] Admins can create, edit, publish, and delete commands via `/admin.html`
- [ ] Deployment on Render works with env vars only (no code changes needed)
- [ ] RLS prevents unauthorized reads and writes at the database level

---

## Future Scope (v2.0+)

See `features.md` for a full list of planned and candidate features for future versions.

### High-Priority Candidates
- Real browser-based terminal (WebSocket shell)
- Additional OAuth providers (Google, GitLab)
- Command difficulty ratings and user voting
- Learning paths / command sequences
- Achievements and badges
- Admin analytics (most practiced, most completed, drop-off steps)

### Medium-Priority Candidates
- Comment/discussion threads per command
- User-submitted command suggestions
- SEO improvements (meta tags, structured data)
- Dark mode

### Long-Term / Exploratory
- AI-assisted hints during practice
- AI-generated lesson steps from command descriptions
- Community leaderboards
- REST API for command data (for external integrations)
