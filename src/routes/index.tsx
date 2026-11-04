
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import {
  Eye,
  EyeOff,
  ShoppingBag,
  UtensilsCrossed,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { registroSchema } from "@/lib/registro-schema";
import { crearCuenta } from "@/lib/registro.functions";
import { Logo } from "@/components/pos/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { NEGOCIO } from "@/lib/pos";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "La Cocina de Oriente | Punto de Venta" },
      {
        name: "description",
        content:
          "Sistema de punto de venta para La Cocina de Oriente. Administra pedidos, inventario, ventas y tickets desde cualquier dispositivo.",
      },
    ],
  }),
  component: LoginPage,
});

const CATEGORIAS = [
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
  const [confirmarEdad, setConfirmarEdad] = useState(false);
  const [mayorDeEdad, setMayorDeEdad] = useState(false);

  const registrar = useServerFn(crearCuenta);

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

  async function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (modo === "registrar") {
      const validacion = registroSchema.safeParse({
        correo: correo.trim(),
        clave,
        mayorDeEdad: true,
      });

      if (!validacion.success) {
        toast.error(
          validacion.error.issues[0]?.message ?? "Revisa tus datos"
        );
        return;
      }

      setMayorDeEdad(false);
      setConfirmarEdad(true);
      return;
    }

    await procesar(false);
  }

  async function procesar(confirmado: boolean) {
    if (modo === "registrar" && !confirmado) return;

    setCargando(true);

    try {
      if (modo === "registrar") {
        const data = await registrar({
          data: {
            correo: correo.trim(),
            clave,
            mayorDeEdad: confirmado,
          },
        });

        setConfirmarEdad(false);

        if (!data.session) {
          toast.success(
            "Cuenta creada. Revisa tu correo para confirmarla."
          );
          setModo("entrar");
          setClave("");
          setMostrarClave(false);
          return;
        }

        const { error } = await supabase.auth.setSession(data.session);

        if (error) throw error;

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
      setConfirmarEdad(false);

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
    <div className="min-h-screen bg-background">
      <main className="mx-auto flex min-h-screen w-full max-w-[1440px] flex-col lg:grid lg:grid-cols-2">

        {/* PRESENTACIÓN */}
        <section className="relative flex flex-col justify-center overflow-hidden bg-brand px-4 py-4 text-brand-foreground sm:px-10 sm:py-8 lg:min-h-screen lg:px-12 lg:py-12 xl:px-20">

          <div className="pointer-events-none absolute -right-28 -top-28 h-80 w-80 rounded-full border border-white/10" />
          <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full border border-white/10" />
          <div className="pointer-events-none absolute -bottom-36 -left-28 h-80 w-80 rounded-full border border-white/10" />

          <div className="relative z-10 mx-auto w-full max-w-xl">

            {/* LOGO DEL NEGOCIO */}
            <div className="flex items-center gap-3 sm:gap-5">
              <Logo size="md" />

              <div className="min-w-0">
                <h1 className="text-xl font-extrabold leading-tight tracking-tight sm:text-3xl">
                  {NEGOCIO.nombre}
                </h1>

                <p className="mt-1 text-xs font-medium tracking-wide text-amber-300 sm:text-sm">
                  Punto de Venta
                </p>
              </div>
            </div>

            {/* DESCRIPCIÓN */}
            <div className="mt-3 space-y-1.5 sm:mt-7 sm:space-y-3 lg:mt-12">
              <div className="flex items-center gap-2 text-amber-300">
                <UtensilsCrossed className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="text-[10px] font-bold uppercase tracking-[0.15em] sm:text-xs sm:tracking-[0.18em]">
                  Tradición y tecnología
                </span>
              </div>

              <h2 className="text-xl font-extrabold leading-tight sm:text-3xl lg:text-4xl">
                Tu negocio, organizado en un solo lugar.
              </h2>

              <p className="max-w-lg text-[11px] leading-snug text-brand-foreground/80 sm:text-sm sm:leading-7 lg:text-base">
                Toma pedidos en comedor o para llevar, controla la
                materia prima de la cocina e imprime comandas y
                tickets térmicos de 80 mm desde cualquier dispositivo
                del negocio.
              </p>
            </div>

            {/* CATEGORÍAS */}
            <div className="mt-3 flex flex-wrap gap-1.5 sm:mt-7 sm:gap-2">
              {CATEGORIAS.map((categoria) => (
                <span
                  key={categoria}
                  className="rounded-full border border-white/25 bg-white/5 px-2.5 py-1 text-[9px] font-medium text-white sm:px-3 sm:py-1.5 sm:text-xs"
                >
                  {categoria}
                </span>
              ))}
            </div>

            <div className="mt-6 hidden border-l-2 border-amber-300 pl-4 sm:block lg:mt-10">
              <p className="text-sm italic text-brand-foreground/75">
                "La tradición de nuestra cocina, acompañada de una
                gestión más sencilla y eficiente."
              </p>
            </div>
          </div>
        </section>

        {/* INICIO DE SESIÓN */}
        <section className="flex flex-1 items-center justify-center bg-background px-4 py-5 sm:px-10 sm:py-10 lg:min-h-screen lg:px-12">
          <div className="w-full max-w-md">

            <div className="mb-3 sm:mb-8">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand sm:mb-4 sm:h-14 sm:w-14">
                <ShoppingBag className="h-5 w-5 sm:h-7 sm:w-7" />
              </div>

              <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-brand sm:text-xs">
                ACCESO AL SISTEMA
              </p>

              <h2 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
                {modo === "entrar" ? "Iniciar sesión" : "Crear una cuenta"}
              </h2>

              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground sm:mt-2 sm:text-sm">
                {modo === "entrar"
                  ? "Ingresa tus datos para acceder al sistema."
                  : "Completa tus datos para crear tu cuenta de acceso."}
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-card p-4 shadow-lg sm:p-7">
              <form className="space-y-3 sm:space-y-5" onSubmit={enviar}>

                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="correo">Correo electrónico</Label>
                  <Input
                    id="correo"
                    type="email"
                    required
                    autoComplete="email"
                    value={correo}
                    onChange={(e) => setCorreo(e.target.value)}
                    placeholder="Ingresa tu correo electrónico"
                    disabled={cargando}
                    className="h-10 sm:h-11"
                  />
                </div>

                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="clave">Contraseña</Label>

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
                      placeholder="Ingresa tu contraseña"
                      className="h-10 pr-12 sm:h-11"
                      disabled={cargando}
                    />

                    <button
                      type="button"
                      onClick={() => setMostrarClave((actual) => !actual)}
                      aria-label={
                        mostrarClave ? "Ocultar contraseña" : "Mostrar contraseña"
                      }
                      aria-pressed={mostrarClave}
                      disabled={cargando}
                      className="absolute inset-y-0 right-0 flex items-center justify-center px-3 text-muted-foreground hover:text-foreground disabled:opacity-50"
                    >
                      {mostrarClave ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  variant="flame"
                  className="h-10 w-full text-sm font-bold sm:h-12"
                  disabled={cargando}
                >
                  {cargando
                    ? "Un momento…"
                    : modo === "entrar"
                      ? "Entrar al POS"
                      : "Crear cuenta"}
                </Button>
              </form>

              {modo === "entrar" && (
                <button
                  type="button"
                  className="mt-3 w-full text-center text-xs font-semibold text-flame hover:underline disabled:opacity-50 sm:mt-4"
                  onClick={() => void recuperar()}
                  disabled={cargando}
                >
                  ¿Olvidaste tu contraseña?
                </button>
              )}

              <div className="mt-4 border-t border-border pt-3 sm:mt-5 sm:pt-4">
                <button
                  type="button"
                  className="w-full text-center text-xs font-medium text-muted-foreground hover:text-brand disabled:opacity-50 sm:text-sm"
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
              </div>
            </div>

            <div className="mt-4 flex items-center justify-center gap-2 text-center text-[10px] text-muted-foreground sm:mt-5 sm:text-xs">
              <ShieldCheck className="h-4 w-4 shrink-0 text-brand" />
              Acceso protegido para usuarios autorizados.
            </div>
          </div>
        </section>
      </main>

     
{/* PIE INSTITUCIONAL */}
<footer className="border-t border-border bg-card px-4 py-3 sm:px-8 sm:py-4">
  <div className="mx-auto flex max-w-7xl flex-col items-center justify-center gap-3 sm:flex-row sm:justify-between">

    {/* LOGO Y UNIVERSIDAD */}
    <div className="flex items-center justify-center gap-2.5 sm:justify-start sm:gap-3">
      <img
        src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTQUKNP5HJCF7sA9MTXbpI2sSi4U-rcSQ9tiB-TmvaRQV_g2GNRRn4QRUYK&s=10"
        alt="Universidad Luterana Salvadoreña"
        className="h-7 w-auto max-w-[75px] object-contain sm:h-9 sm:max-w-[95px]"
      />

      <div>
        <p className="text-[10px] font-bold text-foreground sm:text-xs">
          Universidad Luterana Salvadoreña
        </p>
        <p className="text-[9px] text-muted-foreground sm:text-[10px]">
          Práctica Profesional Informática
        </p>
      </div>
    </div>

    {/* INFORMACIÓN DEL PROYECTO */}
    <div className="text-center sm:text-right">
      <p className="text-[10px] font-semibold text-foreground sm:text-xs">
        La Cocina de Oriente
      </p>
      <p className="text-[9px] text-muted-foreground sm:text-[10px]">
        Proyecto académico
      </p>
      <p className="text-[9px] text-muted-foreground">
        © {new Date().getFullYear()} Todos los derechos reservados.
      </p>
    </div>

  </div>
</footer>


      {/* CONFIRMACIÓN DE MAYORÍA DE EDAD */}
      <AlertDialog
        open={confirmarEdad}
        onOpenChange={(open) => {
          if (!cargando) setConfirmarEdad(open);
        }}
      >
        <AlertDialogContent className="max-w-[calc(100%-2rem)] sm:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>
              Confirmar mayoría de edad
            </AlertDialogTitle>
            <AlertDialogDescription>
              Para crear tu cuenta, confirma que eres mayor de 18 años.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <Label
            htmlFor="mayor-edad"
            className="flex min-h-11 cursor-pointer items-center gap-3 py-2 leading-relaxed"
          >
            <Checkbox
              id="mayor-edad"
              checked={mayorDeEdad}
              onCheckedChange={(value) => setMayorDeEdad(value === true)}
              disabled={cargando}
            />
            Confirmo que soy mayor de 18 años
          </Label>

          <AlertDialogFooter className="gap-2">
            <Button
              variant="outline"
              className="h-11"
              disabled={cargando}
              onClick={() => setConfirmarEdad(false)}
            >
              Cancelar
            </Button>

            <Button
              variant="flame"
              className="h-11"
              disabled={!mayorDeEdad || cargando}
              onClick={() => void procesar(mayorDeEdad)}
            >
              {cargando ? "Creando cuenta…" : "Confirmar y crear cuenta"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
