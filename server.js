import express from "express";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve static files
app.use(express.static(path.join(__dirname, "public")));

// Serve config dynamically (anon key is safe to expose)
app.get("/config.js", (req, res) => {
  const url = process.env.SUPABASE_URL || "";
  const anon = process.env.SUPABASE_ANON_KEY || "";

  res.type("application/javascript").send(`
    window.__CONFIG__ = {
      SUPABASE_URL: ${JSON.stringify(url)},
      SUPABASE_ANON_KEY: ${JSON.stringify(anon)},
      SITE_URL: ${JSON.stringify(`http://localhost:${PORT}`)}
    };
  `);
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ LinuxDojo running: http://0.0.0.0:${PORT}`);
});

