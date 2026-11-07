import { getRequest, setResponseHeader } from '@tanstack/react-start/server';
import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { BackupError, requireAdmin } from './backup-validation';
const input = z.discriminatedUnion('action', [
  z.object({ action: z.literal('list'), offset: z.number().int().min(0).max(1000000).default(0) }),
  z.object({ action: z.literal('create') }),
  z.object({ action: z.literal('schedule') }),
  z.object({ action: z.literal('inspect'), id: z.string().uuid() }),
  z.object({ action: z.literal('download'), id: z.string().uuid() }),
  z.object({ action: z.literal('status'), operationId: z.string().uuid() }),
  z.object({ action: z.literal('restore'), id: z.string().uuid(), operationId: z.string().uuid(), confirmation: z.literal('RESTAURAR'), salesStopped: z.literal(true) }),
]);
export type BackupInput = z.input<typeof input>;
export const backupAction = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).inputValidator((data: unknown) => input.parse(data)).handler(async ({ data, context }) => {
  // Validate through Auth (not editable profile/storage or frontend actor ID).
  setResponseHeader('Cache-Control', 'no-store');
  const authorization = getRequest().headers.get('authorization');
  const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : undefined;
  if (!token) throw new Error('La sesión no es válida.');
  const { data: identity, error: authError } = await context.supabase.auth.getUser(token);
  if (authError || !identity.user || identity.user.id !== context.userId) throw new Error('La sesión no es válida.');
  const { data: roles, error: roleError } = await context.supabase.from('user_roles').select('role').eq('user_id', identity.user.id);
  if (roleError) throw new Error('No se pudieron comprobar tus permisos.'); requireAdmin(roles ?? []);
  try {
    const server = await import('./backup.server');
    if (data.action === 'schedule') return { ok: true as const, schedule: await server.scheduleStatus() };
    if (data.action === 'list') return { ok: true as const, ...await server.listBackups(data.offset) };
    if (data.action === 'inspect') return { ok: true as const, inspection: await server.inspectBackup(data.id) };
    if (data.action === 'download') return { ok: true as const, ...await server.downloadBackup(data.id) };
    if (data.action === 'create') return { ok: true as const, created: await server.runBackup(false, identity.user.id) };
    if (data.action === 'status') return { ok: true as const, ...await server.operationStatus(data.operationId, identity.user.id) };
    return { ok: true as const, operation: await server.restoreBackup(data.id, identity.user.id, data.operationId) };
  } catch (error) {
    return { ok: false as const, code: error instanceof BackupError ? error.code : 'configuration', message: error instanceof BackupError ? error.message : 'No se pudo completar la operación. Revisa la instalación externa.' };
  }
});
