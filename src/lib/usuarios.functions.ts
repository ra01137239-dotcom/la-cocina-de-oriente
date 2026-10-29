import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Elimina por completo una cuenta: perfil, rol y acceso. Solo administradores. */
export const eliminarUsuario = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => z.object({ userId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: roles, error: rolError } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    if (rolError) throw new Error(rolError.message);
    if (!(roles ?? []).some((r) => r.role === "admin")) {
      throw new Error("Solo un administrador puede eliminar usuarios");
    }
    if (data.userId === context.userId) {
      throw new Error("No puedes eliminar tu propia cuenta");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error: rolesErr } = await supabaseAdmin
      .from("user_roles").delete().eq("user_id", data.userId);
    if (rolesErr) throw new Error(rolesErr.message);

    const { error: usuarioErr } = await supabaseAdmin
      .from("usuarios").delete().eq("id", data.userId);
    if (usuarioErr) throw new Error(usuarioErr.message);

    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);

    return { ok: true };
  });