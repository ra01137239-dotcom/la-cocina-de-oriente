
-- ============ PARTE 1: CATEGORIAS ============
CREATE TABLE IF NOT EXISTS public.categorias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL CHECK (tipo IN ('producto','insumo')),
  nombre text NOT NULL,
  descripcion text,
  orden integer NOT NULL DEFAULT 0,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tipo, nombre)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.categorias TO authenticated;
GRANT ALL ON public.categorias TO service_role;
ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;

CREATE POLICY categorias_select ON public.categorias FOR SELECT TO authenticated USING (true);
CREATE POLICY categorias_admin_write ON public.categorias FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

INSERT INTO public.categorias (tipo, nombre)
SELECT 'producto', btrim(categoria) FROM public.productos
WHERE categoria IS NOT NULL AND btrim(categoria) <> ''
GROUP BY btrim(categoria)
ON CONFLICT (tipo, nombre) DO NOTHING;

INSERT INTO public.categorias (tipo, nombre)
SELECT 'insumo', btrim(categoria) FROM public.materia_prima
WHERE categoria IS NOT NULL AND btrim(categoria) <> ''
GROUP BY btrim(categoria)
ON CONFLICT (tipo, nombre) DO NOTHING;

ALTER TABLE public.productos ADD COLUMN IF NOT EXISTS categoria_id uuid REFERENCES public.categorias(id) ON DELETE SET NULL;
ALTER TABLE public.materia_prima ADD COLUMN IF NOT EXISTS categoria_id uuid REFERENCES public.categorias(id) ON DELETE SET NULL;

UPDATE public.productos p SET categoria_id = c.id
FROM public.categorias c
WHERE c.tipo = 'producto' AND c.nombre = btrim(p.categoria) AND p.categoria_id IS NULL;

UPDATE public.materia_prima m SET categoria_id = c.id
FROM public.categorias c
WHERE c.tipo = 'insumo' AND c.nombre = btrim(m.categoria) AND m.categoria_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_productos_categoria_id ON public.productos(categoria_id);
CREATE INDEX IF NOT EXISTS idx_materia_prima_categoria_id ON public.materia_prima(categoria_id);

-- ============ PARTE 2: AUDITORIA ============
CREATE SEQUENCE IF NOT EXISTS public.auditoria_op_seq;

CREATE TABLE IF NOT EXISTS public.auditoria (
  audit_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_id text NOT NULL UNIQUE,
  user_id uuid,
  user_name text NOT NULL DEFAULT '',
  user_role text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  action text NOT NULL,
  module text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  description text NOT NULL DEFAULT '',
  old_values jsonb,
  new_values jsonb,
  status text NOT NULL DEFAULT 'SUCCESS',
  reason text
);

-- Solo lectura para admin; inserciones vienen de funciones SECURITY DEFINER.
GRANT SELECT ON public.auditoria TO authenticated;
GRANT ALL ON public.auditoria TO service_role;
ALTER TABLE public.auditoria ENABLE ROW LEVEL SECURITY;

CREATE POLICY auditoria_select_admin ON public.auditoria FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

CREATE INDEX IF NOT EXISTS idx_auditoria_created_at ON public.auditoria(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auditoria_entity ON public.auditoria(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_user ON public.auditoria(user_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_module ON public.auditoria(module);

-- Identidad: siempre desde la sesion autenticada
CREATE OR REPLACE FUNCTION public.auditoria_identidad()
RETURNS TABLE (uid uuid, nombre text, rol text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    auth.uid(),
    COALESCE((SELECT u.nombre FROM public.usuarios u WHERE u.id = auth.uid()), 'sistema'),
    COALESCE((SELECT ur.role::text FROM public.user_roles ur WHERE ur.user_id = auth.uid()
              ORDER BY (ur.role = 'admin') DESC LIMIT 1), 'sin_rol');
$$;

CREATE OR REPLACE FUNCTION public.log_audit(
  _action text, _module text, _entity_type text, _entity_id uuid,
  _description text DEFAULT '', _old jsonb DEFAULT NULL, _new jsonb DEFAULT NULL,
  _status text DEFAULT 'SUCCESS', _reason text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE ident record; nuevo uuid;
BEGIN
  SELECT * INTO ident FROM public.auditoria_identidad();
  INSERT INTO public.auditoria (operation_id, user_id, user_name, user_role, action, module,
    entity_type, entity_id, description, old_values, new_values, status, reason)
  VALUES (
    'AUD-' || to_char(now(),'YYYYMMDD') || '-' || lpad(nextval('public.auditoria_op_seq')::text, 6, '0'),
    ident.uid, COALESCE(ident.nombre,'sistema'), COALESCE(ident.rol,'sin_rol'),
    _action, _module, _entity_type, _entity_id, COALESCE(_description,''), _old, _new,
    COALESCE(_status,'SUCCESS'), _reason)
  RETURNING audit_id INTO nuevo;
  RETURN nuevo;
END; $$;

REVOKE ALL ON FUNCTION public.log_audit(text,text,text,uuid,text,jsonb,jsonb,text,text) FROM public;
GRANT EXECUTE ON FUNCTION public.log_audit(text,text,text,uuid,text,jsonb,jsonb,text,text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.auditoria_identidad() TO authenticated, service_role;

-- Trigger generico reutilizable: TG_ARGV[0]=module, TG_ARGV[1]=entity_type, TG_ARGV[2]=campo etiqueta
CREATE OR REPLACE FUNCTION public.fn_auditoria()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_module text := TG_ARGV[0];
  v_entity text := TG_ARGV[1];
  v_label_col text := COALESCE(TG_ARGV[2], '');
  v_old jsonb; v_new jsonb; v_diff_old jsonb; v_diff_new jsonb;
  v_action text; v_desc text; v_id uuid; v_label text := ''; v_reason text := NULL;
BEGIN
  IF TG_OP = 'DELETE' THEN v_old := to_jsonb(OLD); ELSE v_old := CASE WHEN TG_OP='UPDATE' THEN to_jsonb(OLD) ELSE NULL END; END IF;
  IF TG_OP <> 'DELETE' THEN v_new := to_jsonb(NEW); END IF;

  v_id := COALESCE((v_new->>'id')::uuid, (v_old->>'id')::uuid);

  IF v_label_col <> '' THEN
    v_label := COALESCE(v_new->>v_label_col, v_old->>v_label_col, '');
  END IF;

  IF TG_OP = 'UPDATE' THEN
    SELECT jsonb_object_agg(key, v_old->key), jsonb_object_agg(key, value)
      INTO v_diff_new, v_diff_new
      FROM jsonb_each(v_new) WHERE v_old->key IS DISTINCT FROM value;
    SELECT jsonb_object_agg(key, v_old->key) INTO v_diff_old
      FROM jsonb_each(v_new) WHERE v_old->key IS DISTINCT FROM value;
    SELECT jsonb_object_agg(key, value) INTO v_diff_new
      FROM jsonb_each(v_new) WHERE v_old->key IS DISTINCT FROM value;
    IF v_diff_new IS NULL THEN RETURN NEW; END IF;
  ELSE
    v_diff_old := v_old; v_diff_new := v_new;
  END IF;

  v_action := CASE TG_OP WHEN 'INSERT' THEN 'CREAR' WHEN 'UPDATE' THEN 'EDITAR' ELSE 'ELIMINAR' END;

  IF v_entity = 'pedido' AND TG_OP = 'UPDATE' AND (v_diff_new ? 'estado') THEN
    IF NEW.estado = 'pagado' THEN
      v_action := 'COBRAR';
      v_desc := 'Cobro del ticket ' || COALESCE(NEW.numero_ticket,'') || ' por total ' || COALESCE(NEW.total::text,'0');
    ELSIF NEW.estado = 'cancelado' THEN
      v_action := 'ANULAR';
      v_desc := 'Anulacion del ticket ' || COALESCE(NEW.numero_ticket,'');
    ELSE
      v_action := 'CAMBIAR_ESTADO';
      v_desc := 'Cambio de estado del ticket ' || COALESCE(NEW.numero_ticket,'') || ': ' || OLD.estado || ' -> ' || NEW.estado;
    END IF;
  ELSIF v_entity = 'materia_prima' AND TG_OP = 'UPDATE' AND (v_diff_new ? 'stock_actual') THEN
    v_action := 'AJUSTAR_STOCK';
    v_desc := 'Ajuste de stock de ' || v_label || ': ' || OLD.stock_actual::text || ' -> ' || NEW.stock_actual::text;
  ELSIF v_entity = 'user_role' THEN
    v_action := CASE TG_OP WHEN 'INSERT' THEN 'ASIGNAR_ROL' WHEN 'DELETE' THEN 'QUITAR_ROL' ELSE 'CAMBIAR_ROL' END;
    v_desc := 'Rol ' || COALESCE(v_new->>'role', v_old->>'role','') || ' sobre usuario ' || COALESCE(v_new->>'user_id', v_old->>'user_id','');
    v_id := COALESCE((v_new->>'user_id')::uuid, (v_old->>'user_id')::uuid);
  ELSIF v_entity = 'usuario' AND TG_OP = 'UPDATE' AND (v_diff_new ? 'aprobado') THEN
    v_action := CASE WHEN NEW.aprobado THEN 'APROBAR' ELSE 'SUSPENDER' END;
    v_desc := (CASE WHEN NEW.aprobado THEN 'Aprobacion' ELSE 'Suspension' END) || ' de la cuenta ' || COALESCE(NEW.correo,'');
  ELSIF v_entity = 'producto' AND TG_OP = 'UPDATE' AND (v_diff_new ? 'precio') THEN
    v_action := 'CAMBIAR_PRECIO';
    v_desc := 'Precio de ' || v_label || ': ' || OLD.precio::text || ' -> ' || NEW.precio::text;
  END IF;

  IF v_desc IS NULL THEN
    v_desc := initcap(lower(v_action)) || ' ' || v_entity || CASE WHEN v_label <> '' THEN ' "' || v_label || '"' ELSE '' END;
  END IF;

  PERFORM public.log_audit(v_action, v_module, v_entity, v_id, v_desc, v_diff_old, v_diff_new, 'SUCCESS', v_reason);
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_aud_productos ON public.productos;
CREATE TRIGGER trg_aud_productos AFTER INSERT OR UPDATE OR DELETE ON public.productos
  FOR EACH ROW EXECUTE FUNCTION public.fn_auditoria('PRODUCTOS','producto','nombre');

DROP TRIGGER IF EXISTS trg_aud_bebidas ON public.bebidas;
CREATE TRIGGER trg_aud_bebidas AFTER INSERT OR UPDATE OR DELETE ON public.bebidas
  FOR EACH ROW EXECUTE FUNCTION public.fn_auditoria('PRODUCTOS','bebida','nombre');

DROP TRIGGER IF EXISTS trg_aud_materia_prima ON public.materia_prima;
CREATE TRIGGER trg_aud_materia_prima AFTER INSERT OR UPDATE OR DELETE ON public.materia_prima
  FOR EACH ROW EXECUTE FUNCTION public.fn_auditoria('INVENTARIO','materia_prima','nombre');

DROP TRIGGER IF EXISTS trg_aud_pedidos ON public.pedidos;
CREATE TRIGGER trg_aud_pedidos AFTER INSERT OR UPDATE OR DELETE ON public.pedidos
  FOR EACH ROW EXECUTE FUNCTION public.fn_auditoria('PEDIDOS','pedido','numero_ticket');

DROP TRIGGER IF EXISTS trg_aud_usuarios ON public.usuarios;
CREATE TRIGGER trg_aud_usuarios AFTER INSERT OR UPDATE OR DELETE ON public.usuarios
  FOR EACH ROW EXECUTE FUNCTION public.fn_auditoria('USUARIOS','usuario','nombre');

DROP TRIGGER IF EXISTS trg_aud_user_roles ON public.user_roles;
CREATE TRIGGER trg_aud_user_roles AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.fn_auditoria('USUARIOS','user_role','role');

DROP TRIGGER IF EXISTS trg_aud_categorias ON public.categorias;
CREATE TRIGGER trg_aud_categorias AFTER INSERT OR UPDATE OR DELETE ON public.categorias
  FOR EACH ROW EXECUTE FUNCTION public.fn_auditoria('CATEGORIAS','categoria','nombre');

DROP TRIGGER IF EXISTS trg_aud_producto_insumos ON public.producto_insumos;
CREATE TRIGGER trg_aud_producto_insumos AFTER INSERT OR UPDATE OR DELETE ON public.producto_insumos
  FOR EACH ROW EXECUTE FUNCTION public.fn_auditoria('PRODUCTOS','producto','producto_id');

-- Sincronizar usuarios.rol (texto legado) con user_roles (fuente de verdad)
CREATE OR REPLACE FUNCTION public.sync_usuarios_rol()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := COALESCE(NEW.user_id, OLD.user_id); v_rol text;
BEGIN
  SELECT COALESCE((SELECT ur.role::text FROM public.user_roles ur WHERE ur.user_id = v_uid
                   ORDER BY (ur.role = 'admin') DESC LIMIT 1), 'cajera') INTO v_rol;
  UPDATE public.usuarios SET rol = v_rol WHERE id = v_uid AND rol IS DISTINCT FROM v_rol;
  RETURN NULL;
END; $$;

DROP TRIGGER IF EXISTS trg_sync_usuarios_rol ON public.user_roles;
CREATE TRIGGER trg_sync_usuarios_rol AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.sync_usuarios_rol();
