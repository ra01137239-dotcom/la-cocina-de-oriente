CREATE TABLE public.producto_insumos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  producto_id uuid NOT NULL REFERENCES public.productos(id) ON DELETE CASCADE,
  materia_prima_id uuid NOT NULL REFERENCES public.materia_prima(id) ON DELETE CASCADE,
  cantidad_por_unidad numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (producto_id, materia_prima_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.producto_insumos TO authenticated;
GRANT ALL ON public.producto_insumos TO service_role;

ALTER TABLE public.producto_insumos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "producto_insumos_select" ON public.producto_insumos
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "producto_insumos_admin_write" ON public.producto_insumos
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX producto_insumos_producto_idx ON public.producto_insumos(producto_id);
CREATE INDEX producto_insumos_materia_idx ON public.producto_insumos(materia_prima_id);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER producto_insumos_updated_at
  BEFORE UPDATE ON public.producto_insumos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.materia_prima ADD COLUMN fecha_vencimiento date;

ALTER TABLE public.productos DROP COLUMN receta_materia_prima;

CREATE OR REPLACE FUNCTION public.descontar_inventario_al_pagar()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  item jsonb;
BEGIN
  IF NEW.estado <> 'pagado' THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.estado = 'pagado' THEN
    RETURN NEW;
  END IF;

  FOR item IN SELECT * FROM jsonb_array_elements(COALESCE(NEW.items, '[]'::jsonb))
  LOOP
    IF COALESCE(item->>'tipo', 'producto') = 'producto' AND (item->>'refId') IS NOT NULL THEN
      UPDATE public.materia_prima mp
      SET stock_actual = mp.stock_actual - (pi.cantidad_por_unidad * COALESCE((item->>'cantidad')::numeric, 0))
      FROM public.producto_insumos pi
      WHERE pi.materia_prima_id = mp.id
        AND pi.producto_id = (item->>'refId')::uuid;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER pedidos_descontar_inventario
  AFTER INSERT OR UPDATE OF estado ON public.pedidos
  FOR EACH ROW EXECUTE FUNCTION public.descontar_inventario_al_pagar();