import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { usePedidos } from "@/lib/data";
import { money, type Pedido } from "@/lib/pos";

export const Route = createFileRoute("/_authenticated/pedido-activos")({
  head: () => ({
    meta: [
      {
        title: "Pedidos activos — La Cocina de Oriente POS",
      },
      {
        name: "description",
        content:
          "Pedidos pendientes y enviados a cocina, listos para gestionar.",
      },
      {
        property: "og:title",
        content: "Pedidos activos — La Cocina de Oriente",
      },
      {
        property: "og:description",
        content: "Comandas en curso del comedor y para llevar.",
      },
    ],
  }),
  component: PedidosActivos,
});

function PedidosActivos() {
  const queryClient = useQueryClient();

  const { data: pedidos = [], isLoading } = usePedidos();

  const [aEliminar, setAEliminar] = useState<Pedido | null>(null);
  const [eliminando, setEliminando] = useState(false);

  async function eliminarPedido() {
    if (!aEliminar) return;

    setEliminando(true);

    try {
      const { error } = await supabase
        .from("pedidos")
        .delete()
        .eq("id", aEliminar.id);

      if (error) throw error;

      await queryClient.invalidateQueries({
        queryKey: ["pedidos"],
      });

      toast.success("Pedido eliminado");

      setAEliminar(null);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "No se pudo eliminar el pedido",
      );
    } finally {
      setEliminando(false);
    }
  }

  const activos = pedidos.filter(
    (p) => p.estado !== "pagado" && p.estado !== "cancelado",
  );

  return (
    <div className="min-w-0 space-y-4">
      {/* Encabezado */}
      <div className="min-w-0">
        <h1 className="truncate text-xl font-extrabold tracking-tight sm:text-2xl">
          Pedidos Activos
        </h1>

        <p className="text-xs text-muted-foreground">
          {activos.length} pedido(s) en curso
        </p>
      </div>

      {/* Lista de pedidos */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {activos.map((pedido) => (
          <article
            key={pedido.id}
            className="space-y-3 rounded-xl border bg-card p-4 shadow-soft"
          >
            {/* Información del pedido */}
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
              <div className="min-w-0">
                <p className="truncate font-mono text-xs font-semibold text-brand">
                  {pedido.numero_ticket}
                </p>

                <p className="truncate text-sm font-semibold">
                  {pedido.tipo === "comedor"
                    ? `Comedor · Mesa ${pedido.mesa ?? "—"}`
                    : "Para llevar"}
                </p>

                <p className="text-xs text-muted-foreground">
                  {new Date(pedido.fecha_creacion).toLocaleTimeString(
                    "es-SV",
                    {
                      hour: "2-digit",
                      minute: "2-digit",
                    },
                  )}{" "}
                  · {(pedido.items ?? []).length} línea(s)
                </p>
              </div>

              {/* Estado */}
              <span
                className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                  pedido.estado === "enviado"
                    ? "bg-flame/15 text-flame"
                    : "bg-secondary text-brand"
                }`}
              >
                {pedido.estado === "enviado" ? "En cocina" : "Pendiente"}
              </span>
            </div>

            {/* Total */}
            <p className="text-lg font-extrabold text-brand tabular-nums">
              {money(Number(pedido.total))}
            </p>

            {/* Único botón */}
            <div className="grid gap-2">
              <Button
                variant="outline"
                className="h-11 w-full border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => setAEliminar(pedido)}
              >
                <Trash2 />
                Eliminar Pedido
              </Button>
            </div>
          </article>
        ))}

        {/* Sin pedidos */}
        {!activos.length && (
          <p className="col-span-full rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
            {isLoading
              ? "Cargando pedidos…"
              : "No hay pedidos activos en este momento."}
          </p>
        )}
      </div>

      {/* Confirmación para eliminar */}
      <AlertDialog
        open={aEliminar !== null}
        onOpenChange={(o) => !o && setAEliminar(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              ¿Eliminar este pedido?
            </AlertDialogTitle>

            <AlertDialogDescription>
              El pedido {aEliminar?.numero_ticket} se borrará por completo y
              también dejará de aparecer en el historial. Esta acción no se
              puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={eliminando}>
              Cancelar
            </AlertDialogCancel>

            <AlertDialogAction
              disabled={eliminando}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                void eliminarPedido();
              }}
            >
              {eliminando ? "Eliminando…" : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}