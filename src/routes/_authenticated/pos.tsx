import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowRight, CupSoda, Minus, Pencil, Plus, Printer, Save, Search, Wallet, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BebidaDialog } from "@/components/pos/BebidaDialog";
import { ProductoDialog } from "@/components/pos/ProductoDialog";
import { TicketPreviewDialog } from "@/components/pos/TicketPreviewDialog";
import { supabase } from "@/integrations/supabase/client";
import { imprimirTicket, useBebidas, useEsAdmin, usePerfil, useProductos, useSesion } from "@/lib/data";
import {
  calcularTotales,
  money,
  nuevoNumeroTicket,
  renderTicket,
  type Bebida,
  type PedidoItem,
  type Producto,
} from "@/lib/pos";

export const Route = createFileRoute("/_authenticated/pos")({
  validateSearch: (search: Record<string, unknown>): { pedido?: string } =>
    typeof search['pedido'] === "string" ? { pedido: search['pedido'] as string } : {},
  head: () => ({
    meta: [
      { title: "Punto de Venta — La Cocina de Oriente POS" },
      {
        name: "description",
        content: "Toma pedidos de pupusas, bebidas y acompañamientos con impresión de tickets térmicos.",
      },
      { property: "og:title", content: "Punto de Venta — La Cocina de Oriente" },
      { property: "og:description", content: "Pedidos de comedor y para llevar en tiempo real." },
    ],
  }),
  component: PuntoDeVenta,
});

const CHIPS = ["Todos", "Platos Fuertes", "Pupusas", "Especiales", "Bebidas"] as const;
const MESAS = ["1", "2", "3", "4", "5", "6", "7", "8"];

type Accion = "cocina" | "pago" | null;

function PuntoDeVenta() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { userId } = useSesion();
  const { data: perfil } = usePerfil();
  const { esAdmin } = useEsAdmin();
  const { data: productos = [] } = useProductos();
  const { data: bebidas = [] } = useBebidas();

  const [busqueda, setBusqueda] = useState("");
  const [chip, setChip] = useState<(typeof CHIPS)[number]>("Todos");
  const [items, setItems] = useState<PedidoItem[]>([]);
  const [tipo, setTipo] = useState<"comedor" | "llevar">("comedor");
  const [mesa, setMesa] = useState<string>("1");
  const [numeroTicket, setNumeroTicket] = useState(() => nuevoNumeroTicket());
  const [pedidoId, setPedidoId] = useState<string | null>(null);
  const [editando, setEditando] = useState<Producto | null>(null);
  const [dialogProducto, setDialogProducto] = useState(false);
  const [bebidaEditando, setBebidaEditando] = useState<Bebida | null>(null);
  const [dialogBebida, setDialogBebida] = useState(false);
  const [accion, setAccion] = useState<Accion>(null);
  const [procesando, setProcesando] = useState(false);
  const [panelMovil, setPanelMovil] = useState(false);

  // Carga un pedido existente para seguir editándolo (desde Pedidos Activos)
  const { pedido: pedidoParam } = Route.useSearch();
  const cargado = useRef<string | null>(null);

  useEffect(() => {
    if (!pedidoParam || pedidoId === pedidoParam || cargado.current === pedidoParam) return;
    let activo = true;
    void (async () => {
      const { data, error } = await supabase
        .from("pedidos")
        .select("*")
        .eq("id", pedidoParam)
        .maybeSingle();
      if (!activo || error || !data) return;
      if (data.estado === "pagado" || data.estado === "cancelado") {
        cargado.current = pedidoParam;
        toast.error("Este pedido ya está cerrado y no admite cambios");
        return;
      }
      cargado.current = pedidoParam;
      setItems((data.items ?? []) as unknown as PedidoItem[]);
      setTipo(data.tipo as "comedor" | "llevar");
      setMesa(data.mesa ?? "1");
      setNumeroTicket(data.numero_ticket);
      setPedidoId(data.id);
      toast.success(`Editando pedido ${data.numero_ticket}`);
    })();
    return () => {
      activo = false;
    };
  }, [pedidoParam, pedidoId]);



  const catalogo: Producto[] = useMemo(() => {
    const bebidasComoProducto: Producto[] = bebidas.map((b) => ({
      id: b.id,
      nombre: `${b.nombre} (${b.tamano})`,
      descripcion: "Bebida fría o caliente del día",
      precio: Number(b.precio),
      categoria: "Bebidas",
      imagen_url: null,
      disponible: b.disponible,
    }));
    return [...productos.map((p) => ({ ...p, precio: Number(p.precio) })), ...bebidasComoProducto];
  }, [productos, bebidas]);

  const visibles = catalogo.filter(
    (p) =>
      (chip === "Todos" || p.categoria === chip) &&
      p.nombre.toLowerCase().includes(busqueda.trim().toLowerCase()),
  );

  const totales = calcularTotales(items);
  const cantidadTotal = items.reduce((sum, i) => sum + i.cantidad, 0);

  function agregar(p: Producto) {
    if (!p.disponible) return;
    setItems((prev) => {
      const idx = prev.findIndex((i) => i.refId === p.id);
      if (idx >= 0) {
        const copia = [...prev];
        const actual = copia[idx]!;
        copia[idx] = { ...actual, cantidad: actual.cantidad + 1 };
        return copia;
      }
      return [
        ...prev,
        {
          tipo: p.categoria === "Bebidas" ? "bebida" : "producto",
          refId: p.id,
          nombre: p.nombre,
          precioUnitario: p.precio,
          cantidad: 1,
        },
      ];
    });
  }

  function cambiarCantidad(refId: string, delta: number) {
    setItems((prev) =>
      prev
        .map((i) => (i.refId === refId ? { ...i, cantidad: i.cantidad + delta } : i))
        .filter((i) => i.cantidad > 0),
    );
  }

  function eliminarLinea(refId: string) {
    setItems((prev) => prev.filter((i) => i.refId !== refId));
  }

  const baseTicket = {
    numeroTicket,
    tipo,
    mesa: tipo === "comedor" ? mesa : null,
    items,
    total: totales.total,
    fecha: new Date(),
    cajera: perfil?.nombre ?? "—",
  };

  const textoCocina = renderTicket(baseTicket, "cocina");
  const textoCliente = renderTicket(baseTicket, "cliente");

  async function persistir(estado: "pendiente" | "enviado" | "pagado") {
    const payload = {
      numero_ticket: numeroTicket,
      tipo,
      mesa: tipo === "comedor" ? mesa : null,
      cajera_uid: userId,
      estado,
      total: totales.total,
      items: items as unknown as never,
      fecha_pago: estado === "pagado" ? new Date().toISOString() : null,
    };

    if (pedidoId) {
      const { error } = await supabase
        .from("pedidos")
        .update({
          estado,
          tipo: payload.tipo,
          mesa: payload.mesa,
          total: payload.total,
          items: payload.items,
          fecha_pago: payload.fecha_pago,
        })
        .eq("id", pedidoId);
      if (error) throw error;
      return pedidoId;
    }

    const { data, error } = await supabase.from("pedidos").insert(payload).select("id").single();
    if (error) throw error;
    return data.id as string;
  }

  function nuevoPedido() {
    setItems([]);
    setPedidoId(null);
    setNumeroTicket(nuevoNumeroTicket());
    setMesa("1");
    setTipo("comedor");
    setPanelMovil(false);
    cargado.current = null;
    if (pedidoParam) void navigate({ to: "/pos", search: {} as never, replace: true });
  }


  async function guardarPendiente() {
    if (!items.length) return;
    setProcesando(true);
    const ticketGuardado = numeroTicket;
    try {
      await persistir("pendiente");
      await queryClient.invalidateQueries({ queryKey: ["pedidos"] });
      toast.success(`Pedido ${ticketGuardado} guardado como pendiente`);
      nuevoPedido();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar el pedido");
    } finally {
      setProcesando(false);
    }
  }

  async function confirmarAccion() {
    setProcesando(true);
    try {
      if (accion === "cocina") {
        await persistir("enviado");
        imprimirTicket(textoCocina);
        toast.success("Comanda enviada a cocina");
        nuevoPedido();
      } else {
        await persistir("pagado");
        imprimirTicket(textoCliente);
        toast.success("Pago registrado en efectivo");
        nuevoPedido();
      }
      await queryClient.invalidateQueries({ queryKey: ["pedidos"] });
      setAccion(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo completar la acción");
    } finally {
      setProcesando(false);
    }

  }

  const lineas = (
    <ul className="space-y-2">
      {items.map((item) => (
        <li
          key={item.refId}
          className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-lg border p-2"
        >
          <div className="min-w-0">
            <p className="line-clamp-2 text-sm font-medium leading-snug">{item.nombre}</p>
            <p className="text-xs text-muted-foreground">
              {money(item.precioUnitario)} · {money(item.precioUnitario * item.cantidad)}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Button
              size="icon"
              variant="outline"
              className="h-9 w-9"
              aria-label="Quitar uno"
              onClick={() => cambiarCantidad(item.refId, -1)}
            >
              <Minus />
            </Button>
            <span className="w-6 text-center text-sm font-bold tabular-nums">{item.cantidad}</span>
            <Button
              size="icon"
              variant="outline"
              className="h-9 w-9"
              aria-label="Agregar uno"
              onClick={() => cambiarCantidad(item.refId, 1)}
            >
              <Plus />
            </Button>
            <Button
              size="icon"
              variant="outline"
              className="h-9 w-9 text-destructive"
              aria-label={`Eliminar ${item.nombre}`}
              onClick={() => eliminarLinea(item.refId)}
            >
              <X />
            </Button>
          </div>
        </li>
      ))}
      {!items.length && (
        <li className="rounded-lg border border-dashed p-6 text-center text-xs text-muted-foreground">
          Agrega productos para iniciar el pedido.
        </li>
      )}
    </ul>
  );

  const acciones = (
    <div className="space-y-2">
      <Button
        variant="outline"
        className="h-11 w-full"
        disabled={!items.length || procesando}
        onClick={guardarPendiente}
      >
        <Save /> Guardar Pedido / Pendiente
      </Button>
      <Button
        variant="brand"
        className="h-11 w-full"
        disabled={!items.length || procesando}
        onClick={() => setAccion("cocina")}
      >
        <Printer /> Imprimir Ticket de Cocina
      </Button>
      <Button
        variant="flame"
        className="h-12 w-full"
        disabled={!items.length || procesando}
        onClick={() => setAccion("pago")}
      >
        <Wallet /> Pagar e Imprimir Ticket Cliente
      </Button>
    </div>
  );

  return (
    <div className="grid gap-4 md:h-[calc(100vh-10.5rem)] md:grid-cols-[minmax(0,1fr)_340px] md:items-stretch md:overflow-hidden lg:grid-cols-[minmax(0,1fr)_380px]">
      <section className="flex min-w-0 flex-col gap-4 pb-24 md:h-full md:overflow-hidden md:pb-0">
        <div className="shrink-0 space-y-4">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar producto…"
                className="h-11 pl-9"
                aria-label="Buscar producto"
              />
            </div>
            {esAdmin && (
              <>
                <Button
                  variant="brand"
                  className="h-11 shrink-0"
                  onClick={() => {
                    setEditando(null);
                    setDialogProducto(true);
                  }}
                >
                  <Plus /> <span className="hidden sm:inline">Nuevo producto</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-11 shrink-0"
                  onClick={() => {
                    setBebidaEditando(null);
                    setDialogBebida(true);
                  }}
                >
                  <CupSoda /> <span className="hidden sm:inline">Nueva bebida</span>
                </Button>
              </>
            )}
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
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto md:pr-1">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visibles.map((p) => (
            <article
              key={p.id}
              className="flex min-w-0 flex-col overflow-hidden rounded-xl border bg-card shadow-soft"
            >
              <div className="relative aspect-[4/3] w-full bg-secondary">
                {p.imagen_url ? (
                  <img
                    src={p.imagen_url}
                    alt={p.nombre}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                    className={`h-full w-full object-cover ${
                      p.disponible ? "" : "opacity-40 blur-[2px] grayscale"
                    }`}
                  />
                ) : (
                  <div
                    className={`grid h-full w-full place-items-center text-3xl ${
                      p.disponible ? "" : "opacity-40 blur-[2px] grayscale"
                    }`}
                  >
                    🫓
                  </div>
                )}
                {!p.disponible && (
                  <span className="absolute inset-x-2 top-2 rounded-md bg-muted/95 px-2 py-1 text-center text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                    No disponible
                  </span>
                )}
                {esAdmin && (
                <button
                  type="button"
                  aria-label={`Editar ${p.nombre}`}
                  onClick={() => {
                    const bebida = bebidas.find((b) => b.id === p.id);
                    if (bebida) {
                      setBebidaEditando(bebida);
                      setDialogBebida(true);
                      return;
                    }
                    setEditando(productos.find((prod) => prod.id === p.id) ?? p);
                    setDialogProducto(true);
                  }}
                  className="absolute bottom-2 right-2 grid h-9 w-9 place-items-center rounded-lg bg-card/90 text-brand shadow-soft transition-colors hover:bg-card"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                )}
              </div>
              <div className="flex flex-1 flex-col gap-2 p-3">
                <h3 className="line-clamp-2 text-sm font-semibold leading-snug">{p.nombre}</h3>
                <p className="mt-auto text-base font-extrabold text-brand">{money(p.precio)}</p>
                <Button
                  size="sm"
                  variant={p.disponible ? "flame" : "outline"}
                  className="h-10 w-full"
                  disabled={!p.disponible}
                  onClick={() => agregar(p)}
                >
                  <Plus /> {p.disponible ? "Agregar" : "Agotado"}
                </Button>
              </div>
            </article>
          ))}
          {!visibles.length && (
            <p className="col-span-full rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
              No hay productos que coincidan con la búsqueda.
            </p>
          )}
        </div>
        </div>
      </section>

      {/* Panel lateral (tablet/desktop) */}
      <aside className="hidden space-y-3 rounded-xl border bg-card p-4 shadow-soft md:block md:h-full md:overflow-y-auto">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
          <h2 className="truncate text-base font-bold tracking-tight">Pedido Actual</h2>
          <span className="shrink-0 rounded-md bg-secondary px-2 py-1 font-mono text-[11px] font-semibold text-brand">
            {numeroTicket}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
          {(
            [
              ["comedor", "Comedor"],
              ["llevar", "Para Llevar"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              onClick={() => setTipo(value)}
              className={`rounded-md px-2 py-2 text-xs font-semibold transition-colors ${
                tipo === value ? "bg-card text-brand shadow-soft" : "text-muted-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {tipo === "comedor" && (
          <Select value={mesa} onValueChange={setMesa}>
            <SelectTrigger aria-label="Mesa">
              <SelectValue placeholder="Mesa" />
            </SelectTrigger>
            <SelectContent>
              {MESAS.map((m) => (
                <SelectItem key={m} value={m}>
                  Mesa {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <div className="max-h-[38vh] overflow-y-auto">{lineas}</div>

        <div className="flex items-center justify-between border-t pt-3 text-base font-extrabold text-brand">
          <span>Total</span>
          <span className="tabular-nums">{money(totales.total)}</span>
        </div>

        {acciones}
      </aside>

      {/* Botón flotante mobile */}
      {items.length > 0 && !panelMovil && (
        <button
          type="button"
          onClick={() => setPanelMovil(true)}
          className="fixed inset-x-3 bottom-[76px] z-40 flex h-14 items-center justify-between gap-3 rounded-xl bg-flame px-4 text-flame-foreground shadow-lifted md:hidden"
        >
          <span className="truncate text-sm font-semibold">{cantidadTotal} items seleccionados</span>
          <span className="flex shrink-0 items-center gap-1 text-base font-extrabold tabular-nums">
            {money(totales.total)} <ArrowRight className="h-4 w-4" />
          </span>
        </button>
      )}

      {/* Pantalla completa mobile: Pedido Actual */}
      {panelMovil && (
        <div className="fixed inset-0 z-50 flex flex-col bg-background md:hidden">
          <header className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-2 border-b bg-card px-3 py-3">
            <Button
              size="icon"
              variant="ghost"
              className="h-10 w-10"
              aria-label="Cerrar pedido actual"
              onClick={() => setPanelMovil(false)}
            >
              <X />
            </Button>
            <div className="min-w-0">
              <h2 className="truncate text-base font-bold tracking-tight">Pedido Actual</h2>
              <p className="truncate font-mono text-[11px] text-muted-foreground">{numeroTicket}</p>
            </div>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto p-3">
            <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
              {(
                [
                  ["comedor", "Comedor"],
                  ["llevar", "Para Llevar"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => setTipo(value)}
                  className={`rounded-md px-2 py-2.5 text-sm font-semibold transition-colors ${
                    tipo === value ? "bg-card text-brand shadow-soft" : "text-muted-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {tipo === "comedor" && (
              <Select value={mesa} onValueChange={setMesa}>
                <SelectTrigger aria-label="Mesa" className="h-11">
                  <SelectValue placeholder="Mesa" />
                </SelectTrigger>
                <SelectContent>
                  {MESAS.map((m) => (
                    <SelectItem key={m} value={m}>
                      Mesa {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {lineas}
          </div>

          <div className="sticky bottom-0 space-y-2 border-t bg-card p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-lifted">
            <div className="flex items-center justify-between text-base font-extrabold text-brand">
              <span>Total</span>
              <span className="tabular-nums">{money(totales.total)}</span>
            </div>
            {acciones}
          </div>
        </div>
      )}

      <ProductoDialog producto={editando} open={dialogProducto} onOpenChange={setDialogProducto} />

      <BebidaDialog
        bebida={bebidaEditando}
        open={dialogBebida}
        onOpenChange={setDialogBebida}
      />

      <TicketPreviewDialog
        open={accion !== null}
        onOpenChange={(o) => !o && setAccion(null)}
        titulo={accion === "cocina" ? "Vista previa · Comanda de cocina" : "Vista previa · Ticket cliente"}
        descripcion={
          accion === "cocina"
            ? "Revisa la comanda antes de enviarla a la cocina."
            : "Revisa el ticket antes de confirmar el pago en efectivo."
        }
        texto={accion === "cocina" ? textoCocina : textoCliente}
        confirmLabel={accion === "cocina" ? "Imprimir en Cocina" : "Confirmar Pago"}
        onConfirm={confirmarAccion}
        procesando={procesando}
      />
    </div>
  );
}
