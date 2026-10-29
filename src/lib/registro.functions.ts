import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import { registroSchema } from "./registro-schema";

/** Public signup: declaration is validated before contacting the auth provider. */
export const crearCuenta = createServerFn({ method: "POST" })
  .validator((input: unknown) => registroSchema.parse(input))
  .handler(async ({ data }) => {
    const url = process.env["SUPABASE_URL"];
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
    if (!url || !key) throw new Error("El registro no está disponible en este momento");
    const cliente = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization");
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      } },
    });
    const { data: resultado, error } = await cliente.auth.signUp({
      email: data.correo, password: data.clave,
      options: { emailRedirectTo: new URL(getRequest().url).origin },
    });
    if (error) throw new Error("No se pudo crear la cuenta. Revisa tus datos o inténtalo más tarde.");
    return { session: resultado.session ? {
      access_token: resultado.session.access_token, refresh_token: resultado.session.refresh_token,
    } : null };
  });