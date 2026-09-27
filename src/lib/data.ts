import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import { imprimirTexto } from "./impresora";
import type { Bebida, Insumo, Pedido, PerfilUsuario, Producto } from "./pos";

export function useSesion() {
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let activo = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!activo) return;
      setUserId(data.session?.user.id ?? null);
      setEmail(data.session?.user.email ?? null);
      setCargando(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserId(session?.user.id ?? null);
      setEmail(session?.user.email ?? null);
      setCargando(false);
    });
    return () => {
      activo = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { userId, email, cargando };
}

export function usePerfil() {
  const { userId, email } = useSesion();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["perfil", userId],
    enabled: !!userId,
    queryFn: async (): Promise<PerfilUsuario | null> => {
      const { data, error } = await supabase
        .from("usuarios")
        .select("*")
        .eq("id", userId!)
        .maybeSingle();
      if (error) throw error;
      return data as PerfilUsuario | null;
    },
  });

  useEffect(() => {
    if (!userId || query.isLoading || query.data) return;
    void supabase
      .from("usuarios")
      .insert({
        id: userId,
        nombre: (email ?? "Usuaria").split("@")[0] ?? "Usuaria",
        correo: email ?? "",
        rol: "cajera",
      })
      .then(() => queryClient.invalidateQueries({ queryKey: ["perfil", userId] }));
  }, [userId, email, query.isLoading, query.data, queryClient]);

  return query;
}

/** ¿La sesión actual tiene rol de administrador? */
export function useEsAdmin() {
  const { userId } = useSesion();
  const query = useQuery({
    queryKey: ["rol-admin", userId],
    enabled: !!userId,
    queryFn: async (): Promise<boolean> => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId!);
      if (error) throw error;
      return (data ?? []).some((r) => r.role === "admin");
    },
  });
  return { esAdmin: query.data === true, cargando: query.isLoading };
}

export type UsuarioAdmin = PerfilUsuario & { aprobado: boolean; esAdmin: boolean };

export function useUsuarios(habilitado: boolean) {
  return useQuery({
    queryKey: ["usuarios"],
    enabled: habilitado,
    queryFn: async (): Promise<UsuarioAdmin[]> => {
      const [{ data: usuarios, error }, { data: roles, error: errorRoles }] = await Promise.all([
        supabase.from("usuarios").select("*").order("nombre"),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      if (error) throw error;
      if (errorRoles) throw errorRoles;
      const admins = new Set((roles ?? []).filter((r) => r.role === "admin").map((r) => r.user_id));
      return (usuarios ?? []).map((u) => ({
        ...(u as unknown as PerfilUsuario & { aprobado: boolean }),
        esAdmin: admins.has(u.id),
      }));
    },
  });
}


export function useProductos() {
  return useQuery({
    queryKey: ["productos"],
    queryFn: async (): Promise<Producto[]> => {
      const { data, error } = await supabase.from("productos").select("*").order("nombre");
      if (error) throw error;
      return (data ?? []) as Producto[];
    },
  });
}

export function useBebidas() {
  return useQuery({
    queryKey: ["bebidas"],
    queryFn: async (): Promise<Bebida[]> => {
      const { data, error } = await supabase.from("bebidas").select("*").order("nombre");
      if (error) throw error;
      return (data ?? []) as Bebida[];
    },
  });
}

export function useInsumos() {
  return useQuery({
    queryKey: ["materia_prima"],
    queryFn: async (): Promise<Insumo[]> => {
      const { data, error } = await supabase.from("materia_prima").select("*").order("codigo");
      if (error) throw error;
      return (data ?? []) as Insumo[];
    },
  });
}

export function usePedidos() {
  return useQuery({
    queryKey: ["pedidos"],
    queryFn: async (): Promise<Pedido[]> => {
      const { data, error } = await supabase
        .from("pedidos")
        .select("*")
        .order("fecha_creacion", { ascending: false })
        .limit(300);
      if (error) throw error;
      return (data ?? []) as unknown as Pedido[];
    },
  });
}

/** Imprime en la impresora Bluetooth si está conectada; si no, abre el diálogo del navegador. */
export function imprimirTicket(texto: string) {
  return imprimirTexto(texto);
}
