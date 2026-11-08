import { useEffect, useRef, useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { comprimirFoto } from "@/lib/imagen";
import type { UsuarioAdmin } from "@/lib/data";

export function UsuarioAdminDialog({
  usuario,
  open,
  onOpenChange,
}: {
  usuario: UsuarioAdmin | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const archivoRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    nombre: "",
    foto_url: "",
    rol: "cajera",
  });
  const [guardando, setGuardando] = useState(false);
  const [procesandoFoto, setProcesandoFoto] = useState(false);

  useEffect(() => {
    if (!open || !usuario) return;
    setForm({
      nombre: usuario.nombre ?? "",
      foto_url: usuario.foto_url ?? "",
      rol: usuario.esAdmin ? "admin" : "cajera",
    });
  }, [open, usuario]);

  async function subirImagen(file: File) {
    // El límite solo protege al teléfono de procesar archivos enormes:
    // la imagen se reduce a 128×128 antes de guardarse.
    if (file.size > 10_000_000) {
      toast.error("La imagen es muy grande (máximo 10 MB)");
      return;
    }
    setProcesandoFoto(true);
    try {
      const foto = await comprimirFoto(file);
      setForm((f) => ({ ...f, foto_url: foto }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo procesar la imagen");
    } finally {
      setProcesandoFoto(false);
    }
  }

  async function guardar() {
    if (!usuario) return;
    setGuardando(true);

    const cambios: { nombre: string; rol: string; foto_url?: string | null } = {
      nombre: form.nombre.trim() || usuario.nombre,
      rol: form.rol,
    };
    // Solo se envía la foto si cambió, para no reenviar una imagen sin modificar.
    const fotoNueva = form.foto_url.trim();
    if (fotoNueva !== (usuario.foto_url ?? "")) {
      cambios.foto_url = fotoNueva || null;
    }

    const { error } = await supabase.from("usuarios").update(cambios).eq("id", usuario.id);

    let errorRol: string | null = null;
    if (!error) {
      if (form.rol === "admin" && !usuario.esAdmin) {
        const { error: e } = await supabase
          .from("user_roles")
          .insert({ user_id: usuario.id, role: "admin" });
        errorRol = e?.message ?? null;
      } else if (form.rol !== "admin" && usuario.esAdmin) {
        const { error: e } = await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", usuario.id)
          .eq("role", "admin");
        errorRol = e?.message ?? null;
        if (!errorRol) {
          await supabase
            .from("user_roles")
            .upsert({ user_id: usuario.id, role: "cajera" }, { onConflict: "user_id,role" });
        }
      }
    }
    setGuardando(false);

    if (error || errorRol) {
      toast.error(error?.message ?? errorRol ?? "No se pudo guardar");
      return;
    }
    toast.success("Usuario actualizado");
    await queryClient.invalidateQueries({ queryKey: ["usuarios"] });
    await queryClient.invalidateQueries({ queryKey: ["perfil"] });
    onOpenChange(false);
  }

  const iniciales = (form.nombre || "??").slice(0, 2).toUpperCase();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="border-b p-4 text-left">
          <DialogTitle>Editar usuario</DialogTitle>
          <DialogDescription>
            Cambia la foto, el nombre visible y el nivel de acceso.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          <div className="flex items-center gap-3">
            {form.foto_url ? (
              <img
                src={form.foto_url}
                alt="Foto de perfil"
                referrerPolicy="no-referrer"
                className="h-16 w-16 shrink-0 rounded-full object-cover"
              />
            ) : (
              <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-flame text-base font-bold text-flame-foreground">
                {iniciales}
              </div>
            )}
            <div className="min-w-0">
              <Button
                variant="outline"
                className="h-10"
                onClick={() => archivoRef.current?.click()}
                disabled={procesandoFoto}
              >
                {procesandoFoto ? "Procesando…" : "Subir imagen"}
              </Button>
              <input
                ref={archivoRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void subirImagen(file);
                  e.target.value = "";
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
            <Label htmlFor="ua-url">Foto (URL)</Label>
            <Input
              id="ua-url"
              className="h-11"
              placeholder="https://…"
              value={form.foto_url.startsWith("data:") ? "" : form.foto_url}
              onChange={(e) => setForm({ ...form, foto_url: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ua-nombre">Nombre para mostrar</Label>
            <Input
              id="ua-nombre"
              className="h-11"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            />
          </div>

          <div className="grid gap-3">
            <div className="space-y-1.5">
              <Label>Acceso</Label>
              <Select value={form.rol} onValueChange={(rol) => setForm({ ...form, rol })}>
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cajera">Cajera</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-lg border bg-muted/40 p-3">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Correo</p>
            <p className="truncate text-sm font-medium">{usuario?.correo || "—"}</p>
          </div>

          {/* <BitacoraRegistro
            entityType="usuario"
            entityId={usuario?.id}
            titulo="Historial de la cuenta"
          /> */}
        </div>

        <DialogFooter className="sticky bottom-0 gap-2 border-t bg-card p-4 sm:gap-2">
          <Button variant="outline" className="h-11" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            variant="flame"
            className="h-11"
            onClick={guardar}
            disabled={guardando || procesandoFoto}
          >
            {guardando ? "Guardando…" : "Guardar cambios"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
