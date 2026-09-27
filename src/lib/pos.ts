export type CategoriaProducto = "Platos Fuertes" | "Pupusas" | "Especiales" | "Bebidas";

export type Producto = {
  id: string;
  nombre: string;
  descripcion: string;
  precio: number;
  categoria: string;
  imagen_url: string | null;
  disponible: boolean;
};

export type Bebida = {
  id: string;
  nombre: string;
  precio: number;
  tamano: string;
  disponible: boolean;
  tipo?: string;
  categoria_id?: string | null;
};

export type Insumo = {
  id: string;
  codigo: string;
  nombre: string;
  categoria: string;
  stock_actual: number;
  stock_minimo: number;
  unidad: string;
  fecha_vencimiento?: string | null;
};

export type RecetaLinea = {
  id?: string;
  materia_prima_id: string;
  cantidad_por_unidad: number;
};

/** Días que faltan para el vencimiento (negativo = ya vencido). */
export function diasParaVencer(fecha?: string | null) {
  if (!fecha) return null;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const [y, m, d] = fecha.split("-").map(Number);
  if (!y || !m || !d) return null;
  const objetivo = new Date(y, m - 1, d);
  return Math.round((objetivo.getTime() - hoy.getTime()) / 86400000);
}

export type PedidoItem = {
  tipo: "producto" | "bebida";
  refId: string;
  nombre: string;
  precioUnitario: number;
  cantidad: number;
};

export type Pedido = {
  id: string;
  numero_ticket: string;
  tipo: "comedor" | "llevar";
  mesa: string | null;
  cajera_uid: string | null;
  estado: "pendiente" | "enviado" | "pagado" | "cancelado";
  total: number;
  fecha_creacion: string;
  fecha_pago: string | null;
  items: PedidoItem[];
};

export type PerfilUsuario = {
  id: string;
  nombre: string;
  correo: string;
  foto_url: string | null;
  rol: string;
  aprobado?: boolean;
};

export const money = (value: number) =>
  `$${(Number.isFinite(value) ? value : 0).toFixed(2)}`;

/** Los precios ya incluyen impuestos: el total es la simple suma de línea. */
export function calcularTotales(items: PedidoItem[]) {
  const bruto = items.reduce((sum, i) => sum + i.precioUnitario * i.cantidad, 0);
  const total = Math.round(bruto * 100) / 100;
  return { subtotal: total, iva: 0, total };
}

export const pedidoEditable = (estado: string) => estado !== "pagado" && estado !== "cancelado";

export function nuevoNumeroTicket() {
  const now = new Date();
  const dia = `${now.getFullYear()}`.slice(2) + String(now.getMonth() + 1).padStart(2, "0") + String(now.getDate()).padStart(2, "0");
  const serie = String(Math.floor(now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds())).padStart(5, "0");
  return `TCK-${dia}-${serie}`;
}

export const NEGOCIO = {
  nombre: "La Cocina de Oriente",
  descripcion: "Pupusería salvadoreña · Punto de venta",
  direccion: "Calle El Progreso #12, San Miguel",
  telefono: "+503 2661 0000",
  nrc: "NRC 245-8",
};

/** Papel de 48 mm: 32 caracteres por línea. */
export const ANCHO_TICKET = 32;

const LINE = "-".repeat(ANCHO_TICKET);

function fila(izq: string, der: string, ancho = ANCHO_TICKET) {
  const espacio = Math.max(1, ancho - izq.length - der.length);
  return `${izq}${" ".repeat(espacio)}${der}`;
}

export function renderTicket(
  pedido: {
    numeroTicket: string;
    tipo: string;
    mesa: string | null;
    items: PedidoItem[];
    total: number;
    fecha: Date;
    cajera: string;
  },
  variante: "cocina" | "cliente",
) {
  const head = [
    NEGOCIO.nombre.toUpperCase(),
    variante === "cocina" ? "** COMANDA DE COCINA **" : NEGOCIO.direccion,
    variante === "cocina" ? "" : `Tel. ${NEGOCIO.telefono} · ${NEGOCIO.nrc}`,
    LINE,
    `Ticket: ${pedido.numeroTicket}`,
    `Fecha : ${pedido.fecha.toLocaleString("es-SV")}`,
    `Tipo  : ${pedido.tipo === "comedor" ? "Comedor" : "Para llevar"}${pedido.mesa ? ` · Mesa ${pedido.mesa}` : ""}`,
    `Atiende: ${pedido.cajera}`,
    LINE,
  ].filter((l) => l !== "");

  const cuerpo = pedido.items.flatMap((item) =>
    variante === "cocina"
      ? [`${String(item.cantidad).padStart(2, " ")} x ${item.nombre}`]
      : [
          `${String(item.cantidad).padStart(2, " ")} x ${item.nombre}`,
          fila(`     ${money(item.precioUnitario)} c/u`, money(item.precioUnitario * item.cantidad)),
        ],
  );

  const pie =
    variante === "cocina"
      ? [LINE, "Preparar en orden de llegada", "¡Buen provecho!"]
      : [
          LINE,
          fila("TOTAL", money(pedido.total)),
          LINE,
          "Forma de pago: EFECTIVO",
          "¡Gracias por su preferencia!",
        ];

  return [...head, ...cuerpo, ...pie].join("\n");
}
