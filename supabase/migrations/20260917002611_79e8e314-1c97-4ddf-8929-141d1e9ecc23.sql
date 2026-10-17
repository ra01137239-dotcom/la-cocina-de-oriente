
REVOKE ALL ON FUNCTION public.fn_auditoria() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_usuarios_rol() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.auditoria_identidad() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.log_audit(text,text,text,uuid,text,jsonb,jsonb,text,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.descontar_inventario_al_pagar() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.pedidos_guard_cerrado() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.auditoria_identidad() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.log_audit(text,text,text,uuid,text,jsonb,jsonb,text,text) TO authenticated, service_role;
