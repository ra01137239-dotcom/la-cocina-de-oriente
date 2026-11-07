import { createStart, createCsrfMiddleware } from '@tanstack/react-start';
import { backupSession } from './lib/backup-session';
const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === 'serverFn',
});
export const startInstance = createStart(() => ({
  requestMiddleware: [csrfMiddleware],
  functionMiddleware: [backupSession],
}));
