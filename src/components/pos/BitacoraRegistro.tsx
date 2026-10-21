import { useState } from "react";

import { AuditoriaDetalleDialog } from "./AuditoriaDetalleDialog";
import { Button } from "@/components/ui/button";
import { useEsAdmin } from "@/lib/data";
import { etiquetaAccion, useBitacoraRegistro, type RegistroAuditoria } from "@/lib/auditoria";

type Props = {
  entityType: string;
  entityId: string | null | undefined;
  titulo?: string;
};

/** Historial de cambios de un registro concreto. Solo visible para administradores. */
export function BitacoraRegistro({ entityType, entityId, titulo = "Historial de cambios" }: Props) {
  const { esAdmin } = useEsAdmin();
  const { data: eventos = [], isLoading } = useBitacoraRegistro(entityType, entityId, esAdmin);
  const [detalle, setDetalle] = useState<RegistroAuditoria | null>(null);

  if (!esAdmin || !entityId) return null;

  return (
    <section className="space-y-2">
      <p className="text-sm font-bold tracking-tight">{titulo}</p>
      {isLoading && <p className="text-xs text-muted-foreground">Cargando historial…</p>}
      {!isLoading && eventos.length === 0 && (
        <p className="rounded-xl border border-dashed p-4 text-center text-xs text-muted-foreground">
          Todavía no hay movimientos registrados.
        </p>
      )}
      <ul className="space-y-2">
        {eventos.map((e) => (
          <li
            key={e.audit_id}
            className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-xl border bg-card p-3"
          >
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold">
                {etiquetaAccion(e.action)} · {e.user_name}
              </p>
              <p className="truncate text-[11px] text-muted-foreground">
                {new Date(e.created_at).toLocaleString("es-SV")} · {e.description}
              </p>
            </div>
            <Button size="sm" variant="outline" className="h-9" onClick={() => setDetalle(e)}>
              Ver
            </Button>
          </li>
        ))}
      </ul>
      <AuditoriaDetalleDialog registro={detalle} onOpenChange={() => setDetalle(null)} />
    </section>
  );
}
