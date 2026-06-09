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
          country: string | null
          created_at: string | null
          display_name: string
          email: string | null
          employee_number: string | null
          employee_position: string | null
          employee_status: string | null
          employee_status_enum: string | null
          external_hr_id: string | null
          external_hr_uuid: string | null
          first_name: string
          has_rehire_offboard: boolean | null
          id: string
          is_payroll_connected: boolean | null
          is_peo_employee: boolean | null
          last_name: string
          manager_external_id: string | null
          manager_id: string | null
          manager_name: string | null
          preboarding_access: boolean | null
          preferred_name: string | null
          role_type_id: string
          start_date: string | null
          system_access_date: string | null
          team_ids: string | null
          terminated: boolean | null
          terminated_date: string | null
          updated_at: string | null
          work_location_id: string | null
          worker_type: string | null
        }
        Insert: {
          country?: string | null
          created_at?: string | null
          display_name: string
          email?: string | null
          employee_number?: string | null
          employee_position?: string | null
          employee_status?: string | null
          employee_status_enum?: string | null
          external_hr_id?: string | null
          external_hr_uuid?: string | null
          first_name: string
          has_rehire_offboard?: boolean | null
          id?: string
          is_payroll_connected?: boolean | null
          is_peo_employee?: boolean | null
          last_name: string
          manager_external_id?: string | null
          manager_id?: string | null
          manager_name?: string | null
          preboarding_access?: boolean | null
          preferred_name?: string | null
          role_type_id: string
          start_date?: string | null
          system_access_date?: string | null
          team_ids?: string | null
          terminated?: boolean | null
          terminated_date?: string | null
          updated_at?: string | null
          work_location_id?: string | null
          worker_type?: string | null
        }
        Update: {
          country?: string | null
          created_at?: string | null
          display_name?: string
          email?: string | null
          employee_number?: string | null
          employee_position?: string | null
          employee_status?: string | null
          employee_status_enum?: string | null
          external_hr_id?: string | null
          external_hr_uuid?: string | null
          first_name?: string
          has_rehire_offboard?: boolean | null
          id?: string
          is_payroll_connected?: boolean | null
          is_peo_employee?: boolean | null
          last_name?: string
          manager_external_id?: string | null
          manager_id?: string | null
          manager_name?: string | null
          preboarding_access?: boolean | null
          preferred_name?: string | null
          role_type_id?: string
          start_date?: string | null
          system_access_date?: string | null
          team_ids?: string | null
          terminated?: boolean | null
          terminated_date?: string | null
          updated_at?: string | null
          work_location_id?: string | null
          worker_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "people_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "people_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "people_with_roles"
            referencedColumns: ["id"]
          },
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
          ignored: boolean | null
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
          ignored?: boolean | null
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
          ignored?: boolean | null
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
            foreignKeyName: "project_resource_requirements_parent_requirement_id_fkey"
            columns: ["parent_requirement_id"]
            isOneToOne: false
            referencedRelation: "project_requirements_detailed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_resource_requirements_parent_requirement_id_fkey"
            columns: ["parent_requirement_id"]
            isOneToOne: false
            referencedRelation: "project_resource_requirements"
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
      roles: {
        Row: {
          id: string
          name: string
        }
        Insert: {
          id?: string
          name: string
        }
        Update: {
          id?: string
          name?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role_id: string
          user_id: string
        }
        Insert: {
          id?: string
          role_id: string
          user_id: string
        }
        Update: {
          id?: string
          role_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
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
          country: string | null
          created_at: string | null
          display_name: string | null
          email: string | null
          employee_number: string | null
          employee_position: string | null
          employee_status: string | null
          external_hr_id: string | null
          first_name: string | null
          id: string | null
          last_name: string | null
          manager_id: string | null
          manager_name: string | null
          preferred_name: string | null
          role_type_description: string | null
          role_type_id: string | null
          role_type_name: string | null
          start_date: string | null
          terminated: boolean | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "people_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "people_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "people_with_roles"
            referencedColumns: ["id"]
          },
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
          ignored: boolean | null
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
            foreignKeyName: "project_resource_requirements_parent_requirement_id_fkey"
            columns: ["parent_requirement_id"]
            isOneToOne: false
            referencedRelation: "project_requirements_detailed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_resource_requirements_parent_requirement_id_fkey"
            columns: ["parent_requirement_id"]
            isOneToOne: false
            referencedRelation: "project_resource_requirements"
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
      insert_sample_data: { Args: never; Returns: undefined }
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

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
      auto_generated_type: ["leave_coverage", "partial_gap"],
      leave_status: ["pending", "approved", "unapproved"],
    },
  },
} as const
