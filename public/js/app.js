import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

export function getSupabase() {
  const cfg = window.__CONFIG__;
  if (!cfg?.SUPABASE_URL || !cfg?.SUPABASE_ANON_KEY) {
    throw new Error("Missing Supabase config. Check /config.js");
  }
  return createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
}

export async function getSessionAndRole(supabase) {
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user || null;

  let role = null;
  let email = null;

  if (user) {
    email = user.email || null;
    const { data: prof } = await supabase
      .from("profiles")
      .select("role,email")
      .eq("id", user.id)
      .single();

    role = prof?.role || "user";
    email = prof?.email || email;
  }

  return { user, email, role };
}

export function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (m) => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[m]));
}

export function renderNav(targetEl, state) {
  const { user, email, role } = state;
  const isAdmin = role === "admin";

  const right = user
    ? `
      <span class="small" style="display:inline-flex;align-items:center;gap:10px;">
        <span>Signed in as <b>${escapeHtml(email || "user")}</b></span>
      </span>
      <button class="btn" id="navLogout">Logout</button>
    `
    : `
      <a class="btn" href="/login.html">Login</a>
    `;

  const adminLink = isAdmin
    ? `<a class="btn" href="/admin.html">Admin</a>`
    : ``;

  targetEl.innerHTML = `
    <div class="nav">
      <div class="navin">
        <a class="brand" href="/">🥋 LinuxDojo</a>
        <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
          ${adminLink}
          <a class="btn" href="/practice.html">Practice</a>
          ${right}
        </div>
      </div>
    </div>
  `;
}
