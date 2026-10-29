import { money, NEGOCIO } from "./pos";
import { etiquetaSemana } from "./venta-fechas";

export type FilaVentas = {
  fecha: string;
  pagados: number;
  cancelados: number;
  items: number;
  efectivo: number;
  transferencia: number;
  total: number;
};

export type FiltrosVentas = { anio: string; mes: string; semana: string };
const columnas = ["Fecha", "Pagados", "Cancelados", "Ítems", "Efectivo", "Transferencia", "Total"];

export function totalesReporte(filas: FilaVentas[]) {
  return filas.reduce((total, fila) => ({
    fecha: "TOTALES",
    pagados: total.pagados + fila.pagados,
    cancelados: total.cancelados + fila.cancelados,
    items: total.items + fila.items,
    efectivo: Math.round((total.efectivo + fila.efectivo) * 100) / 100,
    transferencia: Math.round((total.transferencia + fila.transferencia) * 100) / 100,
    total: Math.round((total.total + fila.total) * 100) / 100,
  }), { fecha: "TOTALES", pagados: 0, cancelados: 0, items: 0, efectivo: 0, transferencia: 0, total: 0 });
}

function valores(fila: FilaVentas) {
  return [fila.fecha, fila.pagados, fila.cancelados, fila.items, fila.efectivo, fila.transferencia, fila.total];
}

export function periodoReporte(filtros: FiltrosVentas) {
  const mes = filtros.mes === "todos" ? "Todos" : new Intl.DateTimeFormat("es-SV", { month: "long", timeZone: "UTC" })
    .format(new Date(Date.UTC(2000, Number(filtros.mes) - 1, 1)));
  return `Año: ${filtros.anio === "todos" ? "Todos" : filtros.anio} · Mes: ${mes} · Semana: ${filtros.semana === "todos" ? "Todas" : etiquetaSemana(filtros.semana)}`;
}

export async function generarExcelVentas(filas: FilaVentas[], filtros: FiltrosVentas) {
  const { default: ExcelJS } = await import("exceljs");
  const libro = new ExcelJS.Workbook();
  libro.creator = NEGOCIO.nombre;
  const hoja = libro.addWorksheet("Resumen de ventas");
  hoja.addRow([NEGOCIO.nombre]);
  hoja.addRow(["Resumen de ventas"]);
  hoja.addRow([periodoReporte(filtros)]);
  hoja.addRow(["Importes en USD · Calendario de El Salvador"]);
  for (let fila = 1; fila <= 4; fila++) hoja.mergeCells(fila, 1, fila, 7);
  hoja.addRow([]);
  hoja.addRow(columnas);
  for (const fila of filas) hoja.addRow(valores(fila));
  const totales = hoja.addRow(valores(totalesReporte(filas)));
  totales.font = { bold: true };
  hoja.getRow(1).font = { bold: true, size: 16 };
  hoja.getRow(6).font = { bold: true };
  hoja.columns.forEach((columna, indice) => {
    columna.width = indice === 0 ? 18 : 19;
    if (indice >= 4) columna.numFmt = '"$"#,##0.00';
  });
  hoja.views = [{ state: "frozen", ySplit: 6 }];
  hoja.autoFilter = { from: "A6", to: `G${6 + filas.length}` };
  hoja.pageSetup = { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 };
  const buffer = await libro.xlsx.writeBuffer();
  return new Blob([new Uint8Array(buffer)], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

export async function generarPdfVentas(filas: FilaVentas[], filtros: FiltrosVentas) {
  const { PDFDocument, StandardFonts } = await import("pdf-lib");
  const documento = await PDFDocument.create();
  documento.setTitle(`Resumen de ventas — ${NEGOCIO.nombre}`);
  documento.setAuthor(NEGOCIO.nombre);
  const normal = await documento.embedFont(StandardFonts.Helvetica);
  const negrita = await documento.embedFont(StandardFonts.HelveticaBold);
  const datos = [...filas, totalesReporte(filas)];
  const porPagina = 20;
  const cantidadPaginas = Math.max(1, Math.ceil(datos.length / porPagina));
  // A4 landscape, with stable columns and whole rows at page breaks.
  const bordes = [36, 168, 252, 344, 426, 544, 686, 806];
  for (let indice = 0; indice < cantidadPaginas; indice++) {
    const pagina = documento.addPage([842, 595]);
    pagina.drawText(NEGOCIO.nombre, { x: 36, y: 554, size: 19, font: negrita });
    pagina.drawText("Resumen de ventas", { x: 36, y: 527, size: 14, font: negrita });
    pagina.drawText(periodoReporte(filtros), { x: 36, y: 505, size: 10, font: normal });
    pagina.drawText("Importes en USD · Calendario de El Salvador", { x: 36, y: 487, size: 9, font: normal });
    columnas.forEach((texto, columna) => pagina.drawText(texto, { x: (bordes[columna] ?? 36) + 4, y: 459, size: 10, font: negrita }));
    pagina.drawLine({ start: { x: 36, y: 450 }, end: { x: 806, y: 450 }, thickness: 1 });
    datos.slice(indice * porPagina, (indice + 1) * porPagina).forEach((fila, numero) => {
      const y = 431 - numero * 18;
      const fuente = fila.fecha === "TOTALES" ? negrita : normal;
      valores(fila).forEach((valor, columna) => {
        const texto = columna >= 4 ? money(Number(valor)) : String(valor);
        const x = columna === 0 ? 40 : (bordes[columna + 1] ?? 806) - 8 - fuente.widthOfTextAtSize(texto, 10);
        pagina.drawText(texto, { x, y, size: 10, font: fuente });
      });
    });
    pagina.drawText(`Página ${indice + 1} de ${cantidadPaginas}`, { x: 36, y: 28, size: 9, font: normal });
  }
  return new Blob([new Uint8Array(await documento.save())], { type: "application/pdf" });
}