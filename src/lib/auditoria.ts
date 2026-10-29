import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

export type RegistroAuditoria = {
  audit_id: string;
  operation_id: string;
  user_id: string | null;
  user_name: string;
  user_role: string;
  created_at: string;
  action: string;
  module: string;
  entity_type: string;
  entity_id: string | null;
  description: string;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  status: string;
  reason: string | null;
};

export const MODULOS = [
  "PEDIDOS",
  "PRODUCTOS",
  "INVENTARIO",
  "USUARIOS",
  "CATEGORIAS",
] as const;

/** Módulos y acciones que no se muestran en la bitácora. */
const MODULOS_OCULTOS = new Set(["AUTENTICACION", "CONFIGURACION"]);
const ACCIONES_OCULTAS = new Set([
  "INICIAR_SESION",
  "CERRAR_SESION",
  "INTENTO_FALLIDO",
]);

export function eventoVisible(registro: RegistroAuditoria) {
  return !MODULOS_OCULTOS.has(registro.module) && !ACCIONES_OCULTAS.has(registro.action);
}

/** Etiqueta legible para cada acción registrada. */
export function etiquetaAccion(accion: string) {
  const mapa: Record<string, string> = {
    CREAR: "Crear",
    EDITAR: "Editar",
    ELIMINAR: "Eliminar",
    COBRAR: "Cobrar",
    ANULAR: "Anular",
    CAMBIAR_ESTADO: "Cambiar estado",
    CAMBIAR_PRECIO: "Cambiar precio",
    AJUSTAR_STOCK: "Ajustar stock",
    ASIGNAR_ROL: "Asignar rol",
    QUITAR_ROL: "Quitar rol",
    CAMBIAR_ROL: "Cambiar rol",
    APROBAR: "Aprobar cuenta",
    SUSPENDER: "Suspender cuenta",
    INICIAR_SESION: "Inicio de sesión",
    CERRAR_SESION: "Cierre de sesión",
    INTENTO_FALLIDO: "Intento fallido",
    RESUMEN_DIARIO: "Resumen diario",
  };
  return mapa[accion] ?? accion;
}

export function etiquetaCampo(campo: string) {
  const mapa: Record<string, string> = {
    nombre: "Nombre",
    descripcion: "Descripción",
    precio: "Precio",
    categoria: "Categoría",
    categoria_id: "Categoría",
    imagen_url: "Imagen",
    disponible: "Disponible",
    stock_actual: "Stock actual",
    stock_minimo: "Stock mínimo",
    unidad: "Unidad",
    fecha_vencimiento: "Vencimiento",
    estado: "Estado",
    items: "Líneas del pedido",
    subtotal: "Subtotal",
    iva: "IVA",
    total: "Total",
    mesa: "Mesa",
    tipo: "Tipo",
    aprobado: "Aprobado",
    rol: "Rol (etiqueta)",
    role: "Rol",
    turno: "Turno",
    foto_url: "Foto",
    correo: "Correo",
    orden: "Orden",
    activo: "Activo",
    cantidad_por_unidad: "Cantidad por unidad",
    fecha_pago: "Fecha de pago",
    metodo_pago: "Forma de pago",
  };
  return mapa[campo] ?? campo;
}

export function formatearValor(valor: unknown): string {
  if (valor === null || valor === undefined || valor === "") return "—";
  if (typeof valor === "boolean") return valor ? "Sí" : "No";
  if (typeof valor === "object") return JSON.stringify(valor, null, 1);
  return String(valor);
}

/** Campos que cambiaron en un evento (unión de anteriores y nuevos). */
export function camposDelDiff(registro: RegistroAuditoria) {
  const claves = new Set([
    ...Object.keys(registro.new_values ?? {}),
    ...Object.keys(registro.old_values ?? {}),
  ]);
  return [...claves].filter((k) => k !== "id" && k !== "created_at").sort();
}

/** Registra un evento que no proviene de un cambio de tabla (por ejemplo, sesión). */
export async function registrarAuditoria(params: {
  action: string;
  module: string;
  entityType: string;
  entityId?: string | null;
  description?: string;
  status?: "SUCCESS" | "FAILED";
  reason?: string | null;
}) {
  try {
    await supabase.rpc("log_audit", {
      _action: params.action,
      _module: params.module,
      _entity_type: params.entityType,
      _description: params.description ?? "",
      _status: params.status ?? "SUCCESS",
      _entity_id: (params.entityId ?? null) as unknown as string,
      ...(params.reason ? { _reason: params.reason } : {}),
    });
  } catch {
    // La auditoría nunca debe bloquear la operación del usuario.
  }
}

const REGEX_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function esUuid(valor: unknown): valor is string {
  return typeof valor === "string" && REGEX_UUID.test(valor);
}

/** UUIDs presentes en un registro (entity_id y valores antes/después). */
export function uuidsDelRegistro(registro: RegistroAuditoria): string[] {
  const ids = new Set<string>();
  if (registro.entity_id) ids.add(registro.entity_id);
  for (const fuente of [registro.old_values, registro.new_values]) {
    for (const valor of Object.values(fuente ?? {})) {
      if (esUuid(valor)) ids.add(valor);
    }
  }
  return [...ids];
}

/**
 * Resuelve UUIDs a nombres legibles consultando las tablas del catálogo.
 * Devuelve un mapa id -> "Nombre (tabla)".
 */
export function useNombresEntidades(uuids: string[], habilitado = true) {
  return useQuery({
    queryKey: ["auditoria", "nombres", [...uuids].sort().join(",")],
    enabled: habilitado && uuids.length > 0,
    queryFn: async (): Promise<Record<string, string>> => {
      const mapa: Record<string, string> = {};
      const tablas: [string, string][] = [
        ["productos", "Producto"],
        ["bebidas", "Bebida"],
        ["materia_prima", "Insumo"],
        ["categorias", "Categoría"],
        ["usuarios", "Usuario"],
        ["pedidos", "Pedido"],
      ];
      await Promise.all(
        tablas.map(async ([tabla, etiqueta]) => {
          const campoNombre = tabla === "pedidos" ? "numero_ticket" : "nombre";
          const { data, error } = await (supabase.from as (t: string) => any)(tabla)
            .select(`id, ${campoNombre}`)
            .in("id", uuids);
          if (!error && data) {
            for (const fila of data as unknown as Array<{ id: string } & Record<string, any>>) {
              const texto = fila[campoNombre];
              if (fila.id && texto) {
                mapa[fila.id] = `${texto} (${etiqueta})`;
              }
            }
          }
        }),
      );
      return mapa;
    },
  });
}

/** Bitácora completa (solo administradores por RLS). */
export function useAuditoria(habilitado: boolean) {
  return useQuery({
    queryKey: ["auditoria"],
    enabled: habilitado,
    queryFn: async (): Promise<RegistroAuditoria[]> => {
      const { data, error } = await supabase
        .from("auditoria")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return ((data ?? []) as unknown as RegistroAuditoria[]).filter(eventoVisible);
    },
  });
}

/** Bitácora de un registro concreto (producto, insumo, pedido, usuario…). */
export function useBitacoraRegistro(
  entityType: string,
  entityId: string | null | undefined,
  habilitado = true,
) {
  return useQuery({
    queryKey: ["auditoria", entityType, entityId],
    enabled: habilitado && !!entityId,
    queryFn: async (): Promise<RegistroAuditoria[]> => {
      const { data, error } = await supabase
        .from("auditoria")
        .select("*")
        .eq("entity_type", entityType)
        .eq("entity_id", entityId!)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return ((data ?? []) as unknown as RegistroAuditoria[]).filter(eventoVisible);
    },
  });
}
