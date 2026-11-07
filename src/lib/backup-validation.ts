/** Browser-safe validation shared by server code and offline tests. */
export const MAX_FILE = 16 * 1024 * 1024;
export const BUCKET = 'cocina-backups-v2';
export const REQUIRED_TABLES = ['categorias', 'productos', 'materia_prima', 'bebidas', 'producto_insumos', 'pedidos', 'auditoria'];
const ALLOWED_TABLES = [...REQUIRED_TABLES, 'bebida_insumos', 'pedido_items'];
export type JsonObject = Record<string, unknown>;
export type Snapshot = { format: 'cocina-data-v2'; created_at: string; tables: Record<string, JsonObject[]>; schema: Record<string, unknown[]>; fingerprint: string };
export type BackupRow = { id: string; path: string; created_at: string; bytes: number; sha256: string; kind: 'automatico' | 'manual' | 'pre_restauracion'; actor: string | null; counts: Record<string, number> };
export type FailureCode = 'backup_missing' | 'file_missing' | 'hash_mismatch' | 'size_mismatch' | 'invalid_format' | 'partial_backup' | 'schema_mismatch' | 'forbidden' | 'lease_busy' | 'lease_expired' | 'safety_failed' | 'restore_failed' | 'configuration' | 'transport' | 'request_conflict' | 'provenance_unverified' | 'invalid_source';
export class BackupError extends Error {
  constructor(public code: FailureCode, message: string) { super(message); this.name = 'BackupError'; }
}
const object = (value: unknown): value is JsonObject => value !== null && typeof value === 'object' && !Array.isArray(value);
const keys = (value: JsonObject) => Object.keys(value).sort().join('|');
export function requireAdmin(roles: { role: string }[]) {
  if (!roles.some(row => row.role === 'admin')) throw new BackupError('forbidden', 'Solo el administrador puede realizar esta operación.');
}
export function validateFullSnapshot(value: unknown, counts?: Record<string, number>): Snapshot {
  if (!object(value)) throw new BackupError('invalid_format', 'El archivo no contiene un respaldo JSON válido.');
  if ('retention' in value || 'cutoff' in value || 'partial' in value || 'export' in value) throw new BackupError('partial_backup', 'Es una exportación parcial; no puede restaurarse.');
  if (keys(value) !== ['created_at', 'fingerprint', 'format', 'schema', 'tables'].sort().join('|') || value['format'] !== 'cocina-data-v2' || !object(value['tables']) || !object(value['schema']) || typeof value['created_at'] !== 'string' || !Number.isFinite(Date.parse(value['created_at'])) || typeof value['fingerprint'] !== 'string' || !/^[a-f0-9]{32}$/.test(value['fingerprint'])) throw new BackupError('invalid_format', 'Formato completo cocina-data-v2 inválido.');
  const tables = value['tables'], schema = value['schema'];
  if (REQUIRED_TABLES.some(name => !Array.isArray(tables[name])) || Object.keys(tables).some(name => !ALLOWED_TABLES.includes(name) || !Array.isArray(tables[name])) || keys(tables) !== keys(schema)) throw new BackupError('schema_mismatch', 'Las tablas no corresponden al respaldo del POS.');
  for (const [name, rows] of Object.entries(tables)) {
    const columns = schema[name];
    if (!Array.isArray(columns) || !columns.length || columns.some(column => !object(column) || typeof column['name'] !== 'string' || typeof column['type'] !== 'string' || typeof column['required'] !== 'boolean' || typeof column['identity'] !== 'string' || typeof column['generated'] !== 'string')) throw new BackupError('schema_mismatch', `Esquema inválido: ${name}.`);
    const names = columns.map(column => (column as JsonObject)['name'] as string).sort().join('|');
    if (new Set(columns.map(column => (column as JsonObject)['name'])).size !== columns.length || (rows as unknown[]).some(row => !object(row) || keys(row) !== names)) throw new BackupError('schema_mismatch', `Columnas incompatibles: ${name}.`);
    if (counts && counts[name] !== (rows as unknown[]).length) throw new BackupError('schema_mismatch', `El número de registros no coincide: ${name}.`);
  }
  if (counts && keys(counts) !== keys(tables)) throw new BackupError('schema_mismatch', 'El registro del respaldo no contiene las mismas tablas.');
  return value as Snapshot;
}
export async function digest(bytes: Uint8Array) {
  const result = await crypto.subtle.digest('SHA-256', bytes as BufferSource);
  return Array.from(new Uint8Array(result), byte => byte.toString(16).padStart(2, '0')).join('');
}
export async function decodeBackup(bytes: Uint8Array, row: Pick<BackupRow, 'bytes' | 'sha256' | 'counts'>) {
  if (!bytes.byteLength || bytes.byteLength > MAX_FILE || bytes.byteLength !== Number(row.bytes)) throw new BackupError('size_mismatch', 'El tamaño del archivo no coincide o supera 16 MiB.');
  if (!/^[a-f0-9]{64}$/.test(row.sha256) || await digest(bytes) !== row.sha256) throw new BackupError('hash_mismatch', 'El hash SHA-256 no coincide. No se restaurará este archivo.');
  let value: unknown;
  try { value = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)); } catch { throw new BackupError('invalid_format', 'El archivo no es un JSON válido.'); }
  return validateFullSnapshot(value, row.counts);
}
export function mergeRelease<T extends { status: string }>(result: T, releaseFailed: boolean) {
  return { ...result, releaseWarning: releaseFailed, message: result.status === 'restored' ? (releaseFailed ? 'Los datos fueron restaurados, pero no se pudo liberar la reserva. No repitas la restauración.' : 'Restauración completada. Revisa inventario, pedidos y totales antes de reabrir ventas.') : undefined };
}
export type Operation = { id: string; actor: string; source_id: string; safety_id: string | null; status: 'pending' | 'restored' | 'failed'; counts: Record<string, number> | null; error_code: string | null; created_at: string; finished_at: string | null; releaseWarning?: boolean; message?: string };
export type Inspection = { id: string; valid: boolean; code?: FailureCode; message: string; row?: BackupRow; verifiedAt?: string };

export function requireRestoreSource(row: Pick<BackupRow, 'kind'>) {
  if (row.kind !== 'manual' && row.kind !== 'automatico') throw new BackupError('invalid_source', 'Las copias preventivas no se seleccionan como origen de restauración.');
}
