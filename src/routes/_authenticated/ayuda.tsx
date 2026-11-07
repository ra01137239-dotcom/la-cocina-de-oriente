import { createFileRoute } from '@tanstack/react-router'
import { CentroAyuda } from "@/components/pos/CentroAyuda";

export const Route = createFileRoute('/_authenticated/ayuda')({
  component: CentroAyuda,
})
