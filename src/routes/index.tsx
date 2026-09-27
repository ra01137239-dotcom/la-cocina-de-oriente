import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Logo } from "@/components/pos/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { NEGOCIO } from "@/lib/pos";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "La Cocina de Oriente POS — Punto de venta para pupuserías" },
      {
        name: "description",
        content:
          "Sistema de punto de venta para pupuserías salvadoreñas: pedidos, inventario de materia prima, tickets térmicos e historial de ventas.",
      },
      { property: "og:title", content: "La Cocina de Oriente POS" },
      {
        property: "og:description",
        content:
          "Punto de venta, inventario y tickets de cocina para pupuserías salvadoreñas.",
      },
    ],
  }),
  component: LoginPage,
});

const CHIPS = ["Pupusas", "Bebidas", "Acompañamientos", "Comedor", "Para llevar"];

function LoginPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"cajera" | "admin">("cajera");
  const [modo, setModo] = useState<"entrar" | "registrar">("entrar");
  const [correo, setCorreo] = useState("");
  const [clave, setClave] = useState("");
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/pos", replace: true });
    });
  }, [navigate]);

  async function recuperar() {
    if (!correo) {
      toast.error("Escribe tu correo para enviarte el enlace de recuperación");
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(correo, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Te enviamos un enlace para restablecer tu contraseña");
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setCargando(true);
    if (typeof window !== "undefined") window.localStorage.setItem("cocina-rol", tab);
    try {
      if (modo === "registrar") {
        const { data, error } = await supabase.auth.signUp({
          email: correo,
          password: clave,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        if (!data.session) {
          toast.success("Cuenta creada. Revisa tu correo para confirmarla.");
          setModo("entrar");
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: correo,
          password: clave,
        });
        if (error) throw error;
      }
      navigate({ to: "/pos", replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo iniciar sesión");
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="min-h-screen bg-brand px-4 py-8 text-brand-foreground sm:px-8">
      <div className="mx-auto grid max-w-6xl items-center gap-8 md:grid-cols-[1.1fr_minmax(0,420px)] md:gap-16 md:py-16">
        <section className="space-y-6">
          <div className="flex flex-col items-start gap-3">
            <Logo size="lg" />
            <div className="min-w-0">
              <h1 className="text-2xl font-extrabold tracking-tight sm:text-4xl">{NEGOCIO.nombre}</h1>
              <p className="text-sm text-brand-foreground/70">Punto de Venta</p>
            </div>
          </div>
          <p className="max-w-lg text-sm leading-relaxed text-brand-foreground/80 sm:text-base">
            Toma pedidos en comedor o para llevar, controla la materia prima de la cocina e imprime
            comandas y tickets térmicos de 80 mm desde cualquier dispositivo del negocio.
          </p>
          <ul className="flex flex-wrap gap-2">
            {CHIPS.map((chip) => (
              <li
                key={chip}
                className="rounded-full border border-brand-foreground/20 bg-brand-deep px-3 py-1 text-xs font-medium text-brand-foreground/85"
              >
                {chip}
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl bg-card p-5 text-card-foreground shadow-lifted sm:p-7">
          <div className="mb-5 grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
            {(
              [
                ["cajera", "Correo Electrónico"],
                ["admin", "Administrador"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setTab(value)}
                className={`rounded-lg px-3 py-2 text-xs font-semibold transition-colors sm:text-sm ${
                  tab === value
                    ? "bg-card text-brand shadow-soft"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <h2 className="text-lg font-bold tracking-tight">
            {modo === "entrar" ? "Iniciar sesión" : "Crear cuenta"}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {tab === "admin"
              ? "Acceso con permisos de administración del negocio."
              : "Acceso para el personal de caja del turno."}
          </p>

          <form className="mt-5 space-y-4" onSubmit={enviar}>
            <div className="space-y-1.5">
              <Label htmlFor="correo">Correo electrónico</Label>
              <Input
                id="correo"
                type="email"
                required
                autoComplete="email"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                placeholder="cajera@lacocinadeoriente.sv"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="clave">Contraseña</Label>
              <Input
                id="clave"
                type="password"
                required
                minLength={6}
                autoComplete={modo === "entrar" ? "current-password" : "new-password"}
                value={clave}
                onChange={(e) => setClave(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <Button type="submit" variant="flame" className="h-11 w-full" disabled={cargando}>
              {cargando ? "Un momento…" : modo === "entrar" ? "Entrar al POS" : "Crear cuenta"}
            </Button>
          </form>

          <button
            type="button"
            className="mt-4 w-full text-center text-xs font-semibold text-flame hover:underline"
            onClick={() => void recuperar()}
          >
            ¿Olvidaste tu contraseña?
          </button>

          <button
            type="button"
            className="mt-3 w-full text-center text-xs font-medium text-muted-foreground hover:text-foreground"
            onClick={() => setModo(modo === "entrar" ? "registrar" : "entrar")}
          >
            {modo === "entrar" ? "¿No tienes cuenta? Crear una" : "Ya tengo cuenta, iniciar sesión"}
          </button>

        </section>
      </div>
    </div>
  );
}
