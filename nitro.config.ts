import { defineConfig } from "nitro";

export default defineConfig({
  preset: "cloudflare_module",
  compatibilityDate: "2026-11-12",
  cloudflare: {
    deployConfig: true,
    nodeCompat: true,
    wrangler: {
      name: "cocina-de-oriente-pos",
    },
  },
});
