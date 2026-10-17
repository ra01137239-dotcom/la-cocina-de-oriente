import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
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
    disponible: true,
  });
  const [lineas, setLineas] = useState<LineaReceta[]>([]);
  const [guardando, setGuardando] = useState(false);

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
    setForm({
      nombre: bebida?.nombre ?? "",
      precio: (bebida?.precio ?? 0).toFixed(2),
      tamano: bebida?.tamano ?? "500 ml",
      tipo: (bebida?.tipo as "embotellada" | "fresco") ?? "embotellada",
      disponible: bebida?.disponible ?? true,
    });
    setLineas([]);
    if (bebida) {
      void supabase
        .from("bebida_insumos")
        .select("materia_prima_id, cantidad_por_unidad")
        .eq("bebida_id", bebida.id)
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
  }, [open, bebida]);

  // La bebida embotellada consume exactamente 1 unidad de su insumo.
  const lineasAGuardar =
    form.tipo === "embotellada"
      ? lineas.slice(0, 1).map((l) => ({ ...l, modo: "directa" as const, cantidad: "1" }))
      : lineas;

  async function guardar() {
    setGuardando(true);
    const categoriaNombre = form.tipo === "embotellada" ? "Embotellada" : "Frescos";
    const payload = {
      nombre: form.nombre.trim(),
      precio: Number(form.precio) || 0,
      tamano: form.tamano.trim() || "Mediano",
      tipo: form.tipo,
      disponible: form.disponible,
      categoria_id: categorias.find((c) => c.nombre === categoriaNombre)?.id ?? null,
    };

    let bebidaId = bebida?.id ?? null;
    if (bebida) {
      const { error } = await supabase.from("bebidas").update(payload).eq("id", bebida.id);
      if (error) {
        setGuardando(false);
        toast.error(error.message);
        return;
      }
    } else {
      const { data, error } = await supabase.from("bebidas").insert(payload).select("id").single();
      if (error || !data) {
        setGuardando(false);
        toast.error(error?.message ?? "No se pudo guardar la bebida");
        return;
      }
      bebidaId = data.id;
    }

    if (bebidaId) {
      const validas = lineasAGuardar.filter((l) => l.materia_prima_id && cantidadDeLinea(l) > 0);
      await supabase.from("bebida_insumos").delete().eq("bebida_id", bebidaId);
      if (validas.length) {
        const { error } = await supabase.from("bebida_insumos").insert(
          validas.map((l) => ({
            bebida_id: bebidaId!,
            materia_prima_id: l.materia_prima_id,
            cantidad_por_unidad: cantidadDeLinea(l),
          })),
        );
        if (error) {
          setGuardando(false);
          toast.error(error.message);
          return;
        }
      }
    }

    setGuardando(false);
    toast.success(bebida ? "Bebida actualizada" : "Bebida agregada");
    await queryClient.invalidateQueries({ queryKey: ["bebidas"] });
    onOpenChange(false);
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="border-b p-4 text-left">
          <DialogTitle>{bebida ? "Editar bebida" : "Nueva bebida"}</DialogTitle>
          <DialogDescription>
            Bebidas embotelladas y frescos preparados, con descuento automático de inventario.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          <div className="space-y-1.5">
            <Label>Tipo de bebida</Label>
            <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
              {(
                [
                  ["embotellada", "Embotellada"],
                  ["fresco", "Fresco"],
                ] as const
              ).map(([value, label]) => (
                <button
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
                </button>
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
          <Button variant="outline" className="h-11" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            variant="flame"
            className="h-11"
            onClick={guardar}
            disabled={guardando || !form.nombre.trim()}
          >
            {guardando ? "Guardando…" : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
