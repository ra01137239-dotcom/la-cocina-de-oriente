import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search, ShieldCheck } from "lucide-react";

import { AuditoriaDetalleDialog } from "@/components/pos/AuditoriaDetalleDialog";
import { Paginacion } from "@/components/pos/Paginacion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEsAdmin } from "@/lib/data";
import {
  MODULOS,
  etiquetaAccion,
  useAuditoria,
  type RegistroAuditoria,
} from "@/lib/auditoria";

export const Route = createFileRoute("/_authenticated/auditoria")({
  head: () => ({
    meta: [
      { title: "Auditoría — La Cocina de Oriente POS" },
      {
        name: "description",
        content:
          "Bitácora de trazabilidad: quién hizo cada cambio en pedidos, productos, inventario y usuarios.",
      },
      { property: "og:title", content: "Auditoría — La Cocina de Oriente" },
      {
        property: "og:description",
        content: "Registro inalterable de operaciones del punto de venta.",
      },
    ],
  }),
  component: Auditoria,
});

const POR_PAGINA = 12;

function Auditoria() {
  const { esAdmin, cargando } = useEsAdmin();
  const { data: eventos = [], isLoading } = useAuditoria(esAdmin);

  const [modulo, setModulo] = useState("todos");
  const [accion, setAccion] = useState("todas");
  const [usuario, setUsuario] = useState("todos");
  const [rol, setRol] = useState("todos");
  const [estado, setEstado] = useState("todos");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [pagina, setPagina] = useState(1);
  const [detalle, setDetalle] = useState<RegistroAuditoria | null>(null);

  useEffect(() => {
    setPagina(1);
  }, [modulo, accion, usuario, rol, estado, desde, hasta, busqueda]);

  const acciones = useMemo(
    () => [...new Set(eventos.map((e) => e.action))].sort(),
    [eventos],
  );
  const usuarios = useMemo(
    () => [...new Set(eventos.map((e) => e.user_name))].sort(),
    [eventos],
  );
  const roles = useMemo(() => [...new Set(eventos.map((e) => e.user_role))].sort(), [eventos]);

  const filtrados = eventos.filter((e) => {
    const fecha = new Date(e.created_at);
    const okDesde = !desde || fecha >= new Date(`${desde}T00:00:00`);
    const okHasta = !hasta || fecha <= new Date(`${hasta}T23:59:59`);
    const q = busqueda.trim().toLowerCase();
    const okBusqueda =
      !q ||
      e.operation_id.toLowerCase().includes(q) ||
      e.user_name.toLowerCase().includes(q) ||
      e.description.toLowerCase().includes(q) ||
      e.entity_type.toLowerCase().includes(q) ||
      (e.entity_id ?? "").toLowerCase().includes(q) ||
      JSON.stringify(e.new_values ?? {}).toLowerCase().includes(q);
    return (
      okDesde &&
      okHasta &&
      okBusqueda &&
      (modulo === "todos" || e.module === modulo) &&
      (accion === "todas" || e.action === accion) &&
      (usuario === "todos" || e.user_name === usuario) &&
      (rol === "todos" || e.user_role === rol) &&
      (estado === "todos" || e.status === estado)
    );
  });

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA));
  const paginaActual = Math.min(pagina, totalPaginas);
  const visibles = filtrados.slice((paginaActual - 1) * POR_PAGINA, paginaActual * POR_PAGINA);

  if (!cargando && !esAdmin) {
    return (
      <div className="mx-auto max-w-md rounded-xl border border-dashed p-10 text-center">
        <p className="text-base font-semibold">Sección solo para administradores</p>
        <p className="mt-2 text-sm text-muted-foreground">
          La bitácora de auditoría únicamente puede consultarla el administrador del negocio.
        </p>
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-4">
      <div className="min-w-0">
        <h1 className="flex items-center gap-2 truncate text-xl font-extrabold tracking-tight sm:text-2xl">
          <ShieldCheck className="h-6 w-6 shrink-0 text-brand" />
          Auditoría
        </h1>
        <p className="text-xs text-muted-foreground">{filtrados.length} evento(s)</p>
      </div>

      <div className="grid gap-2 rounded-xl border bg-card p-3 shadow-soft sm:grid-cols-2 lg:grid-cols-4">
        <Select value={modulo} onValueChange={setModulo}>
          <SelectTrigger aria-label="Filtrar por módulo">
            <SelectValue placeholder="Módulo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los módulos</SelectItem>
            {MODULOS.map((m) => (
              <SelectItem key={m} value={m}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={accion} onValueChange={setAccion}>
          <SelectTrigger aria-label="Filtrar por acción">
            <SelectValue placeholder="Acción" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas las acciones</SelectItem>
            {acciones.map((a) => (
              <SelectItem key={a} value={a}>
                {etiquetaAccion(a)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={usuario} onValueChange={setUsuario}>
          <SelectTrigger aria-label="Filtrar por usuario">
            <SelectValue placeholder="Usuario" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los usuarios</SelectItem>
            {usuarios.map((u) => (
              <SelectItem key={u} value={u}>
                {u}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={rol} onValueChange={setRol}>
          <SelectTrigger aria-label="Filtrar por rol">
            <SelectValue placeholder="Rol" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los roles</SelectItem>
            {roles.map((r) => (
              <SelectItem key={r} value={r}>
                {r}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={estado} onValueChange={setEstado}>
          <SelectTrigger aria-label="Filtrar por resultado">
            <SelectValue placeholder="Resultado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los resultados</SelectItem>
            <SelectItem value="SUCCESS">Correcto</SelectItem>
            <SelectItem value="FAILED">Fallido</SelectItem>
          </SelectContent>
        </Select>

        <Input
          type="date"
          value={desde}
          onChange={(e) => setDesde(e.target.value)}
          aria-label="Desde"
        />
        <Input
          type="date"
          value={hasta}
          onChange={(e) => setHasta(e.target.value)}
          aria-label="Hasta"
        />

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar usuario, operación, producto…"
            className="pl-9"
            aria-label="Buscar en auditoría"
          />
        </div>
      </div>

      {/* Tarjetas en móvil */}
      <div className="space-y-3 md:hidden">
        {visibles.map((e) => (
          <article key={e.audit_id} className="space-y-3 rounded-xl border bg-card p-3 shadow-soft">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
              <div className="min-w-0">
                <p className="truncate font-mono text-[11px] font-semibold text-brand">
                  {e.operation_id}
                </p>
                <p className="truncate text-sm font-semibold">{etiquetaAccion(e.action)}</p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                  e.status === "SUCCESS"
                    ? "bg-success/12 text-success"
                    : "bg-destructive/12 text-destructive"
                }`}
              >
                {e.status === "SUCCESS" ? "Correcto" : "Fallido"}
              </span>
            </div>
            <p className="line-clamp-2 text-xs text-muted-foreground">{e.description}</p>
            <dl className="grid grid-cols-2 gap-2 text-xs">
              <div className="min-w-0">
                <dt className="text-muted-foreground">Usuario</dt>
                <dd className="truncate font-medium">
                  {e.user_name} · {e.user_role}
                </dd>
              </div>
              <div className="min-w-0">
                <dt className="text-muted-foreground">Fecha</dt>
                <dd className="font-medium">
                  {new Date(e.created_at).toLocaleString("es-SV", {
                    day: "2-digit",
                    month: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </dd>
              </div>
            </dl>
            <Button variant="outline" className="h-11 w-full" onClick={() => setDetalle(e)}>
              Ver Detalle
            </Button>
          </article>
        ))}
        {!filtrados.length && (
          <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            {isLoading ? "Cargando auditoría…" : "No hay eventos con estos filtros."}
          </p>
        )}
      </div>

      {/* Tabla en pantallas grandes */}
      <div className="hidden overflow-hidden rounded-xl border bg-card shadow-soft md:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-secondary text-left text-xs uppercase tracking-wide text-brand">
              <tr>
                <th className="px-4 py-3">Fecha / hora</th>
                <th className="px-4 py-3">Usuario</th>
                <th className="px-4 py-3">Rol</th>
                <th className="px-4 py-3">Módulo</th>
                <th className="px-4 py-3">Acción</th>
                <th className="px-4 py-3">Elemento afectado</th>
                <th className="px-4 py-3">Resultado</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {visibles.map((e) => (
                <tr key={e.audit_id} className="hover:bg-secondary/50">
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {new Date(e.created_at).toLocaleString("es-SV")}
                  </td>
                  <td className="px-4 py-3 font-medium">{e.user_name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{e.user_role}</td>
                  <td className="px-4 py-3">{e.module}</td>
                  <td className="px-4 py-3">{etiquetaAccion(e.action)}</td>
                  <td className="max-w-[260px] truncate px-4 py-3 text-xs">
                    {e.entity_type} · {e.description}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                        e.status === "SUCCESS"
                          ? "bg-success/12 text-success"
                          : "bg-destructive/12 text-destructive"
                      }`}
                    >
                      {e.status === "SUCCESS" ? "Correcto" : "Fallido"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button size="sm" variant="outline" className="h-9" onClick={() => setDetalle(e)}>
                      Ver Detalle
                    </Button>
                  </td>
                </tr>
              ))}
              {!filtrados.length && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">
                    {isLoading ? "Cargando auditoría…" : "No hay eventos con estos filtros."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Paginacion
        pagina={paginaActual}
        totalPaginas={totalPaginas}
        totalFilas={filtrados.length}
        onCambiar={setPagina}
      />

      <AuditoriaDetalleDialog registro={detalle} onOpenChange={() => setDetalle(null)} />
    </div>
  );
}
