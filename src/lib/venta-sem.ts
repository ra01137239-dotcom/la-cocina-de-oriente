import { addDays, format, startOfISOWeek } from "date-fns";

export function fechaVenta(timestamp: string) {
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/El_Salvador", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date(timestamp));
  const valor = (tipo: string) => partes.find((p) => p.type === tipo)?.value ?? "";
  return `${valor("year")}-${valor("month")}-${valor("day")}`;
}

export function semanaVenta(timestamp: string) {
  const fecha = fechaVenta(timestamp);
  return format(startOfISOWeek(new Date(`${fecha}T12:00:00`)), "yyyy-MM-dd");
}

export function etiquetaSemana(inicio: string) {
  const fecha = new Date(`${inicio}T12:00:00`);
  return `${format(fecha, "dd/MM/yyyy")} – ${format(addDays(fecha, 6), "dd/MM/yyyy")}`;
}

export function coincidePeriodo(timestamp: string, anio: string, mes: string, semana = "todos") {
  const fecha = fechaVenta(timestamp);
  return (anio === "todos" || Number(fecha.slice(0, 4)) === Number(anio)) &&
    (mes === "todos" || Number(fecha.slice(5, 7)) === Number(mes)) &&
    (semana === "todos" || semanaVenta(timestamp) === semana);
}