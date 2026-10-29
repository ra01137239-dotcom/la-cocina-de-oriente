import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  camposDelDiff,
  esUuid,
  etiquetaAccion,
  etiquetaCampo,
  formatearValor,
  uuidsDelRegistro,
  useNombresEntidades,
  type RegistroAuditoria,
} from "@/lib/auditoria";

type Props = {
  registro: RegistroAuditoria | null;
  onOpenChange: (abierto: boolean) => void;
};

export function AuditoriaDetalleDialog({ registro, onOpenChange }: Props) {
  const campos = registro ? camposDelDiff(registro) : [];
  const uuids = registro ? uuidsDelRegistro(registro) : [];
  const { data: nombres = {} } = useNombresEntidades(uuids, !!registro);

  /** Muestra el nombre legible cuando el valor es un UUID conocido. */
  const valorLegible = (valor: unknown): string => {
    if (esUuid(valor) && nombres[valor]) return nombres[valor];
    return formatearValor(valor);
  };

  const entidadLegible =
    registro?.entity_id && nombres[registro.entity_id]
      ? nombres[registro.entity_id]
      : (registro?.entity_id ?? "—");

  return (
    <Dialog open={!!registro} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] gap-0 overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="truncate">Detalle del evento</DialogTitle>
          <DialogDescription className="font-mono text-xs">
            {registro?.operation_id}
          </DialogDescription>
        </DialogHeader>

        {registro && (
          <div className="mt-2 space-y-4">
            <dl className="grid grid-cols-2 gap-3 rounded-xl border bg-card p-3 text-xs sm:grid-cols-3">
              <div className="min-w-0">
                <dt className="text-muted-foreground">Fecha y hora</dt>
                <dd className="font-medium">
                  {new Date(registro.created_at).toLocaleString("es-SV")}
                </dd>
              </div>
              <div className="min-w-0">
                <dt className="text-muted-foreground">Usuario</dt>
                <dd className="truncate font-medium">{registro.user_name}</dd>
              </div>
              <div className="min-w-0">
                <dt className="text-muted-foreground">Rol</dt>
                <dd className="font-medium">{registro.user_role}</dd>
              </div>
              <div className="min-w-0">
                <dt className="text-muted-foreground">Módulo</dt>
                <dd className="font-medium">{registro.module}</dd>
              </div>
              <div className="min-w-0">
                <dt className="text-muted-foreground">Acción</dt>
                <dd className="font-medium">{etiquetaAccion(registro.action)}</dd>
              </div>
              <div className="min-w-0">
                <dt className="text-muted-foreground">Resultado</dt>
                <dd
                  className={`font-semibold ${
                    registro.status === "SUCCESS" ? "text-success" : "text-destructive"
                  }`}
                >
                  {registro.status === "SUCCESS" ? "Correcto" : "Fallido"}
                </dd>
              </div>
              <div className="col-span-2 min-w-0 sm:col-span-3">
                <dt className="text-muted-foreground">Registro afectado</dt>
                <dd className="break-all font-mono text-[11px]">
                  {registro.entity_type} · {entidadLegible}
                </dd>
              </div>
              <div className="col-span-2 min-w-0 sm:col-span-3">
                <dt className="text-muted-foreground">Descripción</dt>
                <dd className="font-medium">{registro.description || "—"}</dd>
              </div>
              {registro.reason && (
                <div className="col-span-2 min-w-0 sm:col-span-3">
                  <dt className="text-muted-foreground">Motivo</dt>
                  <dd className="font-medium">{registro.reason}</dd>
                </div>
              )}
            </dl>

            <div className="space-y-2">
              <p className="text-sm font-bold tracking-tight">Valor anterior vs. valor nuevo</p>
              {campos.length === 0 && (
                <p className="rounded-xl border border-dashed p-4 text-center text-xs text-muted-foreground">
                  Este evento no tiene comparación de campos.
                </p>
              )}
              {campos.map((campo) => {
                const antes = registro.old_values?.[campo];
                const despues = registro.new_values?.[campo];
                return (
                  <div key={campo} className="rounded-xl border bg-card p-3">
                    <p className="text-xs font-semibold text-brand">{etiquetaCampo(campo)}</p>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      <div className="rounded-lg bg-destructive/8 p-2">
                        <p className="text-[11px] text-muted-foreground">Antes</p>
                        <pre className="whitespace-pre-wrap break-words text-xs">
                          {valorLegible(antes)}
                        </pre>
                      </div>
                      <div className="rounded-lg bg-success/10 p-2">
                        <p className="text-[11px] text-muted-foreground">Después</p>
                        <pre className="whitespace-pre-wrap break-words text-xs">
                          {valorLegible(despues)}
                        </pre>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
