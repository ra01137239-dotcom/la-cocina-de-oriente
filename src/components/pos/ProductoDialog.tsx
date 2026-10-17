import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

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
import { Textarea } from "@/components/ui/textarea";
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
import type { Producto } from "@/lib/pos";
import { Plus, Trash2 } from "lucide-react";

type LineaReceta = {
  materia_prima_id: string;
  modo: "directa" | "rendimiento";
  /** Cantidad de insumo por unidad vendida (modo directa). */
  cantidad: string;
  /** Unidades de producto que rinde 1 unidad del insumo (modo rendimiento). */
  rendimiento: string;
};

function cantidadDeLinea(l: LineaReceta) {
  if (l.modo === "rendimiento") {
    const r = Number(l.rendimiento);
    return r > 0 ? Math.round((1 / r) * 1e6) / 1e6 : 0;
  }
  return Number(l.cantidad) || 0;
}

const CATEGORIAS = ["Platos Fuertes", "Pupusas", "Especiales"];

export function ProductoDialog({
  producto,
  open,
  onOpenChange,
}: {
  producto: Producto | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    nombre: "",
    descripcion: "",
    precio: "0.00",
    categoria: "Pupusas",
    imagen_url: "",
    disponible: true,
  });
  const [guardando, setGuardando] = useState(false);
  const { data: insumos = [] } = useInsumos();
  const [lineas, setLineas] = useState<LineaReceta[]>([]);

  useEffect(() => {
    if (!open) return;
    setForm({
      nombre: producto?.nombre ?? "",
      descripcion: producto?.descripcion ?? "",
      precio: (producto?.precio ?? 0).toFixed(2),
      categoria: producto?.categoria ?? "Pupusas",
      imagen_url: producto?.imagen_url ?? "",
      disponible: producto?.disponible ?? true,
    });
    setLineas([]);
    if (producto) {
      void supabase
        .from("producto_insumos")
        .select("materia_prima_id, cantidad_por_unidad")
        .eq("producto_id", producto.id)
        .then(({ data }) => {
          setLineas(
            (data ?? []).map((r) => ({
              materia_prima_id: r.materia_prima_id,
              modo: "directa" as const,
              cantidad: String(r.cantidad_por_unidad),
              rendimiento: "",
            })),
          );
        });
    }
  }, [open, producto]);

  async function guardar() {
    setGuardando(true);
    const payload = {
      nombre: form.nombre.trim(),
      descripcion: form.descripcion.trim(),
      precio: Number(form.precio) || 0,
      categoria: form.categoria,
      imagen_url: form.imagen_url.trim() || null,
      disponible: form.disponible,
    };
    let productoId = producto?.id ?? null;
    if (producto) {
      const { error } = await supabase.from("productos").update(payload).eq("id", producto.id);
      if (error) {
        setGuardando(false);
        toast.error(error.message);
        return;
      }
    } else {
      const { data, error } = await supabase.from("productos").insert(payload).select("id").single();
      if (error || !data) {
        setGuardando(false);
        toast.error(error?.message ?? "No se pudo guardar el producto");
        return;
      }
      productoId = data.id;
    }

    if (productoId) {
      const validas = lineas.filter((l) => l.materia_prima_id && cantidadDeLinea(l) > 0);
      await supabase.from("producto_insumos").delete().eq("producto_id", productoId);
      if (validas.length) {
        const { error: errorReceta } = await supabase.from("producto_insumos").insert(
          validas.map((l) => ({
            producto_id: productoId!,
            materia_prima_id: l.materia_prima_id,
            cantidad_por_unidad: cantidadDeLinea(l),
          })),
        );
        if (errorReceta) {
          setGuardando(false);
          toast.error(errorReceta.message);
          return;
        }
      }
    }

    setGuardando(false);
    toast.success(producto ? "Producto actualizado" : "Producto agregado");
    await queryClient.invalidateQueries({ queryKey: ["productos"] });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="border-b p-4 text-left">
          <DialogTitle>{producto ? "Editar producto" : "Nuevo producto"}</DialogTitle>
          <DialogDescription>
            Modifica nombre, descripción, precio, categoría, disponibilidad e imagen.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          <div className="space-y-1.5">
            <Label htmlFor="p-nombre">Nombre</Label>
            <Input
              className="h-11"
              id="p-nombre"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p-desc">Descripción</Label>
            <Textarea
              id="p-desc"
              rows={3}
              value={form.descripcion}
              onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="p-precio">Precio (US$)</Label>
              <Input
                id="p-precio"
                type="number"
                step="0.01"
                min="0"
                value={form.precio}
                onChange={(e) => setForm({ ...form, precio: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Categoría</Label>
              <Select
                value={form.categoria}
                onValueChange={(categoria) => setForm({ ...form, categoria })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIAS.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p-img">Imagen (URL)</Label>
            <Input
              className="h-11"
              id="p-img"
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

          <div className="space-y-3 rounded-lg border p-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-medium">Insumos que consume este producto</p>
                <p className="text-xs text-muted-foreground">
                  Se descuentan del inventario al cobrar el pedido.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 shrink-0"
                onClick={() =>
                  setLineas([
                    ...lineas,
                    { materia_prima_id: "", modo: "directa", cantidad: "", rendimiento: "" },
                  ])
                }
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
                      <button
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
                      </button>
                    ))}
                  </div>

                  {linea.modo === "directa" ? (
                    <div className="space-y-1.5">
                      <Label>Cantidad por unidad vendida ({insumo?.unidad ?? "unidad"})</Label>
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
                        Unidades de producto que rinde 1 {insumo?.unidad ?? "unidad"} de insumo
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
                    Consumo por unidad: {cantidadDeLinea(linea)} {insumo?.unidad ?? ""}
                  </p>
                </div>
              );
            })}
          </div>

          {/* {producto && <BitacoraRegistro entityType="producto" entityId={producto.id} />} */}
        </div>

        <DialogFooter className="sticky bottom-0 gap-2 border-t bg-card p-4 sm:gap-2">
          <Button variant="outline" className="h-11" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button variant="flame" className="h-11" onClick={guardar} disabled={guardando || !form.nombre.trim()}>
            {guardando ? "Guardando…" : "Guardar cambios"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
