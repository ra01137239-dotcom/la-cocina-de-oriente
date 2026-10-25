
// src/server.ts
import handler, { createServerEntry } from '@tanstack/react-start/server-entry'

export default createServerEntry({
  async fetch(request: Request) {
    try {
      // Delegamos la petición al handler de TanStack Start
      return await handler.fetch(request)
    } catch (error) {
      // Si ocurre un error catastrófico antes de que React pueda renderizar,
      // lo registramos en consola para debug.
      console.error("[Server Error] Fallo crítico en SSR:", error)
      
      // Devolvemos una respuesta 500 genérica para que el cliente no se quede colgado
      return new Response("Error interno del servidor", {
        status: 500,
        headers: { "content-type": "text/plain; charset=utf-8" },
      })
    }
  },
})