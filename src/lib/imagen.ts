/**
 * Recorta la imagen a un cuadrado centrado, la reduce a `lado` × `lado` píxeles
 * y la devuelve como JPEG en formato data URL (unos pocos KB).
 */
export async function comprimirFoto(
  archivo: File,
  lado = 128,
  calidad = 0.8,
): Promise<string> {
  if (!archivo.type.startsWith("image/")) {
    throw new Error("El archivo debe ser una imagen");
  }

  const bitmap = await createImageBitmap(archivo);
  const recorte = Math.min(bitmap.width, bitmap.height);
  const sx = (bitmap.width - recorte) / 2;
  const sy = (bitmap.height - recorte) / 2;

  const canvas = document.createElement("canvas");
  canvas.width = lado;
  canvas.height = lado;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    throw new Error("No se pudo procesar la imagen");
  }

  // Fondo blanco: JPEG no admite transparencia.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, lado, lado);
  ctx.drawImage(bitmap, sx, sy, recorte, recorte, 0, 0, lado, lado);
  bitmap.close();

  return canvas.toDataURL("image/jpeg", calidad);
}