import { defineConfig } from "nitro";

export default defineConfig({
  preset: "cloudflare_module",
  compatibilityDate: "2026-11-12",
  cloudflare: {
    deployConfig: true,
    nodeCompat: true,
    wrangler: {
      name: "cocina-de-oriente-pos",
      vars: {
        SUPABASE_URL: "https://lyjkeazlftgboufzndmg.supabase.co",
        SUPABASE_PUBLISHABLE_KEY: "sb_publishable_IG5_bYZaNPmkW7T0-v1X7Q_VO8xRa-z",
        VITE_SUPABASE_PROJECT_ID: "lyjkeazlftgboufzndmg",
        VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_IG5_bYZaNPmkW7T0-v1X7Q_VO8xRa-z",
        VITE_SUPABASE_URL: "https://lyjkeazlftgboufzndmg.supabase.co"
      },
    },
  },
});
