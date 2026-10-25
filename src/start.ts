// src/start.ts
import { createStart, createCsrfMiddleware  } from '@tanstack/react-start'

// Middleware de seguridad para proteger las server functions de ataques cruzados.
const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === "serverFn",
});

export const startInstance = createStart(() => ({
    requestMiddleware: [csrfMiddleware],
}))