import { createFileRoute } from "@tanstack/react-router";
import { CentroAyuda } from "@/components/pos/CentroAyuda";

export const Route = createFileRoute("/ayuda")({
  component: CentroAyuda,
});