import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { Logo } from "@/components/pos/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Restablecer contraseña — La Cocina de Oriente POS" },
      {
        name: "description",
        content: "Define una nueva contraseña para tu cuenta del punto de venta.",
      },
      { property: "og:title", content: "Restablecer contraseña — La Cocina de Oriente POS" },
      {
        property: "og:description",
        content: "Define una nueva contraseña para entrar al punto de venta.",
      },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [clave, setClave] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [guardando, setGuardando] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (clave !== confirmar) {
      toast.error("Las contraseñas no coinciden");
      return;
    }
    setGuardando(true);
    const { error } = await supabase.auth.updateUser({ password: clave });
    setGuardando(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Contraseña actualizada");
    navigate({ to: "/pos", replace: true });
  }

  return (
    <div className="grid min-h-screen place-items-center bg-brand px-4 py-10 text-brand-foreground">
      <div className="w-full max-w-md space-y-6">
        <div className="flex items-center gap-3">
          <Logo size="lg" />
          <div>
            <h1 className="text-xl font-extrabold tracking-tight">Nueva contraseña</h1>
            <p className="text-sm text-brand-foreground/70">Define tu clave de acceso</p>
          </div>
        </div>
        <form
          onSubmit={enviar}
          className="space-y-4 rounded-2xl bg-card p-5 text-card-foreground shadow-lifted sm:p-7"
        >
          <div className="space-y-1.5">
            <Label htmlFor="np">Nueva contraseña</Label>
            <Input
              id="np"
              type="password"
              required
              minLength={6}
              className="h-11"
              value={clave}
              onChange={(e) => setClave(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="np2">Confirmar contraseña</Label>
            <Input
              id="np2"
              type="password"
              required
              minLength={6}
              className="h-11"
              value={confirmar}
              onChange={(e) => setConfirmar(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <Button type="submit" variant="flame" className="h-11 w-full" disabled={guardando}>
            {guardando ? "Guardando…" : "Guardar contraseña"}
          </Button>
          <button
            type="button"
            className="w-full text-center text-xs font-medium text-muted-foreground hover:text-foreground"
            onClick={() => navigate({ to: "/" })}
          >
            Volver al inicio de sesión
          </button>
        </form>
      </div>
    </div>
  );
}
