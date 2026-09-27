/**
 * Impresión térmica por Bluetooth (Web Bluetooth) para impresoras ESC/POS
 * tipo Goojprt / PT-210 con papel de 48 mm (58 mm de rollo → 32 caracteres).
 */

/** 48 mm de papel = 32 caracteres por línea. */
export const ANCHO_TICKET = 32;

const SERVICIO = "000018f0-0000-1000-8000-00805f9b34fb";
const CARACTERISTICA = "00002af1-0000-1000-8000-00805f9b34fb";

type Estado = "sin-soporte" | "desconectada" | "conectando" | "conectada";

type Suscriptor = (estado: Estado, nombre: string | null) => void;

let dispositivo: BluetoothDevice | null = null;
let caracteristica: BluetoothRemoteGATTCharacteristic | null = null;
let estado: Estado = "desconectada";
const suscriptores = new Set<Suscriptor>();

export function soportaBluetooth() {
  return typeof navigator !== "undefined" && "bluetooth" in navigator;
}

function emitir(nuevo: Estado) {
  estado = nuevo;
  const nombre = dispositivo?.name ?? null;
  suscriptores.forEach((fn) => fn(estado, nombre));
}

export function suscribirImpresora(fn: Suscriptor) {
  suscriptores.add(fn);
  fn(soportaBluetooth() ? estado : "sin-soporte", dispositivo?.name ?? null);
  return () => suscriptores.delete(fn);
}

export function impresoraConectada() {
  return caracteristica !== null;
}

export async function conectarImpresora() {
  if (!soportaBluetooth()) {
    throw new Error(
      "Este navegador no permite conectar impresoras Bluetooth. Usa Chrome en Android o en computadora.",
    );
  }
  emitir("conectando");
  try {
    dispositivo = await (navigator as Navigator).bluetooth.requestDevice({
      filters: [{ services: [SERVICIO] }, { namePrefix: "PT-210" }, { namePrefix: "PT210" }],
      optionalServices: [SERVICIO],
    });
    dispositivo.addEventListener("gattserverdisconnected", () => {
      caracteristica = null;
      emitir("desconectada");
    });
    const servidor = await dispositivo.gatt!.connect();
    const servicio = await servidor.getPrimaryService(SERVICIO);
    caracteristica = await servicio.getCharacteristic(CARACTERISTICA);
    emitir("conectada");
    return dispositivo.name ?? "Impresora";
  } catch (error) {
    caracteristica = null;
    emitir("desconectada");
    throw error;
  }
}

export function desconectarImpresora() {
  try {
    dispositivo?.gatt?.disconnect();
  } catch {
    /* ignorar */
  }
  caracteristica = null;
  emitir("desconectada");
}

/** La impresora usa CP437: quitamos tildes y caracteres especiales. */
function aAscii(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E\n]/g, "?");
}

function bytes(texto: string) {
  const salida = new Uint8Array(texto.length);
  for (let i = 0; i < texto.length; i += 1) salida[i] = texto.charCodeAt(i) & 0xff;
  return salida;
}

async function escribir(datos: Uint8Array) {
  if (!caracteristica) throw new Error("Impresora no conectada");
  const TROZO = 180;
  for (let i = 0; i < datos.length; i += TROZO) {
    const parte = datos.slice(i, i + TROZO);
    if (caracteristica.writeValueWithoutResponse) {
      await caracteristica.writeValueWithoutResponse(parte as BufferSource);
    } else {
      await caracteristica.writeValue(parte as BufferSource);
    }
    await new Promise((r) => setTimeout(r, 25));
  }
}

async function imprimirBluetooth(texto: string) {
  const cuerpo = aAscii(texto).replace(/\n/g, "\r\n");
  const init = new Uint8Array([0x1b, 0x40, 0x1b, 0x74, 0x00, 0x1b, 0x61, 0x00]);
  const fin = new Uint8Array([0x0a, 0x0a, 0x0a, 0x0a]);
  const contenido = bytes(cuerpo);
  const total = new Uint8Array(init.length + contenido.length + fin.length);
  total.set(init, 0);
  total.set(contenido, init.length);
  total.set(fin, init.length + contenido.length);
  await escribir(total);
}

/** Respaldo: diálogo de impresión del navegador con papel de 48 mm. */
function imprimirNavegador(texto: string) {
  if (typeof window === "undefined") return;
  const marco = document.createElement("iframe");
  marco.style.position = "fixed";
  marco.style.right = "0";
  marco.style.bottom = "0";
  marco.style.width = "0";
  marco.style.height = "0";
  marco.style.border = "0";
  document.body.appendChild(marco);
  const doc = marco.contentWindow?.document;
  if (!doc) return;
  doc.open();
  doc.write(
    `<html><head><title>Ticket</title><style>@page{size:48mm auto;margin:0}body{width:48mm;margin:0;padding:2mm;font-family:ui-monospace,monospace;font-size:10px;line-height:1.25;white-space:pre-wrap}</style></head><body>${texto
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")}</body></html>`,
  );
  doc.close();
  marco.contentWindow?.focus();
  marco.contentWindow?.print();
  window.setTimeout(() => marco.remove(), 1500);
}

/** Imprime por Bluetooth si hay impresora conectada; si no, usa el navegador. */
export async function imprimirTexto(texto: string) {
  if (impresoraConectada()) {
    await imprimirBluetooth(texto);
    return "bluetooth" as const;
  }
  imprimirNavegador(texto);
  return "navegador" as const;
}
