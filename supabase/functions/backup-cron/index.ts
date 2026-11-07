import { createClient } from "jsr:@supabase/supabase-js@2";

const BUCKET = "cocina-backups-v2";
const MAX_FILE = 16 * 1024 * 1024;

function env(name: string): string {
  const value = Deno.env.get(name);
  if (!value) {
    throw new Error(`Falta configurar ${name}`);
  }
  return value;
}

function equalToken(a: string, b: string): boolean {
  const encoder = new TextEncoder();
  const x = encoder.encode(a);
  const y = encoder.encode(b);

  if (x.length !== y.length) return false;

  let diff = 0;

  for (let i = 0; i < x.length; i++) {
    diff |= x[i] ^ y[i];
  }

  return diff === 0;
}

async function sha256(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes);

  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function validateSnapshot(data: any): void {
  const required = [
    "categorias",
    "productos",
    "materia_prima",
    "bebidas",
    "producto_insumos",
    "pedidos",
    "auditoria",
  ];

  const allowed = [
    ...required,
    "bebida_insumos",
    "pedido_items",
  ];

  if (
    !data ||
    data.format !== "cocina-data-v2" ||
    !data.tables ||
    !data.schema ||
    typeof data.schema !== "object"
  ) {
    throw new Error("Formato de respaldo incompatible");
  }

  if (
    required.some((table) => !Array.isArray(data.tables[table])) ||
    Object.keys(data.tables).some(
      (table) =>
        !allowed.includes(table) ||
        !Array.isArray(data.tables[table]),
    )
  ) {
    throw new Error("Estructura de tablas incompatible");
  }
}

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return new Response("Método no permitido", {
      status: 405,
    });
  }

  let lease: string | null = null;
  let success = false;
  let uploadedPath: string | null = null;
  let backupId: string | null = null;
  let db: ReturnType<typeof createClient> | null = null;

  try {
    // =========================================
    // 1. VALIDAR AUTENTICACIÓN
    // =========================================

    const expectedToken = env("BACKUP_CRON_TOKEN");
    const suppliedToken = request.headers.get("X-Backup-Token");

    const tokenMatches = suppliedToken
      ? equalToken(expectedToken, suppliedToken)
      : false;

    // Diagnóstico seguro: nunca registrar los valores.
    console.log("Diagnóstico de autenticación:", {
      secretConfigured: expectedToken.length > 0,
      expectedLength: expectedToken.length,
      receivedLength: suppliedToken?.length ?? 0,
      tokenMatches,
    });

    if (!suppliedToken || !tokenMatches) {
      return new Response("No autorizado", {
        status: 401,
      });
    }

    // =========================================
    // 2. CONECTAR CON SUPABASE
    // =========================================

    const supabaseUrl = env("SUPABASE_URL");
    const serviceRoleKey = env("SUPABASE_SERVICE_ROLE_KEY");

    db = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    // =========================================
    // 3. RESERVAR EJECUCIÓN AUTOMÁTICA
    // =========================================

    const { data: claim, error: claimError } = await db.rpc(
      "backup_v2_claim",
      { _automatic: true },
    );

    if (claimError) throw claimError;

    if (!claim) {
      return Response.json({
        ok: true,
        status: "omitida",
        message: "No corresponde generar un respaldo todavía",
      });
    }

    lease = claim;

    // =========================================
    // 4. OBTENER RESPALDO COMPLETO
    // =========================================

    const { data: snapshot, error: snapshotError } = await db.rpc(
      "backup_v2_snapshot",
    );

    if (snapshotError) throw snapshotError;

    validateSnapshot(snapshot);

    const bytes = new TextEncoder().encode(
      JSON.stringify(snapshot),
    );

    if (bytes.byteLength > MAX_FILE) {
      throw new Error("El respaldo supera el límite de 16 MiB");
    }

    // =========================================
    // 5. CALCULAR SHA-256
    // =========================================

    const hash = await sha256(bytes);
    const id = crypto.randomUUID();
    const path = `${id}.json`;

    const counts = Object.fromEntries(
      Object.entries(snapshot.tables).map(
        ([table, rows]: [string, any]) => [
          table,
          rows.length,
        ],
      ),
    );

    // =========================================
    // 6. GUARDAR EN STORAGE PRIVADO
    // =========================================

    const { error: uploadError } = await db.storage
      .from(BUCKET)
      .upload(path, bytes, {
        contentType: "application/json",
        upsert: false,
      });

    if (uploadError) throw uploadError;

    uploadedPath = path;
    backupId = id;

    // =========================================
    // 7. REGISTRAR RESPALDO EN BASE DE DATOS
    // =========================================

    const { error: insertError } = await db
      .from("backup_v2_files")
      .insert({
        id,
        path,
        bytes: bytes.byteLength,
        sha256: hash,
        kind: "automatico",
        actor: null,
        counts,
      });

    if (insertError) throw insertError;

    // =========================================
    // 8. VERIFICAR ARCHIVO GUARDADO
    // =========================================

    const { data: downloaded, error: downloadError } =
      await db.storage.from(BUCKET).download(path);

    if (downloadError || !downloaded) {
      throw new Error("No se pudo verificar el archivo guardado");
    }

    const downloadedBytes = new Uint8Array(
      await downloaded.arrayBuffer(),
    );

    if (
      downloadedBytes.byteLength !== bytes.byteLength ||
      await sha256(downloadedBytes) !== hash
    ) {
      throw new Error("La verificación SHA-256 falló");
    }

    success = true;

    console.log("Respaldo automático completado:", {
      id,
      bytes: bytes.byteLength,
      sha256: hash,
      tables: counts,
    });

    return Response.json(
      {
        ok: true,
        status: "creada",
        id,
        bytes: bytes.byteLength,
        sha256: hash,
        tables: counts,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );

  } catch (error) {
    // =========================================
    // 9. LIMPIAR SI OCURRIÓ UN ERROR
    // =========================================

    if (db && uploadedPath) {
      if (backupId) {
        await db
          .from("backup_v2_files")
          .delete()
          .eq("id", backupId);
      }

      await db.storage
        .from(BUCKET)
        .remove([uploadedPath]);
    }

    console.error("Error en respaldo automático:", error);

    return Response.json(
      {
        ok: false,
        error: "No se pudo completar el respaldo automático",
      },
      { status: 500 },
    );

  } finally {
    // =========================================
    // 10. LIBERAR RESERVA DE EJECUCIÓN
    // =========================================

    if (db && lease) {
      const { error } = await db.rpc("backup_v2_finish", {
        _lease: lease,
        _automatic: true,
        _success: success,
      });

      if (error) {
        console.error(
          "No se pudo liberar la reserva:",
          error,
        );
      }
    }
  }
});
