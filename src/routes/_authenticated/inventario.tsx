import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CalendarClock, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InsumoDialog } from "@/components/pos/InsumoDialog";
import { Paginacion } from "@/components/pos/Paginacion";
import { supabase } from "@/integrations/supabase/client";
import { useInsumos } from "@/lib/data";
import { diasParaVencer, type Insumo } from "@/lib/pos";

export const Route = createFileRoute("/_authenticated/inventario")({
  head: () => ({
    meta: [
      { title: "Inventario de materia prima — La Cocina de Oriente POS" },
      {
        name: "description",
        content: "Control de insumos de cocina con stock actual, stock mínimo y alertas de faltantes.",
      },
      { property: "og:title", content: "Inventario — La Cocina de Oriente" },
      { property: "og:description", content: "Insumos, unidades y alertas de stock bajo." },
    ],
  }),
  component: Inventario,
});

const CHIPS = [
  "Todos",
  "Granos",
  "Lácteos",
  "Verduras",
  "Carnes",
  "Bebidas",
  "Empaques",
  "Aceites",
] as const;

function Inventario() {
  const queryClient = useQueryClient();
  const { data: insumos = [], isLoading } = useInsumos();
  const [dialogo, setDialogo] = useState(false);
  const [editando, setEditando] = useState<Insumo | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [chip, setChip] = useState<(typeof CHIPS)[number]>("Todos");

  const bajos = insumos.filter((i) => Number(i.stock_actual) < Number(i.stock_minimo));
  const porVencer = insumos.filter((i) => {
    const d = diasParaVencer(i.fecha_vencimiento);
    return d !== null && d <= 7;
  });

  const filtrados = insumos.filter((i) => {
    const q = busqueda.trim().toLowerCase();
    const okBusqueda =
      !q || i.nombre.toLowerCase().includes(q) || i.codigo.toLowerCase().includes(q);
    const okChip = chip === "Todos" || i.categoria.toLowerCase() === chip.toLowerCase();
    return okBusqueda && okChip;
  });

  const POR_PAGINA = 12;
  const [pagina, setPagina] = useState(1);
  useEffect(() => {
    setPagina(1);
  }, [busqueda, chip]);
  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA));
  const paginaActual = Math.min(pagina, totalPaginas);
  const visibles = filtrados.slice((paginaActual - 1) * POR_PAGINA, paginaActual * POR_PAGINA);

  const siguienteCodigo = useMemo(() => {
    const nums = insumos
      .map((i) => Number(i.codigo.replace(/\D/g, "")))
      .filter((n) => Number.isFinite(n));
    const next = (nums.length ? Math.max(...nums) : 0) + 1;
    return `INS-${String(next).padStart(3, "0")}`;
  }, [insumos]);

  async function eliminar(insumo: Insumo) {
    const { error } = await supabase.from("materia_prima").delete().eq("id", insumo.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`${insumo.nombre} eliminado`);
    await queryClient.invalidateQueries({ queryKey: ["materia_prima"] });
  }

  return (
    <div className="min-w-0 space-y-4">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 sm:flex sm:justify-between">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-extrabold tracking-tight sm:text-2xl">Inventario</h1>
          <p className="text-xs text-muted-foreground">Materia prima de la cocina</p>
        </div>
        <Button
          variant="flame"
          className="h-11 shrink-0"
          onClick={() => {
            setEditando(null);
            setDialogo(true);
          }}
        >
          <Plus /> <span className="hidden sm:inline">Agregar Nuevo Insumo</span>
          <span className="sm:hidden">Insumo</span>
        </Button>
      </div>

      {bajos.length > 0 && (
        <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p className="min-w-0">
            <span className="font-semibold">{bajos.length} insumo(s) bajo el mínimo:</span>{" "}
            {bajos.map((b) => b.nombre).join(", ")}. Realiza el pedido al proveedor.
          </p>
        </div>
      )}

      {porVencer.length > 0 && (
        <div className="flex items-start gap-2 rounded-xl border border-flame/40 bg-flame/10 p-3 text-sm text-flame">
          <CalendarClock className="mt-0.5 h-4 w-4 shrink-0" />
          <p className="min-w-0">
            <span className="font-semibold">{porVencer.length} insumo(s) por vencer o vencidos:</span>{" "}
            {porVencer
              .map((i) => {
                const d = diasParaVencer(i.fecha_vencimiento) ?? 0;
                return `${i.nombre} (${d < 0 ? `vencido hace ${Math.abs(d)} día(s)` : d === 0 ? "vence hoy" : `en ${d} día(s)`})`;
              })
              .join(", ")}
            .
          </p>
        </div>
      )}

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar insumo o código…"
          className="h-11 pl-9"
          aria-label="Buscar insumo o código"
        />
      </div>

      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {CHIPS.map((c) => (
          <button
            key={c}
            onClick={() => setChip(c)}
            className={`shrink-0 rounded-full border px-3.5 py-2 text-xs font-semibold transition-colors ${
              chip === c
                ? "border-flame bg-flame text-flame-foreground"
                : "border-border bg-card text-muted-foreground hover:text-foreground"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Lista de tarjetas en mobile */}
      <div className="space-y-3 md:hidden">
        {visibles.map((i) => {
          const bajo = Number(i.stock_actual) < Number(i.stock_minimo);
          return (
            <article key={i.id} className="space-y-3 rounded-xl border bg-card p-3 shadow-soft">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
                <div className="min-w-0">
                  <p className="font-mono text-[11px] font-semibold text-brand">{i.codigo}</p>
                  <p className="truncate text-sm font-semibold">{i.nombre}</p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                    bajo ? "bg-destructive/12 text-destructive" : "bg-success/12 text-success"
                  }`}
                >
                  {bajo ? "Stock Bajo" : "Suficiente"}
                </span>
              </div>
              <dl className="grid grid-cols-2 gap-2 text-xs">
                <div className="min-w-0">
                  <dt className="text-muted-foreground">Categoría</dt>
                  <dd className="truncate font-medium">{i.categoria}</dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-muted-foreground">Unidad</dt>
                  <dd className="truncate font-medium">{i.unidad}</dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-muted-foreground">Stock actual</dt>
                  <dd className="font-medium tabular-nums">{Number(i.stock_actual)}</dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-muted-foreground">Stock mínimo</dt>
                  <dd className="font-medium tabular-nums">{Number(i.stock_minimo)}</dd>
                </div>
                <div className="col-span-2 min-w-0">
                  <dt className="text-muted-foreground">Vence</dt>
                  <dd className="font-medium">{i.fecha_vencimiento ?? "—"}</dd>
                </div>
              </dl>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  className="h-11"
                  onClick={() => {
                    setEditando(i);
                    setDialogo(true);
                  }}
                >
                  <Pencil /> Editar
                </Button>
                <Button variant="outline" className="h-11 text-destructive" onClick={() => eliminar(i)}>
                  <Trash2 /> Eliminar
                </Button>
              </div>
            </article>
          );
        })}
        {!filtrados.length && (
          <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            {isLoading ? "Cargando insumos…" : "No hay insumos con estos filtros."}
          </p>
        )}
      </div>

      {/* Tabla en tablet y desktop */}
      <div className="hidden overflow-hidden rounded-xl border bg-card shadow-soft md:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] text-sm">
            <thead className="bg-secondary text-left text-xs uppercase tracking-wide text-brand">
              <tr>
                <th className="px-4 py-3">Código</th>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Categoría</th>
                <th className="px-4 py-3 text-right">Stock actual</th>
                <th className="px-4 py-3 text-right">Stock mínimo</th>
                <th className="px-4 py-3">Unidad</th>
                <th className="px-4 py-3">Vence</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {visibles.map((i) => {
                const bajo = Number(i.stock_actual) < Number(i.stock_minimo);
                return (
                  <tr key={i.id} className="hover:bg-secondary/50">
                    <td className="px-4 py-3 font-mono text-xs font-semibold">{i.codigo}</td>
                    <td className="px-4 py-3 font-medium">{i.nombre}</td>
                    <td className="px-4 py-3 text-muted-foreground">{i.categoria}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{Number(i.stock_actual)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{Number(i.stock_minimo)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{i.unidad}</td>
                    <td className="px-4 py-3">
                      {(() => {
                        const d = diasParaVencer(i.fecha_vencimiento);
                        if (d === null) return <span className="text-muted-foreground">—</span>;
                        return (
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                              d < 0
                                ? "bg-destructive/12 text-destructive"
                                : d <= 7
                                  ? "bg-flame/12 text-flame"
                                  : "bg-secondary text-muted-foreground"
                            }`}
                          >
                            {i.fecha_vencimiento}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                          bajo
                            ? "bg-destructive/12 text-destructive"
                            : "bg-success/12 text-success"
                        }`}
                      >
                        {bajo ? "Stock Bajo" : "Suficiente"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-9 w-9"
                          aria-label={`Editar ${i.nombre}`}
                          onClick={() => {
                            setEditando(i);
                            setDialogo(true);
                          }}
                        >
                          <Pencil />
                        </Button>
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-9 w-9 text-destructive"
                          aria-label={`Eliminar ${i.nombre}`}
                          onClick={() => eliminar(i)}
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!filtrados.length && (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-muted-foreground">
                    {isLoading ? "Cargando insumos…" : "No hay insumos con estos filtros."}
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

      <InsumoDialog
        insumo={editando}
        open={dialogo}
        onOpenChange={setDialogo}
        siguienteCodigo={siguienteCodigo}
      />
    </div>
  );
}
