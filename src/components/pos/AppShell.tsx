import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ClipboardList,
  Clock,
  History,
  LogOut,
  Package,
  ShieldCheck,
  Store,
  UserCog,
  Users,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";

import { ImpresoraBluetooth } from "./ImpresoraBluetooth";
import { Logo } from "./Logo";
import { PerfilDialog } from "./PerfilDialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePerfil, useEsAdmin } from "@/lib/data";
import { supabase } from "@/integrations/supabase/client";
import { NEGOCIO } from "@/lib/pos";

const TABS = [
  { to: "/pos", label: "Punto de Venta", corto: "Venta", icon: Store, soloAdmin: false },
  { to: "/inventario", label: "Inventario", corto: "Inventario", icon: Package, soloAdmin: false },
  {
    to: "/pedidos-activos",
    label: "Pedidos Activos",
    corto: "Activos",
    icon: ClipboardList,
    soloAdmin: false,
  },
  { to: "/historial", label: "Historial de Pedidos", corto: "Historial", icon: History, soloAdmin: false },
  { to: "/usuarios", label: "Usuarios", corto: "Usuarios", icon: Users, soloAdmin: true },
  { to: "/auditoria", label: "Auditoría", corto: "Auditoría", icon: ShieldCheck, soloAdmin: true },
] as const;


function Reloj() {
  const [hora, setHora] = useState<string>("");
  useEffect(() => {
    const tick = () =>
      setHora(new Date().toLocaleTimeString("es-SV", { hour: "2-digit", minute: "2-digit" }));
    tick();
    const id = window.setInterval(tick, 15000);
    return () => window.clearInterval(id);
  }, []);
  return (
    <span className="inline-flex items-center gap-1.5 text-sm font-medium tabular-nums text-brand-foreground/85">
      <Clock className="h-4 w-4" />
      {hora}
    </span>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { data: perfil } = usePerfil();
  const { esAdmin } = useEsAdmin();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [editarPerfil, setEditarPerfil] = useState(false);

  const tabs = TABS.filter((tab) => !tab.soloAdmin || esAdmin);
  const pendiente = !!perfil && !perfil.aprobado && !esAdmin;

  const iniciales = (perfil?.nombre ?? "??").slice(0, 2).toUpperCase();

  async function salir() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  }

  const avatar = perfil?.foto_url ? (
    <img
      src={perfil.foto_url}
      alt={perfil.nombre}
      className="h-10 w-10 shrink-0 rounded-full object-cover"
    />
  ) : (
    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-flame text-xs font-bold text-flame-foreground">
      {iniciales}
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-brand text-brand-foreground shadow-lifted">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-3 px-3 py-3 sm:px-5">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <Logo size="sm" />
              <div className="min-w-0">
                <p className="truncate text-sm font-extrabold tracking-tight sm:text-base">
                  {NEGOCIO.nombre}
                </p>
                <p className="truncate text-[11px] text-brand-foreground/70">POS · Pupusería</p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2 sm:gap-4">
              <ImpresoraBluetooth />
              <Reloj />
              <DropdownMenu>
                <DropdownMenuTrigger
                  aria-label="Menú de usuario"
                  className="flex min-w-0 items-center gap-2 rounded-full border-l border-brand-foreground/15 pl-2 outline-none sm:pl-4"
                >
                  {avatar}
                  <div className="hidden min-w-0 text-left leading-tight md:block">
                    <p className="truncate text-xs font-semibold">{perfil?.nombre ?? "Cargando…"}</p>
                    <p className="truncate text-[11px] text-brand-foreground/65">
                      {perfil?.rol === "admin" ? "Administrador" : "Cajera"}
                    </p>
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="truncate">
                    {perfil?.nombre ?? "Usuaria"}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="py-2.5" onSelect={() => setEditarPerfil(true)}>
                    <UserCog className="mr-2 h-4 w-4" /> Editar Perfil
                  </DropdownMenuItem>
                  <DropdownMenuItem className="py-2.5 text-destructive" onSelect={() => void salir()}>
                    <LogOut className="mr-2 h-4 w-4" /> Cerrar Sesión
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Navegación en tablet y desktop */}
          <nav className="-mx-1 hidden items-stretch gap-1 overflow-x-auto pb-0.5 sm:flex">
            {tabs.map((tab) => (
              <Link
                key={tab.to}
                to={tab.to}
                className="shrink-0 rounded-lg px-3 py-2.5 text-sm font-semibold text-brand-foreground/70 transition-colors hover:bg-brand-deep hover:text-brand-foreground"
                activeProps={{ className: "bg-flame text-flame-foreground hover:bg-flame" }}
              >
                {tab.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto min-w-0 max-w-[1600px] overflow-x-clip px-3 pb-24 pt-4 sm:px-5 sm:py-6 sm:pb-6">
        {pendiente ? (
          <div className="mx-auto max-w-md rounded-xl border border-dashed p-10 text-center">
            <p className="text-base font-semibold">Tu cuenta está pendiente de admisión</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Pídele al administrador del negocio que apruebe tu acceso para empezar a usar el
              punto de venta.
            </p>
          </div>
        ) : (
          children
        )}
      </main>

      {/* Navegación inferior en mobile */}
      <nav
        style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
        className="fixed inset-x-0 bottom-0 z-40 grid border-t bg-card pb-[env(safe-area-inset-bottom)] shadow-lifted sm:hidden"
      >
        {tabs.map((tab) => (
          <Link
            key={tab.to}
            to={tab.to}
            className="flex min-h-[56px] flex-col items-center justify-center gap-1 px-1 text-[11px] font-semibold text-muted-foreground"
            activeProps={{ className: "text-flame" }}
          >
            <tab.icon className="h-5 w-5" />
            <span className="truncate">{tab.corto}</span>
          </Link>
        ))}
      </nav>

      <PerfilDialog perfil={perfil} open={editarPerfil} onOpenChange={setEditarPerfil} />
    </div>
  );
}
