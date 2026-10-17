-- usuarios
CREATE TABLE public.usuarios (
  id uuid PRIMARY KEY,
  nombre text NOT NULL DEFAULT '',
  correo text NOT NULL DEFAULT '',
  foto_url text,
  rol text NOT NULL DEFAULT 'cajera',
  turno text NOT NULL DEFAULT 'Turno matutino',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.usuarios TO authenticated;
GRANT ALL ON public.usuarios TO service_role;
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "usuarios_select" ON public.usuarios FOR SELECT TO authenticated USING (true);
CREATE POLICY "usuarios_insert_own" ON public.usuarios FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "usuarios_update_own" ON public.usuarios FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- productos
CREATE TABLE public.productos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  descripcion text NOT NULL DEFAULT '',
  precio numeric(10,2) NOT NULL DEFAULT 0,
  categoria text NOT NULL DEFAULT 'Pupusas',
  imagen_url text,
  disponible boolean NOT NULL DEFAULT true,
  receta_materia_prima jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.productos TO authenticated;
GRANT ALL ON public.productos TO service_role;
ALTER TABLE public.productos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "productos_all" ON public.productos FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- materia prima
CREATE TABLE public.materia_prima (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL,
  nombre text NOT NULL,
  categoria text NOT NULL DEFAULT 'General',
  stock_actual numeric(10,2) NOT NULL DEFAULT 0,
  stock_minimo numeric(10,2) NOT NULL DEFAULT 0,
  unidad text NOT NULL DEFAULT 'unidad',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.materia_prima TO authenticated;
GRANT ALL ON public.materia_prima TO service_role;
ALTER TABLE public.materia_prima ENABLE ROW LEVEL SECURITY;
CREATE POLICY "materia_prima_all" ON public.materia_prima FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- bebidas
CREATE TABLE public.bebidas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  precio numeric(10,2) NOT NULL DEFAULT 0,
  tamano text NOT NULL DEFAULT 'Mediano',
  disponible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bebidas TO authenticated;
GRANT ALL ON public.bebidas TO service_role;
ALTER TABLE public.bebidas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bebidas_all" ON public.bebidas FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- pedidos
CREATE TABLE public.pedidos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_ticket text NOT NULL,
  tipo text NOT NULL DEFAULT 'comedor',
  mesa text,
  cajera_uid uuid,
  estado text NOT NULL DEFAULT 'pendiente',
  bloqueado boolean NOT NULL DEFAULT false,
  subtotal numeric(10,2) NOT NULL DEFAULT 0,
  iva numeric(10,2) NOT NULL DEFAULT 0,
  total numeric(10,2) NOT NULL DEFAULT 0,
  fecha_creacion timestamptz NOT NULL DEFAULT now(),
  fecha_pago timestamptz,
  items jsonb NOT NULL DEFAULT '[]'::jsonb
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pedidos TO authenticated;
GRANT ALL ON public.pedidos TO service_role;
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pedidos_select" ON public.pedidos FOR SELECT TO authenticated USING (true);
CREATE POLICY "pedidos_insert" ON public.pedidos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "pedidos_update" ON public.pedidos FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "pedidos_delete" ON public.pedidos FOR DELETE TO authenticated USING (bloqueado = false);

-- Bloqueo de edición de items cuando bloqueado = true
CREATE OR REPLACE FUNCTION public.pedidos_guard_bloqueado()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.bloqueado = true THEN
    IF NEW.items IS DISTINCT FROM OLD.items
       OR NEW.subtotal IS DISTINCT FROM OLD.subtotal
       OR NEW.iva IS DISTINCT FROM OLD.iva
       OR NEW.total IS DISTINCT FROM OLD.total
       OR NEW.numero_ticket IS DISTINCT FROM OLD.numero_ticket
       OR NEW.tipo IS DISTINCT FROM OLD.tipo
       OR NEW.mesa IS DISTINCT FROM OLD.mesa THEN
      RAISE EXCEPTION 'Este pedido ya fue enviado y no admite cambios.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER pedidos_guard_bloqueado_trg
BEFORE UPDATE ON public.pedidos
FOR EACH ROW EXECUTE FUNCTION public.pedidos_guard_bloqueado();

-- Semillas
INSERT INTO public.materia_prima (codigo, nombre, categoria, stock_actual, stock_minimo, unidad) VALUES
('INS-001','Masa de maíz','Granos',45,20,'libra'),
('INS-002','Queso quesillo','Lácteos',12,15,'libra'),
('INS-003','Chicharrón molido','Carnes',18,10,'libra'),
('INS-004','Frijol molido','Granos',30,12,'libra'),
('INS-005','Loroco','Vegetales',4,6,'libra'),
('INS-006','Repollo (curtido)','Vegetales',25,10,'libra'),
('INS-007','Salsa de tomate','Salsas',16,8,'litro'),
('INS-008','Aceite vegetal','Abarrotes',9,5,'litro');

INSERT INTO public.productos (nombre, descripcion, precio, categoria, disponible) VALUES
('Pupusa de queso','Pupusa de maíz rellena de quesillo fresco',0.75,'Pupusas',true),
('Pupusa revuelta','Queso, frijol molido y chicharrón',1.00,'Pupusas',true),
('Pupusa de frijol con queso','Frijol molido criollo con quesillo',0.90,'Pupusas',true),
('Pupusa de loroco con queso','Flor de loroco fresca con quesillo',1.10,'Pupusas',true),
('Pupusa de chicharrón','Chicharrón molido sazonado a la plancha',0.95,'Pupusas',true),
('Pupusa de ayote con queso','Ayote tierno rallado con quesillo',1.00,'Pupusas',true),
('Curtido de repollo','Porción de curtido casero con vinagre',0.50,'Acompañamientos',true),
('Salsa de tomate casera','Porción extra de salsa de tomate',0.35,'Acompañamientos',true),
('Yuca frita con chicharrón','Yuca frita crujiente con chicharrón y curtido',3.50,'Acompañamientos',true),
('Plátano frito con frijoles','Plátano maduro frito, frijoles y crema',2.75,'Acompañamientos',true);

INSERT INTO public.bebidas (nombre, precio, tamano, disponible) VALUES
('Horchata de morro',1.25,'Grande',true),
('Fresco de ensalada',1.25,'Grande',true),
('Chan con limón',1.00,'Mediano',true),
('Café de olla',0.85,'Pequeño',true),
('Gaseosa en lata',1.10,'Lata',true),
('Agua embotellada',0.75,'Medio litro',true);