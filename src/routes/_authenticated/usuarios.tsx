import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Check, Pencil, ShieldCheck, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { UsuarioAdminDialog } from "@/components/pos/UsuarioAdminDialog";
import { supabase } from "@/integrations/supabase/client";
import { useEsAdmin, useSesion, useUsuarios, type UsuarioAdmin } from "@/lib/data";
import { eliminarUsuario } from "@/lib/usuarios.functions";

export const Route = createFileRoute("/_authenticated/usuarios")({
  head: () => ({
    meta: [
      { title: "Gestión de usuarios — La Cocina de Oriente POS" },
      {
        name: "description",
        content:
          "Panel del administrador para admitir, editar y eliminar las cuentas del personal del punto de venta.",
      },
      { property: "og:title", content: "Usuarios — La Cocina de Oriente POS" },
      {
        property: "og:description",
        content: "Admite, edita o elimina las cuentas del personal de la pupusería.",
      },
    ],
  }),
  component: Usuarios,
});

function Usuarios() {
  const queryClient = useQueryClient();
  const { userId } = useSesion();
  const { esAdmin, cargando } = useEsAdmin();
  const { data: usuarios = [], isLoading } = useUsuarios(esAdmin);
  const borrar = useServerFn(eliminarUsuario);
  const [editando, setEditando] = useState<UsuarioAdmin | null>(null);

  if (cargando) {
    return <p className="p-8 text-center text-sm text-muted-foreground">Cargando…</p>;
  }

  if (!esAdmin) {
    return (
      <div className="rounded-xl border border-dashed p-10 text-center">
        <ShieldCheck className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
        <p className="text-sm font-semibold">Solo el administrador puede gestionar usuarios.</p>
      </div>
    );
  }

  async function cambiarAprobacion(u: UsuarioAdmin, aprobado: boolean) {
    const { error } = await supabase.from("usuarios").update({ aprobado }).eq("id", u.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(aprobado ? `${u.nombre} admitido` : `${u.nombre} suspendido`);
    await queryClient.invalidateQueries({ queryKey: ["usuarios"] });
  }

  async function eliminar(u: UsuarioAdmin) {
    if (!window.confirm(`¿Eliminar la cuenta de ${u.nombre}? Esta acción no se puede deshacer.`))
      return;
    try {
      await borrar({ data: { userId: u.id } });
      toast.success("Cuenta eliminada");
      await queryClient.invalidateQueries({ queryKey: ["usuarios"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo eliminar");
    }
  }

  return (
    <div className="min-w-0 space-y-4">
      <div className="min-w-0">
        <h1 className="truncate text-xl font-extrabold tracking-tight sm:text-2xl">Usuarios</h1>
        <p className="text-xs text-muted-foreground">
          Admite al personal nuevo, edita sus datos o elimina cuentas.
        </p>
      </div>

      <div className="space-y-3">
        {usuarios.map((u) => (
          <article
            key={u.id}
            className="space-y-3 rounded-xl border bg-card p-3 shadow-soft sm:flex sm:items-center sm:gap-4 sm:space-y-0"
          >
            {u.foto_url ? (
              <img
                src={u.foto_url}
                alt={u.nombre}
                referrerPolicy="no-referrer"
                className="h-12 w-12 shrink-0 rounded-full object-cover"
              />
            ) : (
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-flame text-xs font-bold text-flame-foreground">
                {(u.nombre || "??").slice(0, 2).toUpperCase()}
              </div>
            )}

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">
                {u.nombre} {u.id === userId && <span className="text-muted-foreground">(tú)</span>}
              </p>
              <p className="truncate text-xs text-muted-foreground">{u.correo}</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold text-brand">
                  {u.esAdmin ? "Administrador" : "Cajera"}
                </span>
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                    u.aprobado ? "bg-success/12 text-success" : "bg-destructive/12 text-destructive"
                  }`}
                >
                  {u.aprobado ? "Admitido" : "Pendiente"}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:flex sm:shrink-0">
              <Button
                variant="outline"
                className="h-11"
                onClick={() => void cambiarAprobacion(u, !u.aprobado)}
                disabled={u.id === userId}
              >
                {u.aprobado ? <X /> : <Check />}
                <span className="sm:hidden">{u.aprobado ? "Suspender" : "Admitir"}</span>
                <span className="hidden sm:inline">{u.aprobado ? "Suspender" : "Admitir"}</span>
              </Button>
              <Button variant="outline" className="h-11" onClick={() => setEditando(u)}>
                <Pencil /> Editar
              </Button>
              <Button
                variant="outline"
                className="h-11 text-destructive"
                onClick={() => void eliminar(u)}
                disabled={u.id === userId}
              >
                <Trash2 /> Eliminar
              </Button>
            </div>
          </article>
        ))}
        {!usuarios.length && (
          <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            {isLoading ? "Cargando usuarios…" : "Aún no hay usuarios registrados."}
          </p>
        )}
      </div>

      <UsuarioAdminDialog
        usuario={editando}
        open={!!editando}
        onOpenChange={(open) => !open && setEditando(null)}
      />
    </div>
  );
}
