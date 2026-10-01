CREATE TYPE public.app_role AS ENUM ('admin','cajera');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE POLICY "user_roles_select" ON public.user_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "user_roles_admin_insert" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "user_roles_admin_update" ON public.user_roles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "user_roles_admin_delete" ON public.user_roles FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS aprobado boolean NOT NULL DEFAULT false;
UPDATE public.usuarios SET aprobado = true;

INSERT INTO public.user_roles (user_id, role)
SELECT id, CASE WHEN rol = 'admin' THEN 'admin'::public.app_role ELSE 'cajera'::public.app_role END
FROM public.usuarios
ON CONFLICT DO NOTHING;

CREATE POLICY "usuarios_admin_update" ON public.usuarios FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "usuarios_admin_delete" ON public.usuarios FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS productos_all ON public.productos;
CREATE POLICY "productos_select" ON public.productos FOR SELECT TO authenticated USING (true);
CREATE POLICY "productos_admin_write" ON public.productos FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS bebidas_all ON public.bebidas;
CREATE POLICY "bebidas_select" ON public.bebidas FOR SELECT TO authenticated USING (true);
CREATE POLICY "bebidas_admin_write" ON public.bebidas FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));