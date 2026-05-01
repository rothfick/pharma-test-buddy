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
      agent_runs: {
        Row: {
          created_at: string
          duration_ms: number | null
          error: string | null
          goal: string
          id: string
          result: Json | null
          status: string
          total_cost_usd: number
          total_tokens: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          duration_ms?: number | null
          error?: string | null
          goal: string
          id?: string
          result?: Json | null
          status?: string
          total_cost_usd?: number
          total_tokens?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          duration_ms?: number | null
          error?: string | null
          goal?: string
          id?: string
          result?: Json | null
          status?: string
          total_cost_usd?: number
          total_tokens?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      agent_steps: {
        Row: {
          agent_role: string
          created_at: string
          duration_ms: number | null
          id: string
          input: Json | null
          output: Json | null
          reasoning: string | null
          run_id: string
          step_index: number
          tokens: number | null
          tool_name: string | null
        }
        Insert: {
          agent_role: string
          created_at?: string
          duration_ms?: number | null
          id?: string
          input?: Json | null
          output?: Json | null
          reasoning?: string | null
          run_id: string
          step_index: number
          tokens?: number | null
          tool_name?: string | null
        }
        Update: {
          agent_role?: string
          created_at?: string
          duration_ms?: number | null
          id?: string
          input?: Json | null
          output?: Json | null
          reasoning?: string | null
          run_id?: string
          step_index?: number
          tokens?: number | null
          tool_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_steps_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "agent_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          created_at: string
          current_hash: string
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
          new_data: Json | null
          old_data: Json | null
          prev_hash: string | null
          reason: string | null
          user_agent: string | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          current_hash: string
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          prev_hash?: string | null
          reason?: string | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          current_hash?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          prev_hash?: string | null
          reason?: string | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      chaos_experiments: {
        Row: {
          abort_condition: string | null
          blast_radius: string
          conclusion: string | null
          created_at: string
          duration_ms: number | null
          experiment_type: string
          finished_at: string | null
          hypothesis: string | null
          id: string
          name: string
          observations: Json
          parameters: Json
          started_at: string | null
          status: string
          target: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          abort_condition?: string | null
          blast_radius?: string
          conclusion?: string | null
          created_at?: string
          duration_ms?: number | null
          experiment_type: string
          finished_at?: string | null
          hypothesis?: string | null
          id?: string
          name: string
          observations?: Json
          parameters?: Json
          started_at?: string | null
          status?: string
          target: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          abort_condition?: string | null
          blast_radius?: string
          conclusion?: string | null
          created_at?: string
          duration_ms?: number | null
          experiment_type?: string
          finished_at?: string | null
          hypothesis?: string | null
          id?: string
          name?: string
          observations?: Json
          parameters?: Json
          started_at?: string | null
          status?: string
          target?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      coverage_snapshots: {
        Row: {
          branch: string | null
          branch_coverage: number
          commit_sha: string | null
          covered_lines: number
          created_at: string
          function_coverage: number
          id: string
          line_coverage: number
          metadata: Json
          statement_coverage: number
          total_lines: number
        }
        Insert: {
          branch?: string | null
          branch_coverage?: number
          commit_sha?: string | null
          covered_lines?: number
          created_at?: string
          function_coverage?: number
          id?: string
          line_coverage?: number
          metadata?: Json
          statement_coverage?: number
          total_lines?: number
        }
        Update: {
          branch?: string | null
          branch_coverage?: number
          commit_sha?: string | null
          covered_lines?: number
          created_at?: string
          function_coverage?: number
          id?: string
          line_coverage?: number
          metadata?: Json
          statement_coverage?: number
          total_lines?: number
        }
        Relationships: []
      }
      dora_metrics: {
        Row: {
          change_failure_rate: number
          created_at: string
          deployment_count: number
          environment: string
          id: string
          lead_time_minutes: number
          metadata: Json
          metric_date: string
          mttr_minutes: number
          service: string
        }
        Insert: {
          change_failure_rate?: number
          created_at?: string
          deployment_count?: number
          environment?: string
          id?: string
          lead_time_minutes?: number
          metadata?: Json
          metric_date: string
          mttr_minutes?: number
          service?: string
        }
        Update: {
          change_failure_rate?: number
          created_at?: string
          deployment_count?: number
          environment?: string
          id?: string
          lead_time_minutes?: number
          metadata?: Json
          metric_date?: string
          mttr_minutes?: number
          service?: string
        }
        Relationships: []
      }
      e_signatures: {
        Row: {
          action: string
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          meaning: string
          reason: string
          signature_hash: string
          signed_by: string
          signed_by_email: string
          witness_email: string | null
          witness_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          meaning: string
          reason: string
          signature_hash: string
          signed_by: string
          signed_by_email: string
          witness_email?: string | null
          witness_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          meaning?: string
          reason?: string
          signature_hash?: string
          signed_by?: string
          signed_by_email?: string
          witness_email?: string | null
          witness_id?: string | null
        }
        Relationships: []
      }
      feature_budgets: {
        Row: {
          created_at: string
          daily_limit_usd: number
          enabled: boolean
          feature: string
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          daily_limit_usd?: number
          enabled?: boolean
          feature: string
          id?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          daily_limit_usd?: number
          enabled?: boolean
          feature?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      flaky_tests: {
        Row: {
          created_at: string
          failure_count: number
          id: string
          last_failed_at: string
          owner: string | null
          root_cause: string | null
          status: string
          suite_name: string
          test_name: string
          total_runs: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          failure_count?: number
          id?: string
          last_failed_at?: string
          owner?: string | null
          root_cause?: string | null
          status?: string
          suite_name: string
          test_name: string
          total_runs?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          failure_count?: number
          id?: string
          last_failed_at?: string
          owner?: string | null
          root_cause?: string | null
          status?: string
          suite_name?: string
          test_name?: string
          total_runs?: number
          updated_at?: string
        }
        Relationships: []
      }
      llm_traces: {
        Row: {
          cache_hit: boolean
          completion_tokens: number
          cost_usd: number
          created_at: string
          error: string | null
          feature: string
          id: string
          latency_ms: number
          metadata: Json
          model: string
          prompt_tokens: number
          request_preview: string | null
          response_preview: string | null
          status: string
          total_tokens: number | null
          user_id: string | null
        }
        Insert: {
          cache_hit?: boolean
          completion_tokens?: number
          cost_usd?: number
          created_at?: string
          error?: string | null
          feature: string
          id?: string
          latency_ms?: number
          metadata?: Json
          model: string
          prompt_tokens?: number
          request_preview?: string | null
          response_preview?: string | null
          status?: string
          total_tokens?: number | null
          user_id?: string | null
        }
        Update: {
          cache_hit?: boolean
          completion_tokens?: number
          cost_usd?: number
          created_at?: string
          error?: string | null
          feature?: string
          id?: string
          latency_ms?: number
          metadata?: Json
          model?: string
          prompt_tokens?: number
          request_preview?: string | null
          response_preview?: string | null
          status?: string
          total_tokens?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      perf_runs: {
        Row: {
          created_at: string
          duration_seconds: number
          error_rate: number
          failed_requests: number
          finished_at: string | null
          id: string
          load_profile: string
          max_ms: number
          min_ms: number
          p50_ms: number
          p95_ms: number
          p99_ms: number
          raw_samples: Json
          rps: number
          scenario_name: string
          slo_id: string | null
          slo_passed: boolean | null
          status: string
          successful_requests: number
          target_url: string
          total_requests: number
          user_id: string | null
          vus: number
        }
        Insert: {
          created_at?: string
          duration_seconds?: number
          error_rate?: number
          failed_requests?: number
          finished_at?: string | null
          id?: string
          load_profile: string
          max_ms?: number
          min_ms?: number
          p50_ms?: number
          p95_ms?: number
          p99_ms?: number
          raw_samples?: Json
          rps?: number
          scenario_name: string
          slo_id?: string | null
          slo_passed?: boolean | null
          status?: string
          successful_requests?: number
          target_url: string
          total_requests?: number
          user_id?: string | null
          vus?: number
        }
        Update: {
          created_at?: string
          duration_seconds?: number
          error_rate?: number
          failed_requests?: number
          finished_at?: string | null
          id?: string
          load_profile?: string
          max_ms?: number
          min_ms?: number
          p50_ms?: number
          p95_ms?: number
          p99_ms?: number
          raw_samples?: Json
          rps?: number
          scenario_name?: string
          slo_id?: string | null
          slo_passed?: boolean | null
          status?: string
          successful_requests?: number
          target_url?: string
          total_requests?: number
          user_id?: string | null
          vus?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      prompt_evals: {
        Row: {
          avg_latency_ms: number
          created_at: string
          dataset_name: string
          details: Json
          id: string
          model: string
          passed_cases: number
          prompt_id: string | null
          score: number
          total_cases: number
          total_cost_usd: number
        }
        Insert: {
          avg_latency_ms?: number
          created_at?: string
          dataset_name: string
          details?: Json
          id?: string
          model: string
          passed_cases?: number
          prompt_id?: string | null
          score: number
          total_cases?: number
          total_cost_usd?: number
        }
        Update: {
          avg_latency_ms?: number
          created_at?: string
          dataset_name?: string
          details?: Json
          id?: string
          model?: string
          passed_cases?: number
          prompt_id?: string | null
          score?: number
          total_cases?: number
          total_cost_usd?: number
        }
        Relationships: [
          {
            foreignKeyName: "prompt_evals_prompt_id_fkey"
            columns: ["prompt_id"]
            isOneToOne: false
            referencedRelation: "prompt_registry"
            referencedColumns: ["id"]
          },
        ]
      }
      prompt_registry: {
        Row: {
          content: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
          version: number
        }
        Insert: {
          content: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
          version: number
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      rag_chunks: {
        Row: {
          chunk_index: number
          content: string
          created_at: string
          document_id: string
          embedding: string | null
          id: string
        }
        Insert: {
          chunk_index: number
          content: string
          created_at?: string
          document_id: string
          embedding?: string | null
          id?: string
        }
        Update: {
          chunk_index?: number
          content?: string
          created_at?: string
          document_id?: string
          embedding?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rag_chunks_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "rag_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      rag_documents: {
        Row: {
          content: string
          created_at: string
          id: string
          metadata: Json
          source: string | null
          title: string
          user_id: string | null
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          metadata?: Json
          source?: string | null
          title: string
          user_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          metadata?: Json
          source?: string | null
          title?: string
          user_id?: string | null
        }
        Relationships: []
      }
      semantic_cache: {
        Row: {
          created_at: string
          expires_at: string
          feature: string
          hit_count: number
          id: string
          model: string
          prompt_embedding: string | null
          prompt_text: string
          response: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          feature: string
          hit_count?: number
          id?: string
          model: string
          prompt_embedding?: string | null
          prompt_text: string
          response: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          feature?: string
          hit_count?: number
          id?: string
          model?: string
          prompt_embedding?: string | null
          prompt_text?: string
          response?: string
        }
        Relationships: []
      }
      slo_definitions: {
        Row: {
          comparator: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          metric: string
          name: string
          service: string
          target_value: number
          updated_at: string
          window_days: number
        }
        Insert: {
          comparator?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          metric: string
          name: string
          service?: string
          target_value: number
          updated_at?: string
          window_days?: number
        }
        Update: {
          comparator?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          metric?: string
          name?: string
          service?: string
          target_value?: number
          updated_at?: string
          window_days?: number
        }
        Relationships: []
      }
      tasks: {
        Row: {
          assigned_to: string | null
          created_at: string
          created_by: string
          description: string | null
          due_date: string | null
          id: string
          priority: Database["public"]["Enums"]["task_priority"]
          status: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["task_priority"]
          status?: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["task_priority"]
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      test_runs: {
        Row: {
          branch: string | null
          ci_provider: string | null
          commit_sha: string | null
          created_at: string
          duration_ms: number
          failed: number
          flaky: number
          id: string
          metadata: Json
          passed: number
          pipeline_url: string | null
          run_type: string
          skipped: number
          status: string
          suite_name: string
          total: number
        }
        Insert: {
          branch?: string | null
          ci_provider?: string | null
          commit_sha?: string | null
          created_at?: string
          duration_ms?: number
          failed?: number
          flaky?: number
          id?: string
          metadata?: Json
          passed?: number
          pipeline_url?: string | null
          run_type: string
          skipped?: number
          status?: string
          suite_name: string
          total?: number
        }
        Update: {
          branch?: string | null
          ci_provider?: string | null
          commit_sha?: string | null
          created_at?: string
          duration_ms?: number
          failed?: number
          flaky?: number
          id?: string
          metadata?: Json
          passed?: number
          pipeline_url?: string | null
          run_type?: string
          skipped?: number
          status?: string
          suite_name?: string
          total?: number
        }
        Relationships: []
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
      validation_runs: {
        Row: {
          created_at: string
          description: string | null
          evidence: Json | null
          executed_at: string | null
          executed_by: string | null
          id: string
          name: string
          phase: Database["public"]["Enums"]["validation_phase"]
          status: Database["public"]["Enums"]["validation_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          evidence?: Json | null
          executed_at?: string | null
          executed_by?: string | null
          id?: string
          name: string
          phase: Database["public"]["Enums"]["validation_phase"]
          status?: Database["public"]["Enums"]["validation_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          evidence?: Json | null
          executed_at?: string | null
          executed_by?: string | null
          id?: string
          name?: string
          phase?: Database["public"]["Enums"]["validation_phase"]
          status?: Database["public"]["Enums"]["validation_status"]
          updated_at?: string
        }
        Relationships: []
      }
      workflow_runs: {
        Row: {
          created_at: string
          duration_ms: number | null
          error: string | null
          id: string
          input: Json
          output: Json | null
          status: string
          steps: Json
          total_cost_usd: number
          total_tokens: number
          updated_at: string
          user_id: string | null
          workflow_id: string
        }
        Insert: {
          created_at?: string
          duration_ms?: number | null
          error?: string | null
          id?: string
          input?: Json
          output?: Json | null
          status?: string
          steps?: Json
          total_cost_usd?: number
          total_tokens?: number
          updated_at?: string
          user_id?: string | null
          workflow_id: string
        }
        Update: {
          created_at?: string
          duration_ms?: number | null
          error?: string | null
          id?: string
          input?: Json
          output?: Json | null
          status?: string
          steps?: Json
          total_cost_usd?: number
          total_tokens?: number
          updated_at?: string
          user_id?: string | null
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_runs_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflows: {
        Row: {
          created_at: string
          description: string | null
          edges: Json
          id: string
          is_active: boolean
          name: string
          nodes: Json
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          edges?: Json
          id?: string
          is_active?: boolean
          name: string
          nodes?: Json
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          edges?: Json
          id?: string
          is_active?: boolean
          name?: string
          nodes?: Json
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      feature_spend_today: { Args: { _feature: string }; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      match_rag_chunks: {
        Args: {
          filter_doc_ids?: string[]
          match_count?: number
          query_embedding: string
        }
        Returns: {
          chunk_id: string
          content: string
          document_id: string
          similarity: number
        }[]
      }
      match_semantic_cache: {
        Args: {
          feature_filter: string
          query_embedding: string
          similarity_threshold?: number
        }
        Returns: {
          id: string
          response: string
          similarity: number
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "manager" | "user"
      task_priority: "low" | "medium" | "high" | "critical"
      task_status: "todo" | "in_progress" | "review" | "done"
      validation_phase: "IQ" | "OQ" | "PQ"
      validation_status: "pending" | "passed" | "failed" | "blocked"
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
      app_role: ["admin", "manager", "user"],
      task_priority: ["low", "medium", "high", "critical"],
      task_status: ["todo", "in_progress", "review", "done"],
      validation_phase: ["IQ", "OQ", "PQ"],
      validation_status: ["pending", "passed", "failed", "blocked"],
    },
  },
} as const
