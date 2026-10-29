import { z } from "zod";

export const registroSchema = z.object({
  correo: z.string().trim().email("Escribe un correo válido").max(255),
  clave: z.string().min(6, "La contraseña debe tener al menos 6 caracteres").max(128),
  mayorDeEdad: z.literal(true, { errorMap: () => ({ message: "Debes confirmar que eres mayor de 18 años" }) }),
});