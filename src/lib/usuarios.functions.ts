
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";

/**
 * CONFIGURACIÓN
 * La clave administrativa solo se utiliza en el servidor.
 */
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function obtenerClientes() {
  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
    throw new Error("Faltan variables de entorno de Supabase");
  }

  return {
    auth: createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    }),
    admin: createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    }),
  };
}

/**
 * VERIFICAR ADMINISTRADOR
 */
async function verificarAdministrador(accessToken: string) {
  const { auth, admin } = obtenerClientes();

  const { data, error } = await auth.auth.getUser(accessToken);

  if (error || !data.user) {
    throw new Error("Sesión inválida o expirada");
  }

  const { data: roles, error: roleError } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", data.user.id);

  if (roleError) {
    throw new Error(`No se pudo verificar el rol: ${roleError.message}`);
  }

  if (!(roles ?? []).some((r) => r.role === "admin")) {
    throw new Error("Solo un administrador puede gestionar usuarios");
  }

  return { user: data.user, admin };
}

/**
 * 1. ELIMINAR USUARIO DEFINITIVAMENTE
 */
export const eliminarUsuario = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({
      accessToken: z.string().min(1),
      userId: z.string().uuid(),
    }).parse(data)
  )
  .handler(async ({ data }) => {
    const { user, admin } = await verificarAdministrador(data.accessToken);

    if (user.id === data.userId) {
      throw new Error("No puedes eliminar tu propia cuenta");
    }

    const { data: usuario, error: usuarioError } =
      await admin.auth.admin.getUserById(data.userId);

    if (usuarioError || !usuario.user) {
      throw new Error("El usuario no existe");
    }

    // Eliminar roles.
    const { error: rolError } = await admin
      .from("user_roles")
      .delete()
      .eq("user_id", data.userId);

    if (rolError) {
      throw new Error(`Error al eliminar roles: ${rolError.message}`);
    }

    // Eliminar perfil.
    const { error: perfilError } = await admin
      .from("usuarios")
      .delete()
      .eq("id", data.userId);

    if (perfilError) {
      throw new Error(`Error al eliminar perfil: ${perfilError.message}`);
    }

    // Eliminar cuenta de autenticación.
    const { error: authError } =
      await admin.auth.admin.deleteUser(data.userId);

    if (authError) {
      throw new Error(`Error al eliminar cuenta: ${authError.message}`);
    }

    return {
      ok: true,
      message: "Usuario eliminado correctamente",
    };
  });

/**
 * 2. SUSPENDER USUARIO
 *
 * Duraciones permitidas:
 *  - 1h
 *  - 24h
 *  - 7d
 *  - 30d
 */
export const suspenderUsuario = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({
      accessToken: z.string().min(1),
      userId: z.string().uuid(),
      duracion: z.enum(["1h", "24h", "7d", "30d"]).default("24h"),
    }).parse(data)
  )
  .handler(async ({ data }) => {
    const { user, admin } = await verificarAdministrador(data.accessToken);

    if (user.id === data.userId) {
      throw new Error("No puedes suspender tu propia cuenta");
    }

    const { data: usuario, error: usuarioError } =
      await admin.auth.admin.getUserById(data.userId);

    if (usuarioError || !usuario.user) {
      throw new Error("El usuario no existe");
    }

    // Impedir suspender a otro administrador.
    const { data: roles, error: rolesError } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", data.userId);

    if (rolesError) {
      throw new Error(`Error al consultar roles: ${rolesError.message}`);
    }

    if ((roles ?? []).some((r) => r.role === "admin")) {
      throw new Error("No puedes suspender a otro administrador");
    }

    const { error } = await admin.auth.admin.updateUserById(data.userId, {
      ban_duration: data.duracion,
    });

    if (error) {
      throw new Error(`Error al suspender usuario: ${error.message}`);
    }

    return {
      ok: true,
      message: `Usuario suspendido durante ${data.duracion}`,
    };
  });

/**
 * 3. REACTIVAR USUARIO SUSPENDIDO
 */
export const reactivarUsuario = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({
      accessToken: z.string().min(1),
      userId: z.string().uuid(),
    }).parse(data)
  )
  .handler(async ({ data }) => {
    const { admin } = await verificarAdministrador(data.accessToken);

    const { data: usuario, error: usuarioError } =
      await admin.auth.admin.getUserById(data.userId);

    if (usuarioError || !usuario.user) {
      throw new Error("El usuario no existe");
    }

    const { error } = await admin.auth.admin.updateUserById(data.userId, {
      ban_duration: "none",
    });

    if (error) {
      throw new Error(`Error al reactivar usuario: ${error.message}`);
    }

    return {
      ok: true,
      message: "Usuario reactivado correctamente",
    };
  });
