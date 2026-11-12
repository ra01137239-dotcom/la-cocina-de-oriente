import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (cuerpo: unknown, estado = 200) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { ...cors, "Content-Type": "application/json" },
  });

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Clave secreta del proyecto: usa la nueva si existe y, si no, la anterior. */
function claveAdmin(): string | undefined {
  try {
    const claves = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}");
    if (claves.default) return claves.default as string;
  } catch {
    // Se usa la clave anterior.
  }
  return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? undefined;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);

  const url = Deno.env.get("SUPABASE_URL");
  const clave = claveAdmin();
  if (!url || !clave) return json({ error: "Falta configuración del servidor" }, 500);

  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return json({ error: "No autorizado" }, 401);

  const admin = createClient(url, clave, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 1. Comprobar quién hace la solicitud.
  const { data: quien, error: errorAuth } = await admin.auth.getUser(token);
  if (errorAuth || !quien.user) return json({ error: "Sesión no válida" }, 401);
  const solicitante = quien.user.id;

  // 2. Comprobar que es administrador.
  const { data: roles, error: errorRoles } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", solicitante);
  if (errorRoles) return json({ error: "No se pudieron comprobar tus permisos" }, 500);
  if (!(roles ?? []).some((r) => r.role === "admin")) {
    return json({ error: "Solo un administrador puede eliminar usuarios" }, 403);
  }

  // 3. Validar el usuario a eliminar.
  let userId: unknown;
  try {
    ({ userId } = await req.json());
  } catch {
    return json({ error: "Solicitud inválida" }, 400);
  }
  if (typeof userId !== "string" || !UUID.test(userId)) {
    return json({ error: "Identificador no válido" }, 400);
  }
  if (userId === solicitante) {
    return json({ error: "No puedes eliminar tu propia cuenta" }, 400);
  }

  // 4. Eliminar: roles, perfil y acceso.
  const { error: e1 } = await admin.from("user_roles").delete().eq("user_id", userId);
  if (e1) return json({ error: e1.message }, 400);

  const { error: e2 } = await admin.from("usuarios").delete().eq("id", userId);
  if (e2) return json({ error: e2.message }, 400);

  const { error: e3 } = await admin.auth.admin.deleteUser(userId);
  if (e3) return json({ error: e3.message }, 400);

  return json({ ok: true });
});
