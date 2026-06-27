// ========================================
// SMOLOV — Supabase browser config (TEMPLATE)
// Copy this file to `config.js` and fill in the values from the project .env.
//
// Use ONLY the publishable (anon) key here — it is designed to be public and
// is protected by Supabase Row Level Security. The SUPABASE_SECRET_KEY must
// never appear in any client-side file.
//
// Quick generate (from the repo root, requires the .env to be present):
//   node -e "const e=require('fs').readFileSync('.env','utf8'),g=k=>e.match(new RegExp(k+'=(.*)'))[1].trim();require('fs').writeFileSync('smolov/config.js','window.SMOLOV_CONFIG = {\n    SUPABASE_URL: \"'+g('SUPABASE_URL')+'\",\n    SUPABASE_ANON_KEY: \"'+g('SUPABASE_PUBLISHABLE_KEY')+'\"\n};\n')"
// ========================================
window.SMOLOV_CONFIG = {
    SUPABASE_URL: "https://YOUR-PROJECT.supabase.co",
    SUPABASE_ANON_KEY: "sb_publishable_xxxxxxxxxxxxxxxxxxxx"
};
