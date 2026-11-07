import { createMiddleware } from '@tanstack/react-start';
import { supabase } from '@/integrations/supabase/client';
export const backupSession = createMiddleware({ type: 'function' }).client(async ({ next }) => {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error('No se pudo leer la sesión. Vuelve a iniciar sesión.');
  const token = data.session?.access_token;
  return next({ headers: token ? { Authorization: `Bearer ${token}` } : {} });
});
