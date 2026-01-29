import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

export function getSupabase() {
  const cfg = window.__CONFIG__;
  if (!cfg?.SUPABASE_URL || !cfg?.SUPABASE_ANON_KEY) {
    throw new Error("Missing Supabase config. Check /config.js and .env");
  }
  return createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
}
