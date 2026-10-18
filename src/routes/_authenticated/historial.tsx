import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BarChart3, Search, X } from "lucide-react";

import { Paginacion } from "@/components/pos/Paginacion";


import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEsAdmin, usePedidos, usePerfil } from "@/lib/data";
import { etiquetaMetodoPago, money, renderTicket, totalesPorMetodo, type Pedido } from "@/lib/pos";

export const Route = createFileRoute("/_authenticated/historial")({
  head: () => ({
    meta: [
      { title: "Historial de pedidos — La Cocina de Oriente POS" },
      {
        name: "description",
        content: "Consulta pedidos por fecha y estado, y revisa el detalle completo de cada ticket.",
      },
      { property: "og:title", content: "Historial de pedidos — La Cocina de Oriente" },
      { property: "og:description", content: "Ventas pagadas, pendientes y canceladas del negocio." },
    ],
  }),
  component: Historial,
});

function mismoDia(a: Date, b: Date) {
  return a.toDateString() === b.toDateString();
}

function Historial() {
  const { data: pedidos = [], isLoading } = usePedidos();
  const { data: perfil } = usePerfil();
  const [fecha, setFecha] = useState<"hoy" | "ayer" | "personalizado">("hoy");
  const [personalizada, setPersonalizada] = useState("");
  const [estado, setEstado] = useState("todos");
  const [busqueda, setBusqueda] = useState("");
  const [detalle, setDetalle] = useState<Pedido | null>(null);
  const [resumenAbierto, setResumenAbierto] = useState(false);
  const { esAdmin } = useEsAdmin();
  const [pagina, setPagina] = useState(1);

  useEffect(() => {
    setPagina(1);
  }, [fecha, personalizada, estado, busqueda]);

  const hoy = new Date();
  const ayer = new Date(Date.now() - 86400000);

  const filtrados = pedidos.filter((p) => {
    const creado = new Date(p.fecha_creacion);
    const okFecha =
      fecha === "hoy"
        ? mismoDia(creado, hoy)
        : fecha === "ayer"
          ? mismoDia(creado, ayer)
          : !personalizada || mismoDia(creado, new Date(`${personalizada}T12:00:00`));
    const okEstado = estado === "todos" || p.estado === estado;
    const q = busqueda.trim().toLowerCase();
    const okBusqueda =
      !q ||
      p.numero_ticket.toLowerCase().includes(q) ||
      (p.mesa ?? "").toLowerCase().includes(q) ||
      (p.items ?? []).some((i) => i.nombre.toLowerCase().includes(q));
    return okFecha && okEstado && okBusqueda;
  });

  const cobrado = totalesPorMetodo(filtrados);
  const POR_PAGINA = 12;
  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA));
  const paginaActual = Math.min(pagina, totalPaginas);
  const visibles = filtrados.slice((paginaActual - 1) * POR_PAGINA, paginaActual * POR_PAGINA);


  const textoTicket = detalle
    ? renderTicket(
        {
          numeroTicket: detalle.numero_ticket,
          tipo: detalle.tipo,
          mesa: detalle.mesa,
          items: detalle.items ?? [],
          total: Number(detalle.total),
          fecha: new Date(detalle.fecha_creacion),
          cajera: perfil?.nombre ?? "—",
          metodoPago: detalle.metodo_pago ?? "efectivo",
        },
        "cliente",
      )
    : "";

  return (
    <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-start">
      <section className="space-y-4">
        <div className="grid min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <div className="min-w-0">
            <h1 className="truncate text-xl font-extrabold tracking-tight sm:text-2xl">
              Historial de Pedidos
            </h1>
            <p className="text-xs text-muted-foreground">
              {filtrados.length} resultado(s) · Efectivo {money(cobrado.efectivo)} · Transferencia{" "}
              {money(cobrado.transferencia)}
            </p>
          </div>
          {esAdmin && (
            <Button className="h-11 w-full sm:w-auto" onClick={() => setResumenAbierto(true)}>
              <BarChart3 className="mr-2 h-4 w-4" />
              Resumen de ventas
            </Button>
          )}
        </div>

        <div className="grid gap-2 rounded-xl border bg-card p-3 shadow-soft sm:grid-cols-2 lg:grid-cols-4">
          <Select value={fecha} onValueChange={(v) => setFecha(v as typeof fecha)}>
            <SelectTrigger aria-label="Filtrar por fecha">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hoy">Hoy</SelectItem>
              <SelectItem value="ayer">Ayer</SelectItem>
              <SelectItem value="personalizado">Personalizado</SelectItem>
            </SelectContent>
          </Select>

          {fecha === "personalizado" ? (
            <Input
              type="date"
              value={personalizada}
              onChange={(e) => setPersonalizada(e.target.value)}
              aria-label="Fecha personalizada"
            />
          ) : (
            <div className="hidden sm:block" />
          )}

          <Select value={estado} onValueChange={setEstado}>
            <SelectTrigger aria-label="Filtrar por estado">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="pagado">Pagado</SelectItem>
              <SelectItem value="pendiente">Pendiente</SelectItem>
              <SelectItem value="enviado">En cocina</SelectItem>
              <SelectItem value="cancelado">Cancelado</SelectItem>
            </SelectContent>
          </Select>

          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar ticket o producto…"
              className="pl-9"
              aria-label="Buscar en historial"
            />
          </div>
        </div>

        <div className="space-y-3 md:hidden">
          {visibles.map((p) => (
            <article key={p.id} className="space-y-3 rounded-xl border bg-card p-3 shadow-soft">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
                <div className="min-w-0">
                  <p className="truncate font-mono text-[11px] font-semibold text-brand">
                    {p.numero_ticket}
                  </p>
                  <p className="truncate text-sm font-semibold">
                    {p.tipo === "comedor" ? `Comedor · Mesa ${p.mesa ?? "—"}` : "Para llevar"}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                    p.estado === "pagado"
                      ? "bg-success/12 text-success"
                      : p.estado === "cancelado"
                        ? "bg-destructive/12 text-destructive"
                        : "bg-flame/15 text-flame"
                  }`}
                >
                  {p.estado === "enviado" ? "En cocina" : p.estado}
                </span>
              </div>
              <dl className="grid grid-cols-2 gap-2 text-xs">
                <div className="min-w-0">
                  <dt className="text-muted-foreground">Hora</dt>
                  <dd className="font-medium">
                    {new Date(p.fecha_creacion).toLocaleTimeString("es-SV", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-muted-foreground">Pago</dt>
                  <dd className="font-medium">
                    {p.estado === "pagado" ? etiquetaMetodoPago(p.metodo_pago ?? "efectivo") : "—"}
                  </dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-muted-foreground">Total</dt>
                  <dd className="font-bold tabular-nums text-brand">{money(Number(p.total))}</dd>
                </div>
              </dl>
              <Button variant="outline" className="h-11 w-full" onClick={() => setDetalle(p)}>
                Ver Detalle
              </Button>
            </article>
          ))}
          {!filtrados.length && (
            <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
              {isLoading ? "Cargando historial…" : "No hay pedidos con estos filtros."}
            </p>
          )}
        </div>

        <div className="hidden overflow-hidden rounded-xl border bg-card shadow-soft md:block">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-secondary text-left text-xs uppercase tracking-wide text-brand">
                <tr>
                  <th className="px-4 py-3">Ticket</th>
                  <th className="px-4 py-3">Tipo / Mesa</th>
                  <th className="px-4 py-3">Hora</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Pago</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {visibles.map((p) => (
                  <tr key={p.id} className="hover:bg-secondary/50">
                    <td className="px-4 py-3 font-mono text-xs font-semibold">{p.numero_ticket}</td>
                    <td className="px-4 py-3">
                      {p.tipo === "comedor" ? `Comedor · Mesa ${p.mesa ?? "—"}` : "Para llevar"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(p.fecha_creacion).toLocaleTimeString("es-SV", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                          p.estado === "pagado"
                            ? "bg-success/12 text-success"
                            : p.estado === "cancelado"
                              ? "bg-destructive/12 text-destructive"
                              : "bg-flame/15 text-flame"
                        }`}
                      >
                        {p.estado === "enviado" ? "En cocina" : p.estado}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {p.estado === "pagado" ? etiquetaMetodoPago(p.metodo_pago ?? "efectivo") : "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums">
                      {money(Number(p.total))}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button size="sm" variant="outline" className="h-9" onClick={() => setDetalle(p)}>
                        Ver Detalle
                      </Button>
                    </td>
                  </tr>
                ))}
                {!filtrados.length && (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                      {isLoading ? "Cargando historial…" : "No hay pedidos con estos filtros."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <Paginacion
          pagina={paginaActual}
          totalPaginas={totalPaginas}
          totalFilas={filtrados.length}
          onCambiar={setPagina}
        />
      </section>

      {detalle && (
        <aside className="fixed inset-x-0 bottom-0 z-50 max-h-[80vh] overflow-y-auto rounded-t-2xl border bg-card p-4 shadow-lifted xl:static xl:z-auto xl:max-h-none xl:rounded-xl xl:shadow-soft">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
            <h2 className="truncate text-base font-bold tracking-tight">Detalle del pedido</h2>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              aria-label="Cerrar detalle"
              onClick={() => setDetalle(null)}
            >
              <X />
            </Button>
          </div>
          <div className="mt-3 rounded-lg border border-dashed p-3">
            <pre className="ticket-paper">{textoTicket}</pre>
          </div>
          
                  </aside>
      )}

      
    </div>
  );
}
