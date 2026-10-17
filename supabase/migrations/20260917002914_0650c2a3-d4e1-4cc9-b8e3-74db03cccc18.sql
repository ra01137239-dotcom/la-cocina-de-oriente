
CREATE OR REPLACE FUNCTION public.sync_categoria_id()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_tipo text := TG_ARGV[0]; v_nombre text; v_id uuid;
BEGIN
  v_nombre := btrim(COALESCE(NEW.categoria, ''));
  IF v_nombre = '' THEN RETURN NEW; END IF;

  IF TG_OP = 'UPDATE' AND NEW.categoria IS NOT DISTINCT FROM OLD.categoria AND NEW.categoria_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT id INTO v_id FROM public.categorias WHERE tipo = v_tipo AND nombre = v_nombre;
  IF v_id IS NULL THEN
    INSERT INTO public.categorias (tipo, nombre) VALUES (v_tipo, v_nombre)
    ON CONFLICT (tipo, nombre) DO UPDATE SET nombre = EXCLUDED.nombre
    RETURNING id INTO v_id;
  END IF;

  NEW.categoria_id := v_id;
  RETURN NEW;
END; $$;

REVOKE ALL ON FUNCTION public.sync_categoria_id() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_sync_categoria_productos ON public.productos;
CREATE TRIGGER trg_sync_categoria_productos BEFORE INSERT OR UPDATE ON public.productos
  FOR EACH ROW EXECUTE FUNCTION public.sync_categoria_id('producto');

DROP TRIGGER IF EXISTS trg_sync_categoria_materia_prima ON public.materia_prima;
CREATE TRIGGER trg_sync_categoria_materia_prima BEFORE INSERT OR UPDATE ON public.materia_prima
  FOR EACH ROW EXECUTE FUNCTION public.sync_categoria_id('insumo');
