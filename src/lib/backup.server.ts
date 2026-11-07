import { createClient } from '@supabase/supabase-js';
import { BUCKET, MAX_FILE, BackupError, decodeBackup, digest, validateFullSnapshot, mergeRelease, requireRestoreSource } from './backup-validation';
import type { BackupRow, Snapshot, Operation, FailureCode, Inspection } from './backup-validation';
function env(name: string) { const value = process.env[name]; if (!value) throw new BackupError('configuration', `Falta configurar ${name} en el servidor externo.`); return value; }
export function adminClient() {
  const key = env('SUPABASE_SERVICE_ROLE_KEY');
  return createClient(env('SUPABASE_URL'), key, { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: (input, init) => {
    const headers = new Headers(input instanceof Request ? input.headers : undefined);
    new Headers(init?.headers).forEach((value, name) => headers.set(name, value));
    if (key.startsWith('sb_') && headers.get('Authorization') === `Bearer ${key}`) headers.delete('Authorization');
    headers.set('apikey', key); return fetch(input, { ...init, headers });
  } } });
}
type DB = ReturnType<typeof adminClient>;
function check(error: { message: string } | null, code: FailureCode = 'configuration') {
  if (error) { console.error('Backup operation:', error.message); throw new BackupError(code, messages[code]); }
}
const messages: Record<FailureCode, string> = {
  backup_missing: 'El respaldo no existe.', file_missing: 'El archivo no está disponible en el almacenamiento.', hash_mismatch: 'El SHA-256 no coincide.', size_mismatch: 'Tamaño incompatible.', invalid_format: 'Formato inválido.', partial_backup: 'El respaldo es parcial.', schema_mismatch: 'La estructura no es compatible con la base actual.', forbidden: 'Solo administradores.', lease_busy: 'Hay una copia o restauración en curso.', lease_expired: 'La reserva venció.', safety_failed: 'No se pudo generar y verificar la copia preventiva; no se restauraron datos.', restore_failed: 'La restauración no se completó.', configuration: 'Revisa la instalación adicional y la configuración del servidor externo.', transport: 'No fue posible comprobar el resultado; consulta el estado antes de repetir.', request_conflict: 'El identificador de operación ya está en uso.', provenance_unverified: 'No hay evidencia de captura completa para este archivo. Se conserva sin restaurarlo.', invalid_source: 'Solo copias automáticas y manuales se seleccionan para restaurar.'
};
export async function loadBackup(id: string, db = adminClient()) {
  const { data: row, error } = await db.from('backup_v2_files').select('*').eq('id', id).maybeSingle();
  check(error); if (!row) throw new BackupError('backup_missing', messages.backup_missing);
  const typed = row as BackupRow;
  if (!['automatico', 'manual', 'pre_restauracion'].includes(typed.kind) || !typed.path.endsWith('.json') || typed.path.includes('..')) throw new BackupError('invalid_format', messages.invalid_format);
  const { data: blob, error: downloadError } = await db.storage.from(BUCKET).download(typed.path);
  if (downloadError || !blob) throw new BackupError('file_missing', messages.file_missing);
  if (blob.size > MAX_FILE) throw new BackupError('size_mismatch', messages.size_mismatch);
  const payload = await decodeBackup(new Uint8Array(await blob.arrayBuffer()), typed);
  const { error: validationError } = await db.rpc('backup_restore_validate', { _payload: payload });
  check(validationError, 'schema_mismatch');
  const { error: receiptError } = await db.rpc('backup_capture_verify', { _file: id, _payload: payload });
  check(receiptError, 'provenance_unverified');
  return { row: typed, payload };
}
export async function inspectBackup(id: string): Promise<Inspection> {
  try { const source = await loadBackup(id); return { id, valid: true, row: source.row, message: 'Archivo completo, SHA-256 y estructura verificados.', verifiedAt: new Date().toISOString() }; }
  catch (error) { return { id, valid: false, code: error instanceof BackupError ? error.code : 'configuration', message: error instanceof BackupError ? error.message : messages.configuration }; }
}
async function assertHeadroom(db: DB, incoming: number) {
  // No depura archivos ni datos. Si no hay mediciones fiables, falla cerrado.
  const { data: metrics, error } = await db.rpc('backup_v3_metrics'); check(error);
  if (!metrics || !Number.isFinite(Number(metrics.storage_bytes)) || !Number.isFinite(Number(metrics.storage_limit)) || Number(metrics.storage_limit) <= 0 || Number(metrics.storage_bytes) + incoming > Math.floor(Number(metrics.storage_limit) * 0.80)) throw new BackupError('safety_failed', 'No hay espacio verificado bajo el 80% para la nueva copia. Libera capacidad sin borrar respaldos protegidos.');
}
async function saveFullSnapshot(db: DB, lease: string, kind: 'manual' | 'automatico' | 'pre_restauracion', actor: string | null, operationId?: string) {
  const id = crypto.randomUUID();
  const { data: raw, error } = await db.rpc('backup_capture_snapshot', { _file: id, _lease: lease, _kind: kind, _actor: actor, _operation: operationId ?? null }); check(error, 'safety_failed');
  const payload = validateFullSnapshot(raw), bytes = new TextEncoder().encode(JSON.stringify(raw));
  if (bytes.byteLength > MAX_FILE) throw new BackupError('safety_failed', 'La copia preventiva/completa supera 16 MiB. No se restauraron datos.');
  await assertHeadroom(db, bytes.byteLength);
  const path = `${id}.json`, sha256 = await digest(bytes);
  const counts = Object.fromEntries(Object.entries(payload.tables).map(([table, rows]) => [table, rows.length]));
  const { error: uploadError } = await db.storage.from(BUCKET).upload(path, bytes, { upsert: false, contentType: 'application/json' }); check(uploadError, 'safety_failed');
  const { error: insertError } = await db.from('backup_v2_files').insert({ id, path, bytes: bytes.byteLength, sha256, kind, actor, counts });
  // No eliminación automática, ni siquiera en compensación: registrar el fallo
  // y conservar el archivo para investigación; métricas v3 detecta huérfanos.
  check(insertError, 'safety_failed');
  if (kind === 'pre_restauracion') {
    const { error: pinError } = await db.rpc('backup_restore_protect', { _id: id }); check(pinError, 'safety_failed');

  }
  await loadBackup(id, db);
  if (kind === 'pre_restauracion' && operationId) {
    const { error: attachError } = await db.rpc('backup_restore_attach_safety', { _operation: operationId, _safety: id }); check(attachError, 'safety_failed');
  }
  return { id, payload };
}
async function release(db: DB, lease: string, automatic = false, success = false) {
  try { const { error } = await db.rpc('backup_v2_finish', { _lease: lease, _automatic: automatic, _success: success }); if (error) console.error('Backup release:', error.message); return !!error; }
  catch { return true; }
}
export async function listBackups(offset: number) {
  const db = adminClient();
  const { data, error, count } = await db.from('backup_v2_files').select('*', { count: 'exact' }).order('created_at', { ascending: false }).order('id').range(offset, offset + 19); check(error);
  return { rows: (data ?? []) as BackupRow[], total: count ?? 0 };
}
export async function downloadBackup(id: string) {
  const db = adminClient(); await loadBackup(id, db);
  const { data: row, error } = await db.from('backup_v2_files').select('path').eq('id', id).single(); check(error);
  if (!row) throw new BackupError('backup_missing', messages.backup_missing);
  const { data: link, error: linkError } = await db.storage.from(BUCKET).createSignedUrl(row.path, 300, { download: `${id}.json` }); check(linkError);
  if (!link) throw new BackupError('file_missing', messages.file_missing);
  return { url: link.signedUrl };
}
export async function runBackup(automatic: boolean, actor: string | null) {
  // Compatibility export for existing v4 callers. No prune/rotation; v5 unchanged.
  const db = adminClient(); const { data: lease, error } = await db.rpc('backup_v2_claim', { _automatic: automatic }); check(error, 'lease_busy');
  if (!lease) return { status: 'omitida', warning: '', id: undefined };
  let result: { status: string; id?: string; warning: string } = { status: 'failed', warning: '' }, failure: unknown, success = false;
  try { const saved = await saveFullSnapshot(db, lease, automatic ? 'automatico' : 'manual', actor); success = true; result = { status: 'creada', id: saved.id, warning: '' }; } catch (error) { failure = error; }
  const warning = await release(db, lease, automatic, success);
  if (failure) throw failure;
  return { ...result, warning: warning ? 'Copia guardada, pero no se pudo liberar la reserva.' : '' };
}
export async function scheduleStatus() {
  const db = adminClient();
  const { data, error } = await db.rpc('backup_schedule_status'); check(error);
  return data as { next_auto: string; last_auto: string | null; busy_until: string | null; cronActive: boolean | null; cronSchedule: string | null; lastCronStatus: string | null };
}
export async function operationStatus(id: string, actor: string) {
  const db = adminClient();
  const { data, error } = await db.rpc('backup_restore_status', { _operation: id, _actor: actor }); check(error);
  if (!data) return { found: false as const };
  return { found: true as const, operation: data as Operation };
}
export async function restoreBackup(id: string, actor: string, operationId: string) {
  const db = adminClient();
  // Verify before reserving, then verify again while owning the shared lease.
  const old = await operationStatus(operationId, actor);
  if (old.found) { if (old.operation.source_id !== id) throw new BackupError('request_conflict', messages.request_conflict); return old.operation; }
  const inspected = await loadBackup(id, db); requireRestoreSource(inspected.row);
  const { data: begin, error } = await db.rpc('backup_restore_begin', { _operation: operationId, _source: id, _actor: actor }); check(error, 'lease_busy');
  const started = begin as Operation & { owned: boolean; lease: string };
  if (!started.owned) return started;
  let result: Operation = started, executionSubmitted = false;
  try {
    const source = await loadBackup(id, db);
    const safety = await saveFullSnapshot(db, started.lease, 'pre_restauracion', actor, operationId);
    // Use EXACT fingerprint returned by SQL snapshot, never recompute in JS.
    executionSubmitted = true;
    const { data: executed, error: executionError } = await db.rpc('backup_restore_execute', { _operation: operationId, _payload: source.payload, _fingerprint: safety.payload.fingerprint });
    if (executionError) throw new BackupError('transport', messages.transport);
    result = executed as Operation;
  } catch (error) {
    if (executionSubmitted) {
      // Connection loss may happen after commit. Never mark it failed or retry.
      try { const status = await operationStatus(operationId, actor); if (status.found) result = status.operation; } catch { /* Keep pending outcome. */ }
    } else {
      const code = error instanceof BackupError ? error.code : 'safety_failed';
      const { data: failed, error: failureError } = await db.rpc('backup_restore_fail', { _operation: operationId, _code: code });
      if (!failureError && failed) result = failed as Operation;
    }
  }
  // A pending execution may still be running in PostgreSQL. Do not release its
  // lease underneath it; completion/status consultation is safe and idempotent.
  // SQL owns terminal release atomically. Never call finish a second time.
  const warning = false;
  return mergeRelease(result, warning);
}
