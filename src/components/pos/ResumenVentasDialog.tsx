import { useEffect, useMemo, useState } from "react";
import { FileDown, FileSpreadsheet, LoaderCircle } from "lucide-react";

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
import { coincidePeriodo, etiquetaSemana, fechaVenta, semanaVenta } from "@/lib/venta-sem";
import { entregarArchivo } from "@/lib/descargas";
import { type FilaVentas } from "@/lib/ventas-export";

type Props = {
  abierto: boolean;
  onOpenChange: (v: boolean) => void;
  pedidos: Pedido[];
};

type Fila = FilaVentas;

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
    const fecha = fechaVenta(p.fecha_creacion);
    const fila = mapa.get(fecha) ?? { fecha, pagados: 0, cancelados: 0, items: 0, total: 0, efectivo: 0, transferencia: 0 };
    if (p.estado === "pagado") {
      fila.pagados += 1;
      fila.total += Number(p.total);
      if (p.metodo_pago === "transferencia") fila.transferencia += Number(p.total);
      else fila.efectivo += Number(p.total);
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
  const [semana, setSemana] = useState("todos");
  const [pagina, setPagina] = useState(1);
  const [archivos, setArchivos] = useState<{ filas: Fila[]; periodo: string; pdf: Blob; excel: Blob } | null>(null);
  const [errorExportacion, setErrorExportacion] = useState("");
  const [reintento, setReintento] = useState(0);

  const anios = useMemo(() => {
    const set = new Set<number>();
    for (const p of pedidos) set.add(new Date(p.fecha_creacion).getFullYear());
    return [...set].sort((a, b) => b - a);
  }, [pedidos]);

  const semanas = useMemo(() => [...new Set(pedidos
    .filter((p) => coincidePeriodo(p.fecha_creacion, anio, mes))
    .map((p) => semanaVenta(p.fecha_creacion)))].sort().reverse(), [pedidos, anio, mes]);

  const filas = useMemo(() => {
    const filtrados = pedidos.filter((p) => coincidePeriodo(p.fecha_creacion, anio, mes, semana));  
    return resumir(filtrados);
  }, [pedidos, anio, mes, semana]);

  const periodo = `${anio}_${mes}_${semana}`;
  const listo = abierto && archivos?.filas === filas && archivos.periodo === periodo;

    useEffect(() => {
    let cancelado = false;
    setArchivos(null);
    setErrorExportacion("");
    if (!abierto || !filas.length) return;
    async function preparar() {
      try {
        const { generarPdfVentas, generarExcelVentas } = await import("@/lib/ventas-export");
        const filtros = { anio, mes, semana };
        const [pdf, excel] = await Promise.all([generarPdfVentas(filas, filtros), generarExcelVentas(filas, filtros)]);
        if (!cancelado) setArchivos({ filas, periodo, pdf, excel });
      } catch {
        if (!cancelado) setErrorExportacion("No se pudieron preparar los reportes. Intenta nuevamente.");
      }
    }
    void preparar();
    return () => { cancelado = true; };
  }, [abierto, filas, anio, mes, semana, periodo, reintento]);

  function descargar(formato: "pdf" | "excel") {
    if (!listo || !archivos) return;
    const extension = formato === "pdf" ? "pdf" : "xlsx";
    void entregarArchivo(archivos[formato], `Resumen_ventas_${periodo}.${extension}`)
      .catch(() => setErrorExportacion("No se pudo descargar el reporte. Intenta nuevamente."));
  }

  const totalGeneral = filas.reduce((s, f) => s + f.total, 0);
  const ticketsGeneral = filas.reduce((s, f) => s + f.pagados, 0);
  const efectivoGeneral = filas.reduce((s, f) => s + f.efectivo, 0);
  const transferenciaGeneral = filas.reduce((s, f) => s + f.transferencia, 0);

  const totalPaginas = Math.max(1, Math.ceil(filas.length / POR_PAGINA));

  useEffect(() => {
    setPagina(1);
  }, [anio, mes, semana, abierto]);

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
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Button variant="outline" className="h-11 flex-1 sm:flex-none" disabled={!listo} onClick={() => descargar("pdf")} title="Descargar reporte en PDF">
              <FileDown className="mr-2 h-4 w-4" aria-hidden="true" /> PDF
            </Button>
            <Button variant="outline" className="h-11 flex-1 sm:flex-none" disabled={!listo} onClick={() => descargar("excel")} title="Descargar reporte en Excel">
              <FileSpreadsheet className="mr-2 h-4 w-4" aria-hidden="true" /> Excel
            </Button>
            {filas.length > 0 && !listo && !errorExportacion && (
              <span role="status" className="flex items-center gap-2 text-xs text-muted-foreground"><LoaderCircle className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> Preparando reportes…</span>
            )}
          </div>
          {errorExportacion && <div role="alert" className="mb-3 text-sm text-destructive">{errorExportacion} <Button variant="link" className="h-11" onClick={() => setReintento((valor) => valor + 1)}>Reintentar</Button></div>}
          <div className="grid gap-2 sm:grid-cols-2">
            <Select value={mes} onValueChange={(value) => { setMes(value); setSemana("todos"); }}>
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
            <Select value={anio} onValueChange={(value) => { setAnio(value); setSemana("todos"); }}>
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
            <Select value={semana} onValueChange={setSemana}>
              <SelectTrigger className="h-11 sm:col-span-2" aria-label="Filtrar por semana">
                <SelectValue placeholder="Semana" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas las semanas</SelectItem>
                {semanas.map((s) => <SelectItem key={s} value={s}>{etiquetaSemana(s)}</SelectItem>)}
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
             <div className="rounded-xl border bg-secondary/50 p-3">
              <p className="text-xs text-muted-foreground">Efectivo</p>
              <p className="text-lg font-extrabold tabular-nums">{money(efectivoGeneral)}</p>
            </div>
            <div className="rounded-xl border bg-secondary/50 p-3">
              <p className="text-xs text-muted-foreground">Transferencia</p>
              <p className="text-lg font-extrabold tabular-nums">{money(transferenciaGeneral)}</p>
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
                    <dt className="text-muted-foreground">Efectivo</dt>
                    <dd className="font-medium tabular-nums">{money(f.efectivo)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Transferencia</dt>
                    <dd className="font-medium tabular-nums">{money(f.transferencia)}</dd>
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
                  <th className="px-3 py-2 text-right">Efectivo</th>
                  <th className="px-3 py-2 text-right">Transf.</th>
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
                    <td className="px-3 py-2 text-right tabular-nums">{money(f.efectivo)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{money(f.transferencia)}</td>
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
