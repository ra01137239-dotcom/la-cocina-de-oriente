import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";

type Props = {
  pagina: number;
  totalPaginas: number;
  totalFilas: number;
  onCambiar: (p: number) => void;
};

export function Paginacion({ pagina, totalPaginas, totalFilas, onCambiar }: Props) {
  if (totalPaginas <= 1) return null;
  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-xl border bg-card p-2">
      <Button
        variant="outline"
        className="h-11"
        disabled={pagina <= 1}
        onClick={() => onCambiar(pagina - 1)}
        aria-label="Página anterior"
      >
        <ChevronLeft />
        <span className="hidden sm:inline">Anterior</span>
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        Página {pagina} de {totalPaginas} · {totalFilas} fila(s)
      </p>
      <Button
        variant="outline"
        className="h-11"
        disabled={pagina >= totalPaginas}
        onClick={() => onCambiar(pagina + 1)}
        aria-label="Página siguiente"
      >
        <span className="hidden sm:inline">Siguiente</span>
        <ChevronRight />
      </Button>
    </div>
  );
}
