import express from "express";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve config dynamically BEFORE static files so this route takes precedence.
// Set SUPABASE_URL and SUPABASE_ANON_KEY in your .env (or Render env vars).
app.get("/config.js", (req, res) => {
  const url  = process.env.SUPABASE_URL      || "";
  const anon = process.env.SUPABASE_ANON_KEY || "";

  if (!url || !anon) {
    console.warn("⚠️  SUPABASE_URL or SUPABASE_ANON_KEY is not set in environment variables.");
  }

  res.type("application/javascript").send(
    `window.__CONFIG__ = ${JSON.stringify({ SUPABASE_URL: url, SUPABASE_ANON_KEY: anon })};`
  );
});

// Serve static files from /public (after config route so /config.js is dynamic)
app.use(express.static(path.join(__dirname, "public")));

app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ LinuxDojo running: http://0.0.0.0:${PORT}`);
});
