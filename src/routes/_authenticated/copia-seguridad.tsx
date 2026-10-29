import { createFileRoute } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { useEsAdmin } from "@/lib/data";

export const Route = createFileRoute("/_authenticated/copia-seguridad")({
  head: () => ({ meta: [
    { title: "Copias de seguridad — La Cocina de Oriente POS" },
  ] }),
  component: CopiasSeguridad,
});

function CopiasSeguridad() {
  const { esAdmin, cargando } = useEsAdmin();

  if (cargando) return <p className="p-8 text-center text-muted-foreground">Cargando…</p>;
  if (!esAdmin) return (
    <div className="py-10 text-center">
      <ShieldCheck className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
      <p>Solo el administrador puede acceder a las copias de seguridad.</p>
    </div>
  );

  return <div className="min-w-0" />;
}