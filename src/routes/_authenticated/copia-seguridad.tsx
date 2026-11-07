import { createFileRoute } from '@tanstack/react-router';
import { useServerFn } from '@tanstack/react-start';
import { useCallback, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Archive, CheckCircle2, ChevronLeft, ChevronRight, DatabaseBackup, Download, RefreshCw, RotateCcw, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useEsAdmin } from '@/lib/data';
import { backupAction } from '@/lib/backup.functions';
import type { BackupInput } from '@/lib/backup.functions';
import type { BackupRow, Inspection, Operation } from '@/lib/backup-validation';
export const Route = createFileRoute('/_authenticated/copia-seguridad')({
  head: () => ({ meta: [
    { title: 'Restauración y copias de seguridad — La Cocina de Oriente POS' },
    { name: 'description', content: 'Consulta y restauración administrativa de respaldos completos de La Cocina de Oriente.' },
    { property: 'og:title', content: 'Restauración y copias de seguridad — La Cocina de Oriente POS' },
    { property: 'og:description', content: 'Respaldos privados, comprobación de integridad y recuperación de datos del negocio.' },
    { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary_large_image' },
  ] }), component: CopiasSeguridad,
});
const formatDate = (value: string) => new Date(value).toLocaleString('es-SV', { timeZone: 'America/El_Salvador' });
const label = (kind: BackupRow['kind']) => kind === 'automatico' ? 'Automático' : kind === 'manual' ? 'Manual' : 'Preventivo';
const PENDING_KEY = 'cocina-restore-operation'; // Only operation UUID; never tokens or business records.
function CopiasSeguridad() {
  const { esAdmin, cargando } = useEsAdmin(), action = useServerFn(backupAction), queryClient = useQueryClient();
  const [schedule, setSchedule] = useState<{ next_auto: string; last_auto: string | null; busy_until: string | null; cronActive: boolean | null; cronSchedule: string | null; lastCronStatus: string | null } | null>(null);
  const [rows, setRows] = useState<BackupRow[]>([]), [total, setTotal] = useState(0), [offset, setOffset] = useState(0);
  const [busy, setBusy] = useState(false), [message, setMessage] = useState(''), [error, setError] = useState('');
  const [inspections, setInspections] = useState<Record<string, Inspection>>({}), [selected, setSelected] = useState<BackupRow | null>(null);
  const [confirmation, setConfirmation] = useState(''), [stopped, setStopped] = useState(false), [pendingId, setPendingId] = useState<string | null>(null), [operation, setOperation] = useState<Operation | null>(null), [pendingSource, setPendingSource] = useState<string | null>(null), [notRegistered, setNotRegistered] = useState(false);
  const call = useCallback(async (data: BackupInput) => {
    const result = await action({ data }); if (!result.ok) throw new Error(result.message); return result;
  }, [action]);
  const refresh = useCallback(async () => {
    const [result, scheduled] = await Promise.all([call({ action: 'list', offset }), call({ action: 'schedule' })]);
    if ('rows' in result) { setRows(result.rows); setTotal(result.total); }
    if ('schedule' in scheduled && scheduled.schedule) setSchedule(scheduled.schedule);
  }, [call, offset]);
  useEffect(() => { if (!esAdmin) return; setBusy(true); void refresh().catch(e => setError(e instanceof Error ? e.message : 'No se pudo cargar el listado.')).finally(() => setBusy(false)); }, [esAdmin, refresh]);
  useEffect(() => { if (!esAdmin) return; try { setPendingId(sessionStorage.getItem(PENDING_KEY)); setPendingSource(sessionStorage.getItem(PENDING_KEY + '-source')); } catch { /* Storage may be blocked. */ } }, [esAdmin]);
  async function observed(op: Operation) {
    setOperation(op); setSelected(null);
    if (op.status === 'restored') {
      setMessage(op.message ?? 'Restauración completada. Revisa inventario, pedidos y totales antes de reabrir ventas.');
      setSelected(null); setInspections({}); await queryClient.invalidateQueries(); await refresh();
      // Keep the operation ID until acknowledged: reload cannot resubmit it.
    } else if (op.status === 'failed') setError(`No se restauraron datos. Motivo: ${op.error_code ?? 'restore_failed'}. La copia preventiva, si existe, permanece protegida.`);
    else setMessage('La operación sigue pendiente de confirmación. Consulta su resultado; no envíes otra restauración.');
  }
  async function execute(work: () => Promise<void>) {
    setBusy(true); setError(''); setMessage(''); try { await work(); } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo completar la operación.'); } finally { setBusy(false); }
  }
  async function verify(row: BackupRow, open: boolean) {
    const result = await call({ action: 'inspect', id: row.id });
    if (!('inspection' in result) || !result.inspection) return;
    const verified = result.inspection; setInspections(current => ({ ...current, [row.id]: verified }));
    if (!verified.valid) { setError(verified.message); return; }
    if (open && row.kind === 'pre_restauracion') { setError('Las copias preventivas se conservan protegidas; no se seleccionan para restaurar.'); return; }
    if (open) { setSelected(row); setConfirmation(''); setStopped(false); } else setMessage(verified.message);
  }
  async function restore() {
    if (!selected || !stopped || confirmation !== 'RESTAURAR' || pendingId) return;
    const id = crypto.randomUUID(); setPendingId(id); setPendingSource(selected.id); setNotRegistered(false); setOperation(null);
    try { sessionStorage.setItem(PENDING_KEY, id); sessionStorage.setItem(PENDING_KEY + '-source', selected.id); } catch { /* UI still blocks repeats in this tab. */ }
    try {
      const result = await call({ action: 'restore', id: selected.id, operationId: id, confirmation: 'RESTAURAR', salesStopped: true });
      if ('operation' in result && result.operation) await observed(result.operation);
    } catch (e) {
      setError(`${e instanceof Error ? e.message : 'Se perdió la conexión.'} Consulta el resultado antes de repetir; la solicitud pudo haberse completado.`);
    }
  }
  async function status() {
    if (!pendingId) return; const result = await call({ action: 'status', operationId: pendingId });
    if ('found' in result && result.found) await observed(result.operation);
    else { setNotRegistered(true); setMessage('La solicitud no aparece registrada. Puedes reenviar exactamente el mismo identificador; no se duplicará una restauración ya registrada.'); }
  }
  async function resume() {
    if (!pendingId || !pendingSource || !notRegistered) return;
    const result = await call({ action: 'restore', id: pendingSource, operationId: pendingId, confirmation: 'RESTAURAR', salesStopped: true });
    if ('operation' in result && result.operation) { setNotRegistered(false); await observed(result.operation); }
  }
  function acknowledge() {
    if (!operation || operation.status === 'pending') return;
    try { sessionStorage.removeItem(PENDING_KEY); sessionStorage.removeItem(PENDING_KEY + '-source'); } catch { /* Ignore unavailable storage. */ }
    setPendingId(null); setPendingSource(null); setNotRegistered(false); setOperation(null); setSelected(null); setMessage('Resultado confirmado.');
  }
  if (cargando) return <p className="p-8 text-center text-muted-foreground">Cargando…</p>;
  if (!esAdmin) return <div className="py-10 text-center"><ShieldCheck className="mx-auto mb-3 h-8 w-8 text-muted-foreground"/><p>Solo el administrador puede acceder a las copias de seguridad.</p></div>;
  return <div className="min-w-0 space-y-5">
    <header className="flex flex-wrap items-center justify-between gap-3"><h1 className="flex items-center gap-2 text-xl font-extrabold sm:text-2xl"><DatabaseBackup className="h-6 w-6 shrink-0"/>Copias de seguridad</h1><div className="flex flex-wrap gap-2">
      <Button variant="outline" className="h-11" title="Actualizar listado" aria-label="Actualizar listado" disabled={busy} onClick={() => void execute(refresh)}><RefreshCw/></Button>
      <Button variant="brand" className="h-11" disabled={busy || !!pendingId} onClick={() => void execute(async () => { const result = await call({ action: 'create' }); if ('created' in result && result.created) { setMessage(result.created.warning || (result.created.status === 'creada' ? 'Copia manual completa guardada.' : 'No se generó una copia; consulta la reserva activa.')); await refresh(); } })}><Archive/>Crear copia completa</Button>
    </div></header>
    <section className="grid gap-3 border-y py-4 text-sm sm:grid-cols-3">
      <div><p className="text-muted-foreground">Copias automáticas</p><p className="mt-1 font-semibold">Cada 4 días · 00:00 El Salvador</p><p>{schedule?.cronActive === true ? 'Programación activa' : schedule?.cronActive === false ? 'Programación inactiva' : 'Programación sin verificar'}</p></div>
      <div><p className="text-muted-foreground">Próxima fecha prevista</p><p className="mt-1 font-semibold">{schedule?.next_auto ?? 'Sin verificar'}</p><p>{schedule?.busy_until ? 'Hay una reserva en curso' : 'Sin reserva activa'}</p></div>
      <div><p className="text-muted-foreground">Última copia automática confirmada</p><p className="mt-1 font-semibold">{schedule?.last_auto ? formatDate(schedule.last_auto) : 'Sin ejecución confirmada'}</p></div>
    </section>
    {message && <p role="status" className="border-l-4 border-success bg-secondary p-4 text-sm">{message}</p>}
    {error && <p role="alert" className="border-l-4 border-destructive bg-secondary p-4 text-sm">{error}</p>}
    {pendingId && <section className="space-y-3 border-y py-4"><h2 className="font-bold">Resultado de restauración</h2><p className="break-all font-mono text-xs">{pendingId}</p><p>{operation?.status === 'restored' ? 'Completada' : operation?.status === 'failed' ? 'No completada' : 'Pendiente de comprobar'}</p>{operation?.safety_id && <p className="break-all text-sm">Copia preventiva protegida: {operation.safety_id}</p>}{operation?.counts && <p className="text-sm">Productos: {operation.counts['productos'] ?? 0} · Insumos: {operation.counts['materia_prima'] ?? 0} · Pedidos: {operation.counts['pedidos'] ?? 0} · Auditoría: {operation.counts['auditoria'] ?? 0}</p>}<div className="flex flex-wrap gap-2"><Button variant="outline" className="h-11" disabled={busy} onClick={() => void execute(status)}><RefreshCw/>Consultar resultado</Button>{notRegistered && pendingSource && <Button variant="outline" className="h-11" disabled={busy} onClick={() => void execute(resume)}><RefreshCw/>Reenviar misma solicitud</Button>}{operation && operation.status !== 'pending' && <Button variant="outline" className="h-11" disabled={busy} onClick={acknowledge}><CheckCircle2/>Confirmar resultado leído</Button>}</div></section>}
    <section><h2 className="mb-3 font-bold">Respaldos disponibles <span className="font-normal text-muted-foreground">({total})</span></h2>
      {!rows.length && <p className="border-y py-10 text-center text-muted-foreground">{busy ? 'Cargando respaldos…' : 'Sin respaldos disponibles'}</p>}
      <ul className="divide-y border-y">{rows.map(row => {
        const inspection = inspections[row.id];
        return <li key={row.id} className="grid min-w-0 gap-3 py-4 lg:grid-cols-[minmax(0,1fr)_auto]"><div className="min-w-0"><p className="font-semibold">{formatDate(row.created_at)}</p><p className="mt-1 text-sm">{label(row.kind)}{row.kind === 'manual' && inspection?.valid ? ' completo' : ''} · {(Number(row.bytes) / 1048576).toFixed(2)} MiB</p><p className="mt-1 break-all font-mono text-xs text-muted-foreground">{row.id}</p><p className="mt-2 text-sm text-muted-foreground">{inspection ? inspection.message : 'Archivo e integridad sin comprobar'}</p>{inspection?.verifiedAt && <p className="text-xs text-muted-foreground">Verificado: {formatDate(inspection.verifiedAt)}</p>}</div><div className="flex flex-wrap items-center gap-2"><Button variant="outline" className="h-11" disabled={busy} title="Verificar archivo e integridad" aria-label={`Verificar ${row.id}`} onClick={() => void execute(() => verify(row, false))}><ShieldCheck/></Button><Button variant="outline" className="h-11" disabled={busy} title="Descargar JSON verificado" aria-label={`Descargar ${row.id}`} onClick={() => void execute(async () => { const result = await call({ action: 'download', id: row.id }); if ('url' in result) window.location.assign(result.url); })}><Download/></Button><Button variant="outline" className="h-11" disabled={busy || !!pendingId || inspection?.valid === false || row.kind === 'pre_restauracion'} onClick={() => void execute(() => verify(row, true))}><RotateCcw/>Restaurar</Button></div></li>;
      })}</ul>
      <div className="mt-4 flex items-center justify-between gap-3"><p className="text-sm text-muted-foreground">Página {Math.floor(offset / 20) + 1} de {Math.max(1, Math.ceil(total / 20))}</p><div className="flex gap-2"><Button variant="outline" className="h-11 w-11" aria-label="Página anterior" disabled={busy || offset === 0} onClick={() => setOffset(current => Math.max(0, current - 20))}><ChevronLeft/></Button><Button variant="outline" className="h-11 w-11" aria-label="Página siguiente" disabled={busy || offset + 20 >= total} onClick={() => setOffset(current => current + 20)}><ChevronRight/></Button></div></div>
    </section>
    <AlertDialog open={selected !== null} onOpenChange={open => { if (!open && !busy) setSelected(null); }}><AlertDialogContent className="max-h-[90dvh] max-w-[calc(100%-2rem)] overflow-y-auto sm:max-w-lg"><AlertDialogHeader><AlertDialogTitle>Restaurar respaldo</AlertDialogTitle><AlertDialogDescription>Se reemplazarán los datos actuales de productos, insumos, bebidas, recetas, pedidos y auditoría. Usuarios y roles no se restauran. Primero se generará y protegerá una copia preventiva completa.</AlertDialogDescription></AlertDialogHeader>{selected && <p className="text-sm font-semibold">{label(selected.kind)} · {formatDate(selected.created_at)}</p>}<label className="flex min-h-11 items-center gap-3 text-sm"><Checkbox checked={stopped} disabled={busy || !!pendingId} onCheckedChange={value => setStopped(value === true)}/>He detenido las ventas en todos los dispositivos.</label><label className="space-y-2 text-sm">Escribe RESTAURAR<Input aria-label="Confirmación de restauración" value={confirmation} disabled={busy || !!pendingId} onChange={event => setConfirmation(event.target.value)} className="h-11"/></label>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}{pendingId && <Button variant="outline" className="h-11" disabled={busy} onClick={() => void execute(status)}><RefreshCw/>Consultar resultado</Button>}<AlertDialogFooter className="gap-2"><Button variant="outline" className="h-11" disabled={busy} onClick={() => setSelected(null)}>Cerrar</Button><Button variant="destructive" className="h-11" disabled={busy || !!pendingId || !stopped || confirmation !== 'RESTAURAR' || !selected || inspections[selected.id]?.valid !== true} onClick={() => void execute(restore)}><RotateCcw/>{busy ? 'Procesando…' : 'Restaurar respaldo'}</Button></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </div>;
}
