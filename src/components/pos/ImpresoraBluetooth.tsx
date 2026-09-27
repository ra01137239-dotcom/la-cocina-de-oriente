import { useEffect, useState } from "react";
import { Printer, PrinterCheck } from "lucide-react";
import { toast } from "sonner";

import {
  conectarImpresora,
  desconectarImpresora,
  suscribirImpresora,
} from "@/lib/impresora";

export function ImpresoraBluetooth() {
  const [estado, setEstado] = useState<
    "sin-soporte" | "desconectada" | "conectando" | "conectada"
  >("desconectada");
  const [nombre, setNombre] = useState<string | null>(null);

  useEffect(() => {
    const cancelar = suscribirImpresora((e, n) => {
      setEstado(e);
      setNombre(n);
    });
    return () => {
      cancelar();
    };
  }, []);

  async function alternar() {
    if (estado === "conectada") {
      desconectarImpresora();
      toast.success("Impresora desconectada");
      return;
    }
    try {
      const nombreImpresora = await conectarImpresora();
      toast.success(`Impresora conectada: ${nombreImpresora}`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "No se pudo conectar la impresora";
      if (!/cancel/i.test(msg)) toast.error(msg);
    }
  }

  const conectada = estado === "conectada";
  const etiqueta =
    estado === "sin-soporte"
      ? "Impresora no disponible"
      : conectada
        ? `Impresora: ${nombre ?? "PT-210"}`
        : estado === "conectando"
          ? "Conectando…"
          : "Conectar impresora";

  return (
    <button
      type="button"
      onClick={() => void alternar()}
      disabled={estado === "sin-soporte" || estado === "conectando"}
      aria-label={etiqueta}
      title={etiqueta}
      className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors ${
        conectada
          ? "bg-success/20 text-success-foreground"
          : "bg-brand-foreground/10 text-brand-foreground/80 hover:bg-brand-foreground/20"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${conectada ? "bg-success" : "bg-brand-foreground/50"}`}
      />
      {conectada ? <PrinterCheck className="h-4 w-4" /> : <Printer className="h-4 w-4" />}
      <span className="hidden sm:inline">{conectada ? "Impresora lista" : etiqueta}</span>
    </button>
  );
}
