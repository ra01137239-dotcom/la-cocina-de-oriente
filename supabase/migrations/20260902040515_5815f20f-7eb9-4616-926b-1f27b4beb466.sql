DROP TRIGGER IF EXISTS pedidos_guard_bloqueado_trg ON public.pedidos;
DROP FUNCTION IF EXISTS public.pedidos_guard_bloqueado();

DROP POLICY IF EXISTS pedidos_delete ON public.pedidos;
ALTER TABLE public.pedidos DROP COLUMN IF EXISTS bloqueado;

CREATE OR REPLACE FUNCTION public.pedidos_guard_cerrado()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.estado IN ('pagado','cancelado') AND NEW.items IS DISTINCT FROM OLD.items THEN
    RAISE EXCEPTION 'El pedido ya está cerrado y no admite cambios en sus items';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER pedidos_guard_cerrado_trg
BEFORE UPDATE ON public.pedidos
FOR EACH ROW EXECUTE FUNCTION public.pedidos_guard_cerrado();

CREATE POLICY pedidos_delete ON public.pedidos
FOR DELETE TO authenticated
USING (estado NOT IN ('pagado','cancelado'));