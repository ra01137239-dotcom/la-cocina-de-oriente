REVOKE ALL ON FUNCTION public.descontar_inventario_al_pagar() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.pedidos_guard_cerrado() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;