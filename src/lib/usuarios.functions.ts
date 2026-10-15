import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";

/**
 * Configuración de Supabase
 */
//const supabaseUrl = process.env.VITE_SUPABASE_URL!;
//const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * Cliente administrativo de Supabase.
 * SOLO debe utilizarse en el servidor.
 */
const supabaseAdmin = createClient(
  //supabaseUrl,
  //supabaseServiceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

/**
 * Elimina por completo una cuenta:
 * - user_roles
 * - usuarios
 * - usuario de Supabase Auth
 *
 * Solo administradores.
 */
export const eliminarUsuario = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({
      userId: z.string().uuid(),
    }).parse(data)
  )
  .handler(async ({ data }) => {

    // =====================================================
    // 1. Validar que exista el usuario que se quiere eliminar
    // =====================================================

    

    const {
      data: usuario,
      error: usuarioError,
    } = await supabaseAdmin.auth.admin.getUserById(data.userId);

    if (usuarioError || !usuario) {
      throw new Error("El usuario no existe");
    }

    // =====================================================
    // 2. Eliminar los roles del usuario
    // =====================================================

    const { error: rolError } = await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", data.userId);

    if (rolError) {
      throw new Error(
        `Error al eliminar el rol: ${rolError.message}`
      );
    }

    // =====================================================
    // 3. Eliminar el perfil de la tabla usuarios
    // =====================================================

    const { error: perfilError } = await supabaseAdmin
      .from("usuarios")
      .delete()
      .eq("id", data.userId);

    if (perfilError) {
      throw new Error(
        `Error al eliminar el perfil: ${perfilError.message}`
      );
    }

    // =====================================================
    // 4. Eliminar la cuenta de Supabase Auth
    // =====================================================

    const { error: authError } =
      await supabaseAdmin.auth.admin.deleteUser(data.userId);

    if (authError) {
      throw new Error(
        `Error al eliminar la cuenta: ${authError.message}`
      );
    }

    // =====================================================
    // 5. Respuesta
    // =====================================================

    return {
      ok: true,
      message: "Usuario eliminado correctamente",
    };
  });