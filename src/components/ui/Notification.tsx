
import { useState } from "react";
import {
  Bell,
  X,
  Package,
  CalendarClock,
  CheckCircle2,
} from "lucide-react";

import { useInsumos } from "@/lib/data";
import { diasParaVencer } from "@/lib/pos";

export type Notificacion = {
  id: string;
  tipo: "inventario" | "vencimiento";
  producto: string;
  mensaje: string;
};

export default function Notification() {
  const [abierto, setAbierto] = useState(false);
  const { data: insumos = [], isLoading, isError } = useInsumos();

  // Detectar insumos por debajo del stock mínimo.
  const alertasStock: Notificacion[] = insumos
    .filter(
      (i) => Number(i.stock_actual) < Number(i.stock_minimo)
    )
    .map((i) => ({
      id: `stock-${i.id}`,
      tipo: "inventario" as const,
      producto: i.nombre,
      mensaje: `Stock actual: ${Number(i.stock_actual)} ${i.unidad}. Stock mínimo: ${Number(i.stock_minimo)} ${i.unidad}.`,
    }));

  // Detectar insumos que vencen en 7 días o menos,
  // incluidos los que ya vencieron.
  const alertasVencimiento: Notificacion[] = insumos
    .filter((i) => {
      const dias = diasParaVencer(i.fecha_vencimiento);
      return dias !== null && dias <= 7;
    })
    .map((i) => {
      const dias = diasParaVencer(i.fecha_vencimiento) ?? 0;

      let mensaje: string;

      if (dias < 0) {
        mensaje = `Vencido hace ${Math.abs(dias)} día(s). Fecha de vencimiento: ${i.fecha_vencimiento}.`;
      } else if (dias === 0) {
        mensaje = `Vence hoy (${i.fecha_vencimiento}).`;
      } else {
        mensaje = `Vence en ${dias} día(s), el ${i.fecha_vencimiento}.`;
      }

      return {
        id: `vence-${i.id}`,
        tipo: "vencimiento" as const,
        producto: i.nombre,
        mensaje,
      };
    });

  const notificaciones: Notificacion[] = [
    ...alertasStock,
    ...alertasVencimiento,
  ];

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Abrir notificaciones"
        aria-expanded={abierto}
        onClick={() => setAbierto((actual) => !actual)}
        className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-brand-foreground transition-colors hover:bg-brand-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
      >
        <Bell className="h-5 w-5" />

        {notificaciones.length > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ring-2 ring-brand">
            {notificaciones.length > 99
              ? "99+"
              : notificaciones.length}
          </span>
        )}
      </button>

      {abierto && (
        <>
          <button
            type="button"
            aria-label="Cerrar notificaciones"
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setAbierto(false)}
          />

          <section
            aria-label="Panel de notificaciones"
            className="absolute right-0 top-12 z-50 w-80 max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-xl sm:w-96"
          >
            <header className="flex items-center justify-between border-b border-border p-4">
              <div>
                <h2 className="font-bold">Notificaciones</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {isLoading
                    ? "Cargando alertas..."
                    : `${notificaciones.length} alerta(s) pendiente(s)`}
                </p>
              </div>

              <button
                type="button"
                aria-label="Cerrar panel"
                onClick={() => setAbierto(false)}
                className="rounded-lg p-2 text-muted-foreground hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            <div className="max-h-96 overflow-y-auto">
              {isLoading ? (
                <p className="p-6 text-center text-sm text-muted-foreground">
                  Cargando información del inventario...
                </p>
              ) : isError ? (
                <p className="p-6 text-center text-sm text-destructive">
                  No se pudieron cargar las alertas. Intenta nuevamente.
                </p>
              ) : notificaciones.length === 0 ? (
                <div className="px-5 py-8 text-center">
                  <CheckCircle2 className="mx-auto mb-3 h-9 w-9 text-brand" />
                  <p className="text-sm font-semibold">
                    ¡Todo en orden!
                  </p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    No hay insumos con stock bajo ni productos
                    próximos a vencer.
                  </p>
                </div>
              ) : (
                notificaciones.map((notificacion) => (
                  <article
                    key={notificacion.id}
                    className="flex gap-3 border-b border-border p-4 last:border-b-0"
                  >
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                        notificacion.tipo === "inventario"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {notificacion.tipo === "inventario" ? (
                        <Package className="h-5 w-5" />
                      ) : (
                        <CalendarClock className="h-5 w-5" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">
                        {notificacion.producto}
                      </p>

                      <p className="mt-1 text-xs leading-5 text-muted-foreground">
                        {notificacion.mensaje}
                      </p>

                      <span
                        className={`mt-2 inline-block rounded-full px-2 py-1 text-[10px] font-semibold ${
                          notificacion.tipo === "inventario"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {notificacion.tipo === "inventario"
                          ? "Stock bajo"
                          : "Vencimiento"}
                      </span>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
