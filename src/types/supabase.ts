export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          operationName?: string
          query?: string
          variables?: Json
          extensions?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      leave_periods: {
        Row: {
          created_at: string | null
          end_date: string
          id: string
          notes: string | null
          person_id: string
          start_date: string
          status: Database["public"]["Enums"]["leave_status"]
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          end_date: string
          id?: string
          notes?: string | null
          person_id: string
          start_date: string
          status?: Database["public"]["Enums"]["leave_status"]
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          end_date?: string
          id?: string
          notes?: string | null
          person_id?: string
          start_date?: string
          status?: Database["public"]["Enums"]["leave_status"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leave_periods_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_periods_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people_with_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      people: {
        Row: {
          created_at: string | null
          id: string
          name: string
          role_type_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          role_type_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          role_type_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "people_role_type_id_fkey"
            columns: ["role_type_id"]
            isOneToOne: false
            referencedRelation: "role_types"
            referencedColumns: ["id"]
          },
        ]
      }
      project_allocations: {
        Row: {
          allocation_percentage: number
          created_at: string | null
          end_date: string
          id: string
          person_id: string
          project_id: string
          requirement_id: string | null
          role_type_id: string
          start_date: string
          updated_at: string | null
        }
        Insert: {
          allocation_percentage: number
          created_at?: string | null
          end_date: string
          id?: string
          person_id: string
          project_id: string
          requirement_id?: string | null
          role_type_id: string
          start_date: string
          updated_at?: string | null
        }
        Update: {
          allocation_percentage?: number
          created_at?: string | null
          end_date?: string
          id?: string
          person_id?: string
          project_id?: string
          requirement_id?: string | null
          role_type_id?: string
          start_date?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_allocations_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_allocations_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people_with_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_allocations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_allocations_requirement_id_fkey"
            columns: ["requirement_id"]
            isOneToOne: false
            referencedRelation: "project_requirements_detailed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_allocations_requirement_id_fkey"
            columns: ["requirement_id"]
            isOneToOne: false
            referencedRelation: "project_resource_requirements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_allocations_role_type_id_fkey"
            columns: ["role_type_id"]
            isOneToOne: false
            referencedRelation: "role_types"
            referencedColumns: ["id"]
          },
        ]
      }
      project_resource_requirements: {
        Row: {
          auto_generated_type:
            | Database["public"]["Enums"]["auto_generated_type"]
            | null
          created_at: string | null
          end_date: string
          id: string
          parent_requirement_id: string | null
          project_id: string
          required_count: number
          role_type_id: string
          source_allocation_id: string | null
          start_date: string
          updated_at: string | null
        }
        Insert: {
          auto_generated_type?:
            | Database["public"]["Enums"]["auto_generated_type"]
            | null
          created_at?: string | null
          end_date: string
          id?: string
          parent_requirement_id?: string | null
          project_id: string
          required_count: number
          role_type_id: string
          source_allocation_id?: string | null
          start_date: string
          updated_at?: string | null
        }
        Update: {
          auto_generated_type?:
            | Database["public"]["Enums"]["auto_generated_type"]
            | null
          created_at?: string | null
          end_date?: string
          id?: string
          parent_requirement_id?: string | null
          project_id?: string
          required_count?: number
          role_type_id?: string
          source_allocation_id?: string | null
          start_date?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_parent_requirement"
            columns: ["parent_requirement_id"]
            isOneToOne: false
            referencedRelation: "project_requirements_detailed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_parent_requirement"
            columns: ["parent_requirement_id"]
            isOneToOne: false
            referencedRelation: "project_resource_requirements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_source_allocation"
            columns: ["source_allocation_id"]
            isOneToOne: false
            referencedRelation: "project_allocations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_source_allocation"
            columns: ["source_allocation_id"]
            isOneToOne: false
            referencedRelation: "project_allocations_detailed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_resource_requirements_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_resource_requirements_role_type_id_fkey"
            columns: ["role_type_id"]
            isOneToOne: false
            referencedRelation: "role_types"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          created_at: string | null
          end_date: string
          id: string
          name: string
          start_date: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          end_date: string
          id?: string
          name: string
          start_date: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          end_date?: string
          id?: string
          name?: string
          start_date?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      role_types: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      users: {
        Row: {
          created_at: string | null
          id: string
        }
        Insert: {
          created_at?: string | null
          id: string
        }
        Update: {
          created_at?: string | null
          id?: string
        }
        Relationships: []
      }
    }
    Views: {
      people_with_roles: {
        Row: {
          created_at: string | null
          id: string | null
          name: string | null
          role_type_description: string | null
          role_type_id: string | null
          role_type_name: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "people_role_type_id_fkey"
            columns: ["role_type_id"]
            isOneToOne: false
            referencedRelation: "role_types"
            referencedColumns: ["id"]
          },
        ]
      }
      project_allocations_detailed: {
        Row: {
          allocation_percentage: number | null
          created_at: string | null
          end_date: string | null
          id: string | null
          person_id: string | null
          person_name: string | null
          project_id: string | null
          project_name: string | null
          requirement_id: string | null
          role_type_id: string | null
          role_type_name: string | null
          start_date: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_allocations_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_allocations_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people_with_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_allocations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_allocations_requirement_id_fkey"
            columns: ["requirement_id"]
            isOneToOne: false
            referencedRelation: "project_requirements_detailed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_allocations_requirement_id_fkey"
            columns: ["requirement_id"]
            isOneToOne: false
            referencedRelation: "project_resource_requirements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_allocations_role_type_id_fkey"
            columns: ["role_type_id"]
            isOneToOne: false
            referencedRelation: "role_types"
            referencedColumns: ["id"]
          },
        ]
      }
      project_requirements_detailed: {
        Row: {
          auto_generated_type:
            | Database["public"]["Enums"]["auto_generated_type"]
            | null
          created_at: string | null
          end_date: string | null
          id: string | null
          parent_requirement_id: string | null
          project_id: string | null
          project_name: string | null
          required_count: number | null
          role_type_id: string | null
          role_type_name: string | null
          source_allocation_id: string | null
          start_date: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_parent_requirement"
            columns: ["parent_requirement_id"]
            isOneToOne: false
            referencedRelation: "project_requirements_detailed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_parent_requirement"
            columns: ["parent_requirement_id"]
            isOneToOne: false
            referencedRelation: "project_resource_requirements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_source_allocation"
            columns: ["source_allocation_id"]
            isOneToOne: false
            referencedRelation: "project_allocations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_source_allocation"
            columns: ["source_allocation_id"]
            isOneToOne: false
            referencedRelation: "project_allocations_detailed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_resource_requirements_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_resource_requirements_role_type_id_fkey"
            columns: ["role_type_id"]
            isOneToOne: false
            referencedRelation: "role_types"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      insert_sample_data: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
    }
    Enums: {
      auto_generated_type: "leave_coverage" | "partial_gap"
      leave_status: "pending" | "approved" | "unapproved"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      auto_generated_type: ["leave_coverage", "partial_gap"],
      leave_status: ["pending", "approved", "unapproved"],
    },
  },
} as const
