import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  titulo: string;
  descripcion: string;
  texto: string;
  confirmLabel: string;
  onConfirm: () => void;
  procesando?: boolean;
};

export function TicketPreviewDialog({
  open,
  onOpenChange,
  titulo,
  descripcion,
  texto,
  confirmLabel,
  onConfirm,
  procesando,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
        <DialogHeader className="border-b p-4 text-left">
          <DialogTitle>{titulo}</DialogTitle>
          <DialogDescription>{descripcion}</DialogDescription>
        </DialogHeader>
        <div className="mx-4 my-4 w-auto flex-1 overflow-y-auto rounded-lg border border-dashed bg-card p-4 shadow-soft">
          <pre className="ticket-paper text-foreground">{texto}</pre>
        </div>
        <DialogFooter className="sticky bottom-0 gap-2 border-t bg-card p-4 sm:gap-2">
          <Button variant="outline" className="h-11" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button variant="flame" className="h-11" onClick={onConfirm} disabled={procesando}>
            {procesando ? "Procesando…" : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
