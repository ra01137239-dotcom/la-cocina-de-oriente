import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
 
import { BitacoraRegistro } from "@/components/pos/BitacoraRegistro";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useInsumos } from "@/lib/data";
import type { Bebida } from "@/lib/pos";
 
type LineaReceta = {
  materia_prima_id: string;
  modo: "directa" | "rendimiento";
  cantidad: string;
  rendimiento: string;
};
 
function cantidadDeLinea(l: LineaReceta) {
  if (l.modo === "rendimiento") {
    const r = Number(l.rendimiento);
    return r > 0 ? Math.round((1 / r) * 1e6) / 1e6 : 0;
  }
  return Number(l.cantidad) || 0;
}
 
const lineaVacia = (): LineaReceta => ({
  materia_prima_id: "",
  modo: "directa",
  cantidad: "",
  rendimiento: "",
});
 
export function BebidaDialog({
  bebida,
  open,
  onOpenChange,
}: {
  bebida: Bebida | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const { data: insumos = [] } = useInsumos();
  const [form, setForm] = useState({
    nombre: "",
    precio: "0.00",
    tamano: "500 ml",
    tipo: "embotellada" as "embotellada" | "fresco",
    imagen_url: "",
    disponible: true,
  });
  const [lineas, setLineas] = useState<LineaReceta[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [cargandoReceta, setCargandoReceta] = useState(false);
  const [errorReceta, setErrorReceta] = useState<string | null>(null);
  const bebidaRef = useRef(bebida);
  bebidaRef.current = bebida;
  const bebidaIdActual = bebida?.id ?? null;
 
  const { data: categorias = [] } = useQuery({
    queryKey: ["categorias", "bebida"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categorias")
        .select("id, nombre")
        .eq("tipo", "bebida")
        .order("orden");
      if (error) throw error;
      return data ?? [];
    },
  });
 
  useEffect(() => {
    if (!open) return;
    let activo = true;
    const actual = bebidaRef.current;
    setForm({
      nombre: actual?.nombre ?? "",
      precio: Number(actual?.precio ?? 0).toFixed(2),
      tamano: actual?.tamano ?? "500 ml",
      tipo: actual?.tipo === "fresco" ? "fresco" : "embotellada",
      imagen_url: actual?.imagen_url ?? "",
      disponible: actual?.disponible ?? true,
    });
    setLineas([]);
    setErrorReceta(null);
    setCargandoReceta(Boolean(actual));

    async function cargar() {
      if (!actual) return;
      try {
        const { data, error } = await supabase
          .from("bebida_insumos")
          .select("materia_prima_id, cantidad_por_unidad")
          .eq("bebida_id", actual.id);
        if (error) throw error;
        if (!activo) return;
        setLineas((data ?? []).map((r) => ({
          materia_prima_id: r.materia_prima_id,
          modo: "directa" as const,
          cantidad: String(r.cantidad_por_unidad),
          rendimiento: "",
        })));
      } catch (error) {
        if (!activo) return;
        const mensaje = error instanceof Error ? error.message :
          (error as { message?: string })?.message ?? "Error desconocido";
        setErrorReceta(mensaje);
        toast.error(`No se pudo cargar el insumo: ${mensaje}`);
      } finally {
        if (activo) setCargandoReceta(false);
      }
    }
    void cargar();
    return () => { activo = false; };
  }, [open, bebidaIdActual]);

  // La bebida embotellada consume exactamente 1 unidad de su insumo.
  const lineasAGuardar =
    form.tipo === "embotellada"
      ? lineas.slice(0, 1).map((l) => ({ ...l, modo: "directa" as const, cantidad: "1" }))
      : lineas;
 
  async function guardar() {
    if (guardando || cargandoReceta || errorReceta) return;
    const validas = lineasAGuardar;
    if (!form.nombre.trim()) return;
    if (form.tipo === "embotellada" && !validas[0]?.materia_prima_id) {
      toast.error("Selecciona el insumo que representa esta bebida.");
      return;
    }
    if (validas.some((l) => !l.materia_prima_id ||
        !Number.isFinite(cantidadDeLinea(l)) || cantidadDeLinea(l) <= 0)) {
      toast.error("Cada insumo debe tener una cantidad o rendimiento mayor que cero.");
      return;
    }
    if (new Set(validas.map((l) => l.materia_prima_id)).size !== validas.length) {
      toast.error("No repitas el mismo insumo en la receta.");
      return;
    }
    const precio = Number(form.precio);
    if (!Number.isFinite(precio) || precio < 0) {
      toast.error("Ingresa un precio válido, mayor o igual a cero.");
      return;
    }
    setGuardando(true);
    try {
      const categoriaNombre = form.tipo === "embotellada" ? "Embotellada" : "Frescos";
      const payload = {
        nombre: form.nombre.trim(),
        precio,
        tamano: form.tamano.trim() || "Mediano",
        tipo: form.tipo,
        imagen_url: form.imagen_url.trim() || null,
        disponible: form.disponible,
        categoria_id: categorias.find((c) => c.nombre === categoriaNombre)?.id ?? null,
      };
      const resultado = bebida
        ? await supabase.from("bebidas").update(payload).eq("id", bebida.id).select("id").single()
        : await supabase.from("bebidas").insert(payload).select("id").single();
      if (resultado.error) throw resultado.error;
      if (!resultado.data) throw new Error("No se confirmó el guardado de la bebida.");
      const idBebida = resultado.data.id;

      const { data: anteriores, error: errorLeer } = await supabase
        .from("bebida_insumos").select("id").eq("bebida_id", idBebida);
      if (errorLeer) throw errorLeer;
      // Inserta primero: si falla, las relaciones anteriores no se eliminan.
      let nuevasIds: string[] = [];
      if (validas.length) {
        const { data: nuevas, error: errorInsertar } = await supabase
          .from("bebida_insumos")
          .insert(validas.map((l) => ({
            bebida_id: idBebida,
            materia_prima_id: l.materia_prima_id,
            cantidad_por_unidad: cantidadDeLinea(l),
          })))
          .select("id");
        if (errorInsertar) throw errorInsertar;
        nuevasIds = (nuevas ?? []).map((r) => r.id);
        if (nuevasIds.length !== validas.length) {
          throw new Error("No se confirmó el guardado de todos los insumos.");
        }
      }
      const idsAnteriores = (anteriores ?? []).map((r) => r.id);
      if (idsAnteriores.length) {
        const { data: eliminadas, error: errorEliminar } = await supabase
          .from("bebida_insumos").delete().eq("bebida_id", idBebida)
          .in("id", idsAnteriores).select("id");
        if (errorEliminar || eliminadas?.length !== idsAnteriores.length) {
          // Intenta retirar solo lo recién insertado, conservando la receta anterior.
          if (nuevasIds.length) {
            const { error: errorRevertir } = await supabase.from("bebida_insumos")
              .delete().eq("bebida_id", idBebida).in("id", nuevasIds);
            if (errorRevertir) {
              throw new Error("No se pudo revertir la relación nueva. Revisa la receta antes de vender esta bebida.");
            }
          }
          throw errorEliminar ?? new Error("No se pudo reemplazar la receta anterior. Revisa los permisos de eliminación.");
        }
      }
      const { data: guardadas, error: errorVerificar } = await supabase
        .from("bebida_insumos").select("materia_prima_id, cantidad_por_unidad")
        .eq("bebida_id", idBebida);
      if (errorVerificar) throw errorVerificar;
      if (guardadas?.length !== validas.length || validas.some((l) =>
        !guardadas.some((r) => r.materia_prima_id === l.materia_prima_id &&
          Number(r.cantidad_por_unidad) === cantidadDeLinea(l)))) {
        throw new Error("La relación leída no coincide con la seleccionada. Revisa el insumo antes de vender.");
      }
      await queryClient.invalidateQueries({ queryKey: ["bebidas"] });
      toast.success(bebida ? "Bebida e insumos actualizados" : "Bebida e insumos agregados");
      onOpenChange(false);
    } catch (error) {
      const mensaje = error instanceof Error ? error.message :
        (error as { message?: string })?.message ?? "Error desconocido";
      toast.error(`No se confirmó el guardado completo: ${mensaje}`);
    } finally {
      setGuardando(false);
    }
  }

  async function eliminar() {
    if (!bebida) return;
    setGuardando(true);
    const { error } = await supabase.from("bebidas").delete().eq("id", bebida.id);
    setGuardando(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Bebida eliminada");
    await queryClient.invalidateQueries({ queryKey: ["bebidas"] });
    onOpenChange(false);
  }
 
  const esEmbotellada = form.tipo === "embotellada";
  const primera = lineas[0] ?? lineaVacia();
 
  return (
<Dialog open={open} onOpenChange={(next) => { if (!guardando) onOpenChange(next); }}>
<DialogContent className="flex max-h-[92vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
<DialogHeader className="border-b p-4 text-left">
<DialogTitle>{bebida ? "Editar bebida" : "Nueva bebida"}</DialogTitle>
<DialogDescription>
            Bebidas embotelladas y frescos preparados, con descuento automático de inventario.
</DialogDescription>
</DialogHeader>
 
        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {cargandoReceta && <p role="status">Cargando insumos…</p>}
          {errorReceta && <p role="alert" className="text-destructive">No se pudieron cargar los insumos: {errorReceta}. Cierra y vuelve a abrir la bebida.</p>}
          <fieldset disabled={guardando || cargandoReceta || Boolean(errorReceta)} className="min-w-0 space-y-4 border-0 p-0">
<div className="space-y-1.5">
<Label>Tipo de bebida</Label>
<div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
              {(
                [
                  ["embotellada", "Embotellada"],
                  ["fresco", "Fresco"],
                ] as const
              ).map(([value, label]) => (
<Button variant="ghost"
                  key={value}
                  type="button"
                  onClick={() => setForm({ ...form, tipo: value })}
                  className={`rounded-md px-2 py-2 text-xs font-semibold transition-colors ${
                    form.tipo === value
                      ? "bg-flame text-flame-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
>
                  {label}
</Button>
              ))}
</div>
<p className="text-xs text-muted-foreground">
              {esEmbotellada
                ? "Sodas, jugos de lata o hidratantes: al venderse se descuenta una unidad del inventario."
                : "Frescos preparados: se descuentan los insumos según la receta."}
</p>
</div>
 
          <div className="space-y-1.5">
<Label htmlFor="b-nombre">Nombre</Label>
<Input
              className="h-11"
              id="b-nombre"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            />
</div>
 
          <div className="grid gap-4 sm:grid-cols-2">
<div className="space-y-1.5">
<Label htmlFor="b-precio">Precio (US$)</Label>
<Input
                className="h-11"
                id="b-precio"
                type="number"
                step="0.01"
                min="0"
                value={form.precio}
                onChange={(e) => setForm({ ...form, precio: e.target.value })}
              />
</div>
<div className="space-y-1.5">
<Label htmlFor="b-tamano">Presentación</Label>
<Input
                className="h-11"
                id="b-tamano"
                value={form.tamano}
                placeholder="500 ml, Vaso 12 oz…"
                onChange={(e) => setForm({ ...form, tamano: e.target.value })}
              />
</div>
</div>
 
          <div className="space-y-1.5">
<Label htmlFor="b-img">Imagen (URL)</Label>
<Input
              className="h-11"
              id="b-img"
              value={form.imagen_url}
              placeholder="https://…"
              onChange={(e) => setForm({ ...form, imagen_url: e.target.value })}
            />
            {form.imagen_url.trim() ? (
<div className="mt-2 overflow-hidden rounded-lg border bg-secondary">
<img
                  src={form.imagen_url.trim()}
                  alt="Vista previa de la imagen"
                  referrerPolicy="no-referrer"
                  className="h-32 w-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                  onLoad={(e) => {
                    e.currentTarget.style.display = "block";
                  }}
                />
</div>
            ) : null}
</div>
 
          <div className="flex items-center justify-between rounded-lg border p-3">
<div>
<p className="text-sm font-medium">Disponible</p>
<p className="text-xs text-muted-foreground">Se muestra en el punto de venta</p>
</div>
<Switch
              checked={form.disponible}
              onCheckedChange={(disponible) => setForm({ ...form, disponible })}
            />
</div>
 
          {esEmbotellada ? (
<div className="space-y-2 rounded-lg border p-3">
<p className="text-sm font-medium">Existencia en inventario</p>
<p className="text-xs text-muted-foreground">
                Elige el insumo de la categoría Bebidas que representa esta botella o lata. Al
                cobrarse se descuenta 1 unidad por bebida vendida.
</p>
<Select
                value={primera.materia_prima_id}
                onValueChange={(materia_prima_id) =>
                  setLineas([{ ...lineaVacia(), materia_prima_id, cantidad: "1" }])
                }
>
<SelectTrigger className="h-11">
<SelectValue placeholder="Elegir insumo" />
</SelectTrigger>
<SelectContent>
                  {insumos.map((i) => (
<SelectItem key={i.id} value={i.id}>
                      {i.nombre} ({i.unidad}) · stock {Number(i.stock_actual)}
</SelectItem>
                  ))}
</SelectContent>
</Select>
</div>
          ) : (
<div className="space-y-3 rounded-lg border p-3">
<div className="flex items-center justify-between gap-2">
<div>
<p className="text-sm font-medium">Insumos que consume este fresco</p>
<p className="text-xs text-muted-foreground">
                    Por cantidad directa o por rendimiento.
</p>
</div>
<Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 shrink-0"
                  onClick={() => setLineas([...lineas, lineaVacia()])}
>
<Plus /> Insumo
</Button>
</div>
 
              {lineas.length === 0 ? (
<p className="text-xs text-muted-foreground">Aún no hay insumos en la receta.</p>
              ) : null}
 
              {lineas.map((linea, idx) => {
                const insumo = insumos.find((i) => i.id === linea.materia_prima_id);
                const actualizar = (cambios: Partial<LineaReceta>) =>
                  setLineas(lineas.map((l, i) => (i === idx ? { ...l, ...cambios } : l)));
                return (
<div key={idx} className="space-y-2 rounded-lg border bg-secondary/40 p-3">
<div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
<Select
                        value={linea.materia_prima_id}
                        onValueChange={(materia_prima_id) => actualizar({ materia_prima_id })}
>
<SelectTrigger className="h-11">
<SelectValue placeholder="Elegir insumo" />
</SelectTrigger>
<SelectContent>
                          {insumos.map((i) => (
<SelectItem key={i.id} value={i.id}>
                              {i.nombre} ({i.unidad})
</SelectItem>
                          ))}
</SelectContent>
</Select>
<Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-11 w-11 text-destructive"
                        aria-label="Quitar insumo"
                        onClick={() => setLineas(lineas.filter((_, i) => i !== idx))}
>
<Trash2 />
</Button>
</div>
 
                    <div className="grid grid-cols-2 gap-1 rounded-lg bg-card p-1">
                      {(["directa", "rendimiento"] as const).map((modo) => (
<Button variant="ghost"
                          key={modo}
                          type="button"
                          onClick={() => actualizar({ modo })}
                          className={`rounded-md px-2 py-2 text-xs font-semibold transition-colors ${
                            linea.modo === modo
                              ? "bg-flame text-flame-foreground"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
>
                          {modo === "directa" ? "Cantidad directa" : "Rendimiento"}
</Button>
                      ))}
</div>
 
                    {linea.modo === "directa" ? (
<div className="space-y-1.5">
<Label>Cantidad por bebida vendida ({insumo?.unidad ?? "unidad"})</Label>
<Input
                          className="h-11"
                          type="number"
                          step="0.001"
                          min="0"
                          value={linea.cantidad}
                          onChange={(e) => actualizar({ cantidad: e.target.value })}
                        />
</div>
                    ) : (
<div className="space-y-1.5">
<Label>
                          Bebidas que rinde 1 {insumo?.unidad ?? "unidad"} de insumo
</Label>
<Input
                          className="h-11"
                          type="number"
                          step="0.01"
                          min="0"
                          value={linea.rendimiento}
                          onChange={(e) => actualizar({ rendimiento: e.target.value })}
                        />
</div>
                    )}
 
                    <p className="text-xs text-muted-foreground">
                      Consumo por bebida: {cantidadDeLinea(linea)} {insumo?.unidad ?? ""}
</p>
</div>
                );
              })}
</div>
          )}
 
          </fieldset>
          {bebida && <BitacoraRegistro entityType="bebida" entityId={bebida.id} />}
        </div>
 
        <DialogFooter className="sticky bottom-0 gap-2 border-t bg-card p-4 sm:gap-2">
          {bebida && (
<Button
              variant="outline"
              className="h-11 text-destructive sm:mr-auto"
              onClick={eliminar}
              disabled={guardando}
>
<Trash2 /> Eliminar
</Button>
          )}
<Button variant="outline" className="h-11" disabled={guardando} onClick={() => onOpenChange(false)}>
            Cancelar
</Button>
<Button
            variant="flame"
            className="h-11"
            onClick={guardar}
            disabled={guardando || cargandoReceta || Boolean(errorReceta) || !form.nombre.trim()}
>
            {guardando ? "Guardando…" : "Guardar"}
</Button>
</DialogFooter>
</DialogContent>
</Dialog>
  );
}