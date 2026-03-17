import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

export function getSupabase() {
  const cfg = window.__CONFIG__;
  if (!cfg?.SUPABASE_URL || !cfg?.SUPABASE_ANON_KEY) {
    throw new Error("Missing Supabase config. Ensure SUPABASE_URL and SUPABASE_ANON_KEY are set as environment variables on the server.");
  }
  return createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
}

export async function getSessionAndRole(supabase) {
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user || null;

  let role  = null;
  let email = null;

  if (user) {
    email = user.email || null;
    const { data: prof } = await supabase
      .from("profiles")
      .select("role,email")
      .eq("id", user.id)
      .single();

    role  = prof?.role  || "user";
    email = prof?.email || email;
  }

  return { user, email, role };
}

export function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (m) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[m]));
}

/**
 * Renders the right-side nav controls into targetEl.
 * targetEl should be a flex container inside the existing <nav> bar
 * (e.g. <div id="navMount" style="display:flex;align-items:center;gap:10px;"></div>).
 *
 * Logged-in:  [Admin?] [Practice] [Progress] [Logout]
 * Logged-out: [Practice] [Login]
 */
export function renderNav(targetEl, state) {
  const { user, role } = state;
  const isAdmin = role === "admin";

  if (user) {
    targetEl.innerHTML = `
      ${isAdmin ? `<a class="btn" href="/admin.html">Admin</a>` : ""}
      <a class="btn" href="/practice.html">Practice</a>
      <a class="btn" href="/me.html">Progress</a>
      <button class="btn" id="navLogout">Logout</button>
    `;
  } else {
    targetEl.innerHTML = `
      <a class="btn" href="/practice.html">Practice</a>
      <a class="btn" href="/login.html">Login</a>
    `;
  }
}
