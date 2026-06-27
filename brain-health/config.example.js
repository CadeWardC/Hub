/* ============================================================
   Brain Health — Supabase browser config (TEMPLATE)
   Copy to `config.js` and fill in from the repo-root .env.
   Use ONLY the publishable (anon) key — gated by Supabase RLS.
   The SUPABASE_SECRET_KEY must never appear in any client-side file.

   Quick generate (from repo root, with .env present):
     node -e "const e=require('fs').readFileSync('.env','utf8'),g=k=>e.match(new RegExp(k+'=(.*)'))[1].trim();require('fs').writeFileSync('brain-health/config.js','window.BRAIN_CONFIG = {\n  SUPABASE_URL: \"'+g('SUPABASE_URL')+'\",\n  SUPABASE_ANON_KEY: \"'+g('SUPABASE_PUBLISHABLE_KEY')+'\"\n};\n')"
   ============================================================ */
window.BRAIN_CONFIG = {
  SUPABASE_URL: "https://YOUR-PROJECT.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_xxxxxxxxxxxxxxxxxxxx"
};
