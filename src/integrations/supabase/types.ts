export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      auditoria: {
        Row: {
          action: string
          audit_id: string
          created_at: string
          description: string
          entity_id: string | null
          entity_type: string
          module: string
          new_values: Json | null
          old_values: Json | null
          operation_id: string
          reason: string | null
          status: string
          user_id: string | null
          user_name: string
          user_role: string
        }
        Insert: {
          action: string
          audit_id?: string
          created_at?: string
          description?: string
          entity_id?: string | null
          entity_type: string
          module: string
          new_values?: Json | null
          old_values?: Json | null
          operation_id: string
          reason?: string | null
          status?: string
          user_id?: string | null
          user_name?: string
          user_role?: string
        }
        Update: {
          action?: string
          audit_id?: string
          created_at?: string
          description?: string
          entity_id?: string | null
          entity_type?: string
          module?: string
          new_values?: Json | null
          old_values?: Json | null
          operation_id?: string
          reason?: string | null
          status?: string
          user_id?: string | null
          user_name?: string
          user_role?: string
        }
        Relationships: []
      }
      bebida_insumos: {
        Row: {
          bebida_id: string
          cantidad_por_unidad: number
          created_at: string
          id: string
          materia_prima_id: string
          updated_at: string
        }
        Insert: {
          bebida_id: string
          cantidad_por_unidad?: number
          created_at?: string
          id?: string
          materia_prima_id: string
          updated_at?: string
        }
        Update: {
          bebida_id?: string
          cantidad_por_unidad?: number
          created_at?: string
          id?: string
          materia_prima_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bebida_insumos_bebida_id_fkey"
            columns: ["bebida_id"]
            isOneToOne: false
            referencedRelation: "bebidas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bebida_insumos_materia_prima_id_fkey"
            columns: ["materia_prima_id"]
            isOneToOne: false
            referencedRelation: "materia_prima"
            referencedColumns: ["id"]
          },
        ]
      }
      bebidas: {
        Row: {
          categoria_id: string | null
          created_at: string
          disponible: boolean
          id: string
          nombre: string
          precio: number
          tamano: string
          tipo: string
        }
        Insert: {
          categoria_id?: string | null
          created_at?: string
          disponible?: boolean
          id?: string
          nombre: string
          precio?: number
          tamano?: string
          tipo?: string
        }
        Update: {
          categoria_id?: string | null
          created_at?: string
          disponible?: boolean
          id?: string
          nombre?: string
          precio?: number
          tamano?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "bebidas_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
        ]
      }
      categorias: {
        Row: {
          activo: boolean
          created_at: string
          descripcion: string | null
          id: string
          nombre: string
          orden: number
          tipo: string
        }
        Insert: {
          activo?: boolean
          created_at?: string
          descripcion?: string | null
          id?: string
          nombre: string
          orden?: number
          tipo: string
        }
        Update: {
          activo?: boolean
          created_at?: string
          descripcion?: string | null
          id?: string
          nombre?: string
          orden?: number
          tipo?: string
        }
        Relationships: []
      }
      materia_prima: {
        Row: {
          categoria: string
          categoria_id: string | null
          codigo: string
          created_at: string
          fecha_vencimiento: string | null
          id: string
          nombre: string
          stock_actual: number
          stock_minimo: number
          unidad: string
        }
        Insert: {
          categoria?: string
          categoria_id?: string | null
          codigo: string
          created_at?: string
          fecha_vencimiento?: string | null
          id?: string
          nombre: string
          stock_actual?: number
          stock_minimo?: number
          unidad?: string
        }
        Update: {
          categoria?: string
          categoria_id?: string | null
          codigo?: string
          created_at?: string
          fecha_vencimiento?: string | null
          id?: string
          nombre?: string
          stock_actual?: number
          stock_minimo?: number
          unidad?: string
        }
        Relationships: [
          {
            foreignKeyName: "materia_prima_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
        ]
      }
      pedido_items: {
        Row: {
          bebida_id: string | null
          cantidad: number
          created_at: string
          id: string
          linea: number
          nombre: string
          pedido_id: string
          precio_unitario: number
          producto_id: string | null
          tipo: string
        }
        Insert: {
          bebida_id?: string | null
          cantidad?: number
          created_at?: string
          id?: string
          linea?: number
          nombre: string
          pedido_id: string
          precio_unitario?: number
          producto_id?: string | null
          tipo: string
        }
        Update: {
          bebida_id?: string | null
          cantidad?: number
          created_at?: string
          id?: string
          linea?: number
          nombre?: string
          pedido_id?: string
          precio_unitario?: number
          producto_id?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "pedido_items_bebida_id_fkey"
            columns: ["bebida_id"]
            isOneToOne: false
            referencedRelation: "bebidas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedido_items_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedido_items_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
        ]
      }
      pedidos: {
        Row: {
          cajera_uid: string | null
          estado: string
          fecha_creacion: string
          fecha_pago: string | null
          id: string
          items: Json
          iva: number
          mesa: string | null
          numero_ticket: string
          subtotal: number
          tipo: string
          total: number
        }
        Insert: {
          cajera_uid?: string | null
          estado?: string
          fecha_creacion?: string
          fecha_pago?: string | null
          id?: string
          items?: Json
          iva?: number
          mesa?: string | null
          numero_ticket: string
          subtotal?: number
          tipo?: string
          total?: number
        }
        Update: {
          cajera_uid?: string | null
          estado?: string
          fecha_creacion?: string
          fecha_pago?: string | null
          id?: string
          items?: Json
          iva?: number
          mesa?: string | null
          numero_ticket?: string
          subtotal?: number
          tipo?: string
          total?: number
        }
        Relationships: []
      }
      producto_insumos: {
        Row: {
          cantidad_por_unidad: number
          created_at: string
          id: string
          materia_prima_id: string
          producto_id: string
          updated_at: string
        }
        Insert: {
          cantidad_por_unidad?: number
          created_at?: string
          id?: string
          materia_prima_id: string
          producto_id: string
          updated_at?: string
        }
        Update: {
          cantidad_por_unidad?: number
          created_at?: string
          id?: string
          materia_prima_id?: string
          producto_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "producto_insumos_materia_prima_id_fkey"
            columns: ["materia_prima_id"]
            isOneToOne: false
            referencedRelation: "materia_prima"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "producto_insumos_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
        ]
      }
      productos: {
        Row: {
          categoria: string
          categoria_id: string | null
          created_at: string
          descripcion: string
          disponible: boolean
          id: string
          imagen_url: string | null
          nombre: string
          precio: number
        }
        Insert: {
          categoria?: string
          categoria_id?: string | null
          created_at?: string
          descripcion?: string
          disponible?: boolean
          id?: string
          imagen_url?: string | null
          nombre: string
          precio?: number
        }
        Update: {
          categoria?: string
          categoria_id?: string | null
          created_at?: string
          descripcion?: string
          disponible?: boolean
          id?: string
          imagen_url?: string | null
          nombre?: string
          precio?: number
        }
        Relationships: [
          {
            foreignKeyName: "productos_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      usuarios: {
        Row: {
          aprobado: boolean
          correo: string
          created_at: string
          foto_url: string | null
          id: string
          nombre: string
          rol: string
          turno: string
        }
        Insert: {
          aprobado?: boolean
          correo?: string
          created_at?: string
          foto_url?: string | null
          id: string
          nombre?: string
          rol?: string
          turno?: string
        }
        Update: {
          aprobado?: boolean
          correo?: string
          created_at?: string
          foto_url?: string | null
          id?: string
          nombre?: string
          rol?: string
          turno?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      auditoria_identidad: {
        Args: never
        Returns: {
          nombre: string
          rol: string
          uid: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      log_audit: {
        Args: {
          _action: string
          _description?: string
          _entity_id: string
          _entity_type: string
          _module: string
          _new?: Json
          _old?: Json
          _reason?: string
          _status?: string
        }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "cajera"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "cajera"],
    },
  },
} as const
