import { useEffect, useMemo, useState } from "react";

import { Paginacion } from "@/components/pos/Paginacion";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { money, type Pedido } from "@/lib/pos";

type Props = {
  abierto: boolean;
  onOpenChange: (v: boolean) => void;
  pedidos: Pedido[];
};

type Fila = {
  fecha: string;
  pagados: number;
  cancelados: number;
  items: number;
  total: number;
};

const MESES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

const POR_PAGINA = 10;

function resumir(pedidos: Pedido[]): Fila[] {
  const mapa = new Map<string, Fila>();
  for (const p of pedidos) {
    const d = new Date(p.fecha_creacion);
    const fecha = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate(),
    ).padStart(2, "0")}`;
    const fila = mapa.get(fecha) ?? { fecha, pagados: 0, cancelados: 0, items: 0, total: 0 };
    if (p.estado === "pagado") {
      fila.pagados += 1;
      fila.total += Number(p.total);
      fila.items += (p.items ?? []).reduce((s, i) => s + i.cantidad, 0);
    } else if (p.estado === "cancelado") {
      fila.cancelados += 1;
    }
    mapa.set(fecha, fila);
  }
  return [...mapa.values()].sort((a, b) => (a.fecha < b.fecha ? 1 : -1));
}

export function ResumenVentasDialog({ abierto, onOpenChange, pedidos }: Props) {
  const [anio, setAnio] = useState("todos");
  const [mes, setMes] = useState("todos");
  const [pagina, setPagina] = useState(1);

  const anios = useMemo(() => {
    const set = new Set<number>();
    for (const p of pedidos) set.add(new Date(p.fecha_creacion).getFullYear());
    return [...set].sort((a, b) => b - a);
  }, [pedidos]);

  const filas = useMemo(() => {
    const filtrados = pedidos.filter((p) => {
      const d = new Date(p.fecha_creacion);
      const okAnio = anio === "todos" || d.getFullYear() === Number(anio);
      const okMes = mes === "todos" || d.getMonth() + 1 === Number(mes);
      return okAnio && okMes;
    });
    return resumir(filtrados);
  }, [pedidos, anio, mes]);

  const totalGeneral = filas.reduce((s, f) => s + f.total, 0);
  const ticketsGeneral = filas.reduce((s, f) => s + f.pagados, 0);

  const totalPaginas = Math.max(1, Math.ceil(filas.length / POR_PAGINA));

  useEffect(() => {
    setPagina(1);
  }, [anio, mes, abierto]);

  const paginaActual = Math.min(pagina, totalPaginas);
  const visibles = filas.slice((paginaActual - 1) * POR_PAGINA, paginaActual * POR_PAGINA);

  return (
    <Dialog open={abierto} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-2xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b p-4 text-left">
          <DialogTitle>Resumen de ventas por fecha</DialogTitle>
          <DialogDescription>
            Ventas pagadas agrupadas por día, según los pedidos registrados.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <div className="grid gap-2 sm:grid-cols-2">
            <Select value={mes} onValueChange={setMes}>
              <SelectTrigger className="h-11" aria-label="Filtrar por mes">
                <SelectValue placeholder="Mes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los meses</SelectItem>
                {MESES.map((m, i) => (
                  <SelectItem key={m} value={String(i + 1)}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={anio} onValueChange={setAnio}>
              <SelectTrigger className="h-11" aria-label="Filtrar por año">
                <SelectValue placeholder="Año" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los años</SelectItem>
                {anios.map((a) => (
                  <SelectItem key={a} value={String(a)}>
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="rounded-xl border bg-secondary/50 p-3">
              <p className="text-xs text-muted-foreground">Tickets pagados</p>
              <p className="text-xl font-extrabold tabular-nums">{ticketsGeneral}</p>
            </div>
            <div className="rounded-xl border bg-secondary/50 p-3">
              <p className="text-xs text-muted-foreground">Total vendido</p>
              <p className="text-xl font-extrabold tabular-nums text-brand">
                {money(totalGeneral)}
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-3 md:hidden">
            {visibles.map((f) => (
              <article key={f.fecha} className="rounded-xl border p-3">
                <p className="font-semibold">{f.fecha}</p>
                <dl className="mt-2 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <dt className="text-muted-foreground">Pagados</dt>
                    <dd className="font-medium tabular-nums">{f.pagados}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Cancelados</dt>
                    <dd className="font-medium tabular-nums">{f.cancelados}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Ítems</dt>
                    <dd className="font-medium tabular-nums">{f.items}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Total</dt>
                    <dd className="font-bold tabular-nums text-brand">{money(f.total)}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>

          <div className="mt-4 hidden overflow-hidden rounded-xl border md:block">
            <table className="w-full text-sm">
              <thead className="bg-secondary text-left text-xs uppercase tracking-wide text-brand">
                <tr>
                  <th className="px-3 py-2">Fecha</th>
                  <th className="px-3 py-2 text-right">Pagados</th>
                  <th className="px-3 py-2 text-right">Cancelados</th>
                  <th className="px-3 py-2 text-right">Ítems</th>
                  <th className="px-3 py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {visibles.map((f) => (
                  <tr key={f.fecha}>
                    <td className="px-3 py-2 font-medium">{f.fecha}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{f.pagados}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{f.cancelados}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{f.items}</td>
                    <td className="px-3 py-2 text-right font-semibold tabular-nums text-brand">
                      {money(f.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filas.length > 0 && (
            <div className="mt-3">
              <Paginacion
                pagina={paginaActual}
                totalPaginas={totalPaginas}
                totalFilas={filas.length}
                onCambiar={setPagina}
              />
            </div>
          )}

          {!filas.length && (
            <p className="mt-4 rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
              Aún no hay ventas registradas.
            </p>
          )}
        </div>

        <div className="sticky bottom-0 border-t bg-card p-4">
          <Button className="h-11 w-full" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
