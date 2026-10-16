
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
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

const CHIPS = [
  "Pupusas",
  "Bebidas",
  "Acompañamientos",
  "Comedor",
  "Para llevar",
];

function LoginPage() {
  const navigate = useNavigate();

  const [modo, setModo] = useState<"entrar" | "registrar">("entrar");
  const [correo, setCorreo] = useState("");
  const [clave, setClave] = useState("");
  const [mostrarClave, setMostrarClave] = useState(false);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    let activo = true;

    async function verificarSesion() {
      const { data, error } = await supabase.auth.getSession();

      if (!activo || error) return;

      if (data.session) {
        navigate({ to: "/pos", replace: true });
      }
    }

    void verificarSesion();

    return () => {
      activo = false;
    };
  }, [navigate]);

  async function recuperar() {
    if (!correo.trim()) {
      toast.error(
        "Escribe tu correo para enviarte el enlace de recuperación"
      );
      return;
    }

    setCargando(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        correo.trim(),
        {
          redirectTo: `${window.location.origin}/reset-password`,
        }
      );

      if (error) {
        toast.error(error.message);
        return;
      }

      toast.success(
        "Te enviamos un enlace para restablecer tu contraseña"
      );
    } catch {
      toast.error("No se pudo solicitar la recuperación de contraseña");
    } finally {
      setCargando(false);
    }
  }

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCargando(true);

    try {
      if (modo === "registrar") {
        const { data, error } = await supabase.auth.signUp({
          email: correo.trim(),
          password: clave,
          options: {
            emailRedirectTo: window.location.origin,
          },
        });

        if (error) throw error;

        if (!data.session) {
          toast.success(
            "Cuenta creada. Revisa tu correo para confirmarla."
          );
          setModo("entrar");
          setClave("");
          setMostrarClave(false);
          return;
        }

        toast.success("¡Cuenta creada correctamente!");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: correo.trim(),
          password: clave,
        });

        if (error) throw error;

        toast.success("¡Bienvenido a La Cocina de Oriente!");
      }

      navigate({ to: "/pos", replace: true });
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "No se pudo iniciar sesión"
      );
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="min-h-screen bg-brand px-4 py-8 text-brand-foreground sm:px-8">
      <div className="mx-auto grid max-w-6xl items-center gap-8 md:grid-cols-[1.1fr_minmax(0,420px)] md:gap-16 md:py-16">
        {/* Presentación del negocio */}
        <section className="space-y-6">
          <div className="flex flex-col items-start gap-3">
            <Logo size="lg" />

            <div className="min-w-0">
              <h1 className="text-2xl font-extrabold tracking-tight sm:text-4xl">
                {NEGOCIO.nombre}
              </h1>

              <p className="text-sm text-brand-foreground/70">
                Punto de Venta
              </p>
            </div>
          </div>

          <p className="max-w-lg text-sm leading-relaxed text-brand-foreground/80 sm:text-base">
            Toma pedidos en comedor o para llevar, controla la materia
            prima de la cocina e imprime comandas y tickets térmicos
            de 80 mm desde cualquier dispositivo del negocio.
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

        {/* Formulario de acceso */}
        <section className="rounded-2xl bg-card p-5 text-card-foreground shadow-lifted sm:p-7">
          <div className="mb-5 grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
            {(
              [
                ["cajera", "Correo Electrónico"],
                //["admin", "Administrador"],
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
            Ingresa tus datos para acceder al sistema.
          </p>

          <form className="mt-5 space-y-4" onSubmit={enviar}>
            {/* Correo electrónico */}
            <div className="space-y-1.5">
              <Label htmlFor="correo">
                Correo electrónico
              </Label>

              <Input
                id="correo"
                type="email"
                required
                autoComplete="email"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                placeholder="cajera@lacocinadeoriente.sv"
                disabled={cargando}
              />
            </div>

            {/* Contraseña con opción para mostrarla */}
            <div className="space-y-1.5">
              <Label htmlFor="clave">
                Contraseña
              </Label>

              <div className="relative">
                <Input
                  id="clave"
                  type={mostrarClave ? "text" : "password"}
                  required
                  minLength={6}
                  autoComplete={
                    modo === "entrar"
                      ? "current-password"
                      : "new-password"
                  }
                  value={clave}
                  onChange={(e) => setClave(e.target.value)}
                  placeholder="••••••••"
                  className="pr-12"
                  disabled={cargando}
                />

                <button
                  type="button"
                  onClick={() =>
                    setMostrarClave((actual) => !actual)
                  }
                  aria-label={
                    mostrarClave
                      ? "Ocultar contraseña"
                      : "Mostrar contraseña"
                  }
                  aria-pressed={mostrarClave}
                  disabled={cargando}
                  className="absolute inset-y-0 right-0 flex items-center justify-center px-3 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
                >
                  {mostrarClave ? (
                    <EyeOff size={19} />
                  ) : (
                    <Eye size={19} />
                  )}
                </button>
              </div>
            </div>

            {/* Botón para ingresar o registrarse */}
            <Button
              type="submit"
              variant="flame"
              className="h-11 w-full"
              disabled={cargando}
            >
              {cargando
                ? "Un momento…"
                : modo === "entrar"
                  ? "Entrar al POS"
                  : "Crear cuenta"}
            </Button>
          </form>

          {/* Recuperar contraseña */}
          {modo === "entrar" && (
            <button
              type="button"
              className="mt-4 w-full text-center text-xs font-semibold text-flame hover:underline disabled:opacity-50"
              onClick={() => void recuperar()}
              disabled={cargando}
            >
              ¿Olvidaste tu contraseña?
            </button>
          )}

          {/* Cambiar entre iniciar sesión y registrarse */}
          <button
            type="button"
            className="mt-3 w-full text-center text-xs font-medium text-muted-foreground hover:text-foreground disabled:opacity-50"
            onClick={() => {
              setModo((actual) =>
                actual === "entrar" ? "registrar" : "entrar"
              );
              setClave("");
              setMostrarClave(false);
            }}
            disabled={cargando}
          >
            {modo === "entrar"
              ? "¿No tienes cuenta? Crear una"
              : "Ya tengo cuenta, iniciar sesión"}
          </button>
        </section>
      </div>
    </div>
  );
}
