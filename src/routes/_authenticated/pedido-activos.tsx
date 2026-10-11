import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Pencil, Printer, Trash2, Wallet } from "lucide-react";
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
import { TicketPreviewDialog } from "@/components/pos/TicketPreviewDialog";
import { supabase } from "@/integrations/supabase/client";
import { imprimirTicket, usePedidos, usePerfil } from "@/lib/data";
import { money, renderTicket, type Pedido } from "@/lib/pos";

export const Route = createFileRoute("/_authenticated/pedido-activos")({
 head: () => ({
 meta: [
 { title: "Pedidos activos — La Cocina de Oriente POS" },
 {
 name: "description",
 content: "Pedidos pendientes y enviados a cocina, listos para imprimir comanda o cobrar en efectivo.",
 },
 { property: "og:title", content: "Pedidos activos — La Cocina de Oriente" },
 { property: "og:description", content: "Comandas en curso del comedor y para llevar." },
 ],
 }),
 component: PedidosActivos,
});

function PedidosActivos() {
 const queryClient = useQueryClient();
 const navigate = useNavigate();
 const { data: pedidos = [], isLoading } = usePedidos();
 const { data: perfil } = usePerfil();
 const [seleccion, setSeleccion] = useState<{ pedido: Pedido; accion: "cocina" | "pago" } | null>(null);
 const [procesando, setProcesando] = useState(false);
 const [aEliminar, setAEliminar] = useState<Pedido | null>(null);
 const [eliminando, setEliminando] = useState(false);

 async function eliminarPedido() {
 if (!aEliminar) return;
 setEliminando(true);
 try {
 const { error } = await supabase.from("pedidos").delete().eq("id", aEliminar.id);
 if (error) throw error;
 await queryClient.invalidateQueries({ queryKey: ["pedidos"] });
 toast.success("Pedido eliminado");
 setAEliminar(null);
 } catch (error) {
 toast.error(error instanceof Error ? error.message : "No se pudo eliminar el pedido");
 } finally {
 setEliminando(false);
 }
 }

 const activos = pedidos.filter((p) => p.estado !== "pagado" && p.estado !== "cancelado");

 function texto(pedido: Pedido, variante: "cocina" | "cliente") {
 return renderTicket(
 {
 numeroTicket: pedido.numero_ticket,
 tipo: pedido.tipo,
 mesa: pedido.mesa,
 items: pedido.items ?? [],
 total: Number(pedido.total),
 fecha: new Date(pedido.fecha_creacion),
 cajera: perfil?.nombre ?? "—",
 },
 variante,
 );
 }

 async function confirmar() {
 if (!seleccion) return;
 setProcesando(true);
 try {
 if (seleccion.accion === "cocina") {
 if (seleccion.pedido.estado === "pendiente") {
 const { error } = await supabase
 .from("pedidos")
 .update({ estado: "enviado" })
 .eq("id", seleccion.pedido.id);
 if (error) throw error;
 }
 imprimirTicket(texto(seleccion.pedido, "cocina"));
 toast.success("Comanda impresa");
 } else {
 const { error } = await supabase
 .from("pedidos")
 .update({ estado: "pagado", fecha_pago: new Date().toISOString() })
 .eq("id", seleccion.pedido.id);
 if (error) throw error;
 imprimirTicket(texto(seleccion.pedido, "cliente"));
 toast.success("Pago en efectivo registrado");
 }
 await queryClient.invalidateQueries({ queryKey: ["pedidos"] });
 setSeleccion(null);
 } catch (error) {
 toast.error(error instanceof Error ? error.message : "No se pudo completar la acción");
 } finally {
 setProcesando(false);
 }
 }

 return (
 <div className="min-w-0 space-y-4">
 <div className="min-w-0">
 <h1 className="truncate text-xl font-extrabold tracking-tight sm:text-2xl">Pedidos Activos</h1>
 <p className="text-xs text-muted-foreground">
 {activos.length} pedido(s) en curso · pago único en efectivo
 </p>
 </div>

 <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
 {activos.map((pedido) => (
 <article key={pedido.id} className="space-y-3 rounded-xl border bg-card p-4 shadow-soft">
 <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
 <div className="min-w-0">
 <p className="truncate font-mono text-xs font-semibold text-brand">
 {pedido.numero_ticket}
 </p>
 <p className="truncate text-sm font-semibold">
 {pedido.tipo === "comedor" ? `Comedor · Mesa ${pedido.mesa ?? "—"}` : "Para llevar"}
 </p>
 <p className="text-xs text-muted-foreground">
 {new Date(pedido.fecha_creacion).toLocaleTimeString("es-SV", {
 hour: "2-digit",
 minute: "2-digit",
 })}{" "}
 · {(pedido.items ?? []).length} línea(s)
 </p>
 </div>
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

 <p className="text-lg font-extrabold text-brand tabular-nums">{money(Number(pedido.total))}</p>

 <div className="grid gap-2 sm:grid-cols-2">
 <Button
 variant="outline"
 className="h-11"
 onClick={() => navigate({ to: "/pos", search: { pedido: pedido.id } })}
 >
 <Pencil /> Editar Pedido
 </Button>
 <Button
 variant="outline"
 className="h-11 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
 onClick={() => setAEliminar(pedido)}
 >
 <Trash2 /> Eliminar Pedido
 </Button>
 <Button
 variant="outline"
 className="h-11"
 onClick={() => setSeleccion({ pedido, accion: "cocina" })}
 disabled={!(pedido.items ?? []).length}
 >
 <Printer /> Imprimir Comanda
 </Button>
 <Button
 variant="flame"
 className="h-11"
 onClick={() => setSeleccion({ pedido, accion: "pago" })}
 disabled={!(pedido.items ?? []).length}
 >
 <Wallet /> Cobrar
 </Button>
 </div>
 </article>
 ))}
 {!activos.length && (
 <p className="col-span-full rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
 {isLoading ? "Cargando pedidos…" : "No hay pedidos activos en este momento."}
 </p>
 )}
 </div>

 <TicketPreviewDialog
 open={seleccion !== null}
 onOpenChange={(o) => !o && setSeleccion(null)}
 titulo={
 seleccion?.accion === "cocina" ? "Vista previa · Comanda" : "Vista previa · Ticket cliente"
 }
 descripcion={
 seleccion?.accion === "cocina"
 ? "Revisa la comanda antes de imprimirla en cocina."
 : "Revisa el ticket antes de confirmar el pago en efectivo."
 }
 texto={seleccion ? texto(seleccion.pedido, seleccion.accion === "cocina" ? "cocina" : "cliente") : ""}
 confirmLabel={seleccion?.accion === "cocina" ? "Imprimir en Cocina" : "Confirmar Pago"}
 onConfirm={confirmar}
 procesando={procesando}
 />

 <AlertDialog open={aEliminar !== null} onOpenChange={(o) => !o && setAEliminar(null)}>
 <AlertDialogContent>
 <AlertDialogHeader>
 <AlertDialogTitle>¿Eliminar este pedido?</AlertDialogTitle>
 <AlertDialogDescription>
 El pedido {aEliminar?.numero_ticket} se borrará por completo y también dejará de
 aparecer en el historial. Esta acción no se puede deshacer.
 </AlertDialogDescription>
 </AlertDialogHeader>
 <AlertDialogFooter>
 <AlertDialogCancel disabled={eliminando}>Cancelar</AlertDialogCancel>
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