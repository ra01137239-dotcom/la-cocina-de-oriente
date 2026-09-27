import { useEffect, useRef, useState } from "react";
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
import { supabase } from "@/integrations/supabase/client";
import type { PerfilUsuario } from "@/lib/pos";

export function PerfilDialog({
  perfil,
  open,
  onOpenChange,
}: {
  perfil: PerfilUsuario | null | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const archivoRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({ nombre: "", foto_url: "" });
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm({
      nombre: perfil?.nombre ?? "",
      foto_url: perfil?.foto_url ?? "",
    });
  }, [open, perfil]);

  function subirImagen(file: File) {
    if (file.size > 1_500_000) {
      toast.error("La imagen es muy grande (máximo 1.5 MB)");
      return;
    }
    const lector = new FileReader();
    lector.onload = () => setForm((f) => ({ ...f, foto_url: String(lector.result) }));
    lector.readAsDataURL(file);
  }

  async function guardar() {
    if (!perfil) return;
    setGuardando(true);
    const { error } = await supabase
      .from("usuarios")
      .update({
        nombre: form.nombre.trim() || perfil.nombre,
        foto_url: form.foto_url.trim() || null,
      })
      .eq("id", perfil.id);
    setGuardando(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Perfil actualizado");
    await queryClient.invalidateQueries({ queryKey: ["perfil"] });
    onOpenChange(false);
  }

  const iniciales = (form.nombre || "??").slice(0, 2).toUpperCase();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="border-b p-4 text-left">
          <DialogTitle>Editar perfil</DialogTitle>
          <DialogDescription>Actualiza tu foto y tu nombre para mostrar.</DialogDescription>
        </DialogHeader>

        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          <div className="flex items-center gap-3">
            {form.foto_url ? (
              <img
                src={form.foto_url}
                alt="Foto de perfil"
                className="h-16 w-16 shrink-0 rounded-full object-cover"
              />
            ) : (
              <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-flame text-base font-bold text-flame-foreground">
                {iniciales}
              </div>
            )}
            <div className="min-w-0 space-y-2">
              <Button
                variant="outline"
                className="h-10"
                onClick={() => archivoRef.current?.click()}
              >
                Subir imagen
              </Button>
              <input
                ref={archivoRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) subirImagen(file);
                }}
              />
              {form.foto_url && (
                <Button
                  variant="ghost"
                  className="ml-2 h-10 text-destructive"
                  onClick={() => setForm({ ...form, foto_url: "" })}
                >
                  Quitar
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pf-url">Foto (URL)</Label>
            <Input
              id="pf-url"
              className="h-11"
              placeholder="https://…"
              value={form.foto_url.startsWith("data:") ? "" : form.foto_url}
              onChange={(e) => setForm({ ...form, foto_url: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pf-nombre">Nombre para mostrar</Label>
            <Input
              id="pf-nombre"
              className="h-11"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            />
          </div>

          <div className="grid gap-3 rounded-lg border bg-muted/40 p-3 sm:grid-cols-2">
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Correo</p>
              <p className="truncate text-sm font-medium">{perfil?.correo || "—"}</p>
            </div>
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Rol</p>
              <p className="truncate text-sm font-medium">
                {perfil?.rol === "admin" ? "Administrador" : "Cajera"}
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="sticky bottom-0 gap-2 border-t bg-card p-4 sm:gap-2">
          <Button variant="outline" className="h-11" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button variant="flame" className="h-11" onClick={guardar} disabled={guardando}>
            {guardando ? "Guardando…" : "Guardar cambios"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
