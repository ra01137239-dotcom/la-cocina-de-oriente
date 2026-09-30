import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

//import { BitacoraRegistro } from "@/components/pos/BitacoraRegistro";
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
import { supabase } from "@/integrations/supabase/client";
import type { Insumo } from "@/lib/pos";

export function InsumoDialog({
  insumo,
  open,
  onOpenChange,
  siguienteCodigo,
}: {
  insumo: Insumo | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  siguienteCodigo: string;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    codigo: "",
    categoria: "",
    nombre: "",
    stock_actual: "0",
    stock_minimo: "0",
    unidad: "libra",
    fecha_vencimiento: "",
  });
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm({
      codigo: insumo?.codigo ?? siguienteCodigo,
      categoria: insumo?.categoria ?? "General",
      nombre: insumo?.nombre ?? "",
      stock_actual: String(insumo?.stock_actual ?? 0),
      stock_minimo: String(insumo?.stock_minimo ?? 0),
      unidad: insumo?.unidad ?? "libra",
      fecha_vencimiento: insumo?.fecha_vencimiento ?? "",
    });
  }, [open, insumo, siguienteCodigo]);

  async function guardar() {
    setGuardando(true);
    const payload = {
      codigo: form.codigo.trim(),
      categoria: form.categoria.trim() || "General",
      nombre: form.nombre.trim(),
      stock_actual: Number(form.stock_actual) || 0,
      stock_minimo: Number(form.stock_minimo) || 0,
      unidad: form.unidad.trim() || "unidad",
      fecha_vencimiento: form.fecha_vencimiento || null,
    };
    const { error } = insumo
      ? await supabase.from("materia_prima").update(payload).eq("id", insumo.id)
      : await supabase.from("materia_prima").insert(payload);
    setGuardando(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(insumo ? "Insumo actualizado" : "Insumo agregado");
    await queryClient.invalidateQueries({ queryKey: ["materia_prima"] });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="border-b p-4 text-left">
          <DialogTitle>{insumo ? "Editar insumo" : "Agregar nuevo insumo"}</DialogTitle>
          <DialogDescription>Materia prima de cocina y su nivel de stock.</DialogDescription>
        </DialogHeader>

        <div className="grid flex-1 gap-4 overflow-y-auto p-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="i-codigo">Código</Label>
            <Input
              className="h-11"
              id="i-codigo"
              value={form.codigo}
              onChange={(e) => setForm({ ...form, codigo: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="i-cat">Categoría</Label>
            <Input
              className="h-11"
              id="i-cat"
              value={form.categoria}
              onChange={(e) => setForm({ ...form, categoria: e.target.value })}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="i-nombre">Nombre</Label>
            <Input
              className="h-11"
              id="i-nombre"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="i-actual">Stock actual</Label>
            <Input
              className="h-11"
              id="i-actual"
              type="number"
              step="0.01"
              min="0"
              value={form.stock_actual}
              onChange={(e) => setForm({ ...form, stock_actual: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="i-min">Stock mínimo</Label>
            <Input
              className="h-11"
              id="i-min"
              type="number"
              step="0.01"
              min="0"
              value={form.stock_minimo}
              onChange={(e) => setForm({ ...form, stock_minimo: e.target.value })}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="i-unidad">Unidad</Label>
            <Input
              className="h-11"
              id="i-unidad"
              value={form.unidad}
              placeholder="libra, litro, unidad…"
              onChange={(e) => setForm({ ...form, unidad: e.target.value })}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="i-venc">Fecha de vencimiento (opcional)</Label>
            <Input
              className="h-11"
              id="i-venc"
              type="date"
              value={form.fecha_vencimiento}
              onChange={(e) => setForm({ ...form, fecha_vencimiento: e.target.value })}
            />
          </div>
          {insumo && (
            <div className="sm:col-span-2">
              <BitacoraRegistro entityType="materia_prima" entityId={insumo.id} />
            </div>
          )}
        </div>

        <DialogFooter className="sticky bottom-0 gap-2 border-t bg-card p-4 sm:gap-2">
          <Button variant="outline" className="h-11" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button variant="flame" className="h-11" onClick={guardar} disabled={guardando || !form.nombre.trim()}>
            {guardando ? "Guardando…" : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
