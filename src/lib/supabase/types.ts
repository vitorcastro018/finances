// Gerado via `mcp__Supabase__generate_typescript_types` a partir do schema
// real do projeto (ver supabase/migrations). Regerar sempre que o schema
// mudar — nunca editar as seções `Database`/`Constants` à mão.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.15";
  };
  public: {
    Tables: {
      contas_fixas: {
        Row: {
          ativa: boolean;
          created_at: string;
          dia_vencimento: number;
          id: string;
          nome: string;
          subgrupo_id: string;
          updated_at: string;
          user_id: string;
          valor_previsto: number | null;
        };
        Insert: {
          ativa?: boolean;
          created_at?: string;
          dia_vencimento: number;
          id?: string;
          nome: string;
          subgrupo_id: string;
          updated_at?: string;
          user_id?: string;
          valor_previsto?: number | null;
        };
        Update: {
          ativa?: boolean;
          created_at?: string;
          dia_vencimento?: number;
          id?: string;
          nome?: string;
          subgrupo_id?: string;
          updated_at?: string;
          user_id?: string;
          valor_previsto?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "contas_fixas_subgrupo_id_fkey";
            columns: ["subgrupo_id"];
            isOneToOne: false;
            referencedRelation: "subgrupos";
            referencedColumns: ["id"];
          },
        ];
      };
      grupos: {
        Row: {
          cor: string;
          created_at: string;
          id: string;
          nome: string;
          tipo: Database["public"]["Enums"]["tipo_lancamento"];
          updated_at: string;
          user_id: string;
        };
        Insert: {
          cor?: string;
          created_at?: string;
          id?: string;
          nome: string;
          tipo: Database["public"]["Enums"]["tipo_lancamento"];
          updated_at?: string;
          user_id?: string;
        };
        Update: {
          cor?: string;
          created_at?: string;
          id?: string;
          nome?: string;
          tipo?: Database["public"]["Enums"]["tipo_lancamento"];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      lancamentos: {
        Row: {
          contas_fixa_id: string | null;
          created_at: string;
          data_pagamento: string | null;
          data_prevista: string;
          grupo_id: string;
          id: string;
          metodo: string | null;
          nome: string;
          origem: Database["public"]["Enums"]["origem_lancamento"];
          pago: boolean;
          subgrupo_id: string | null;
          tipo: Database["public"]["Enums"]["tipo_lancamento"];
          updated_at: string;
          user_id: string;
          valor_pago: number | null;
          valor_previsto: number;
        };
        Insert: {
          contas_fixa_id?: string | null;
          created_at?: string;
          data_pagamento?: string | null;
          data_prevista: string;
          grupo_id: string;
          id?: string;
          metodo?: string | null;
          nome: string;
          origem?: Database["public"]["Enums"]["origem_lancamento"];
          pago?: boolean;
          subgrupo_id?: string | null;
          tipo: Database["public"]["Enums"]["tipo_lancamento"];
          updated_at?: string;
          user_id?: string;
          valor_pago?: number | null;
          valor_previsto: number;
        };
        Update: {
          contas_fixa_id?: string | null;
          created_at?: string;
          data_pagamento?: string | null;
          data_prevista?: string;
          grupo_id?: string;
          id?: string;
          metodo?: string | null;
          nome?: string;
          origem?: Database["public"]["Enums"]["origem_lancamento"];
          pago?: boolean;
          subgrupo_id?: string | null;
          tipo?: Database["public"]["Enums"]["tipo_lancamento"];
          updated_at?: string;
          user_id?: string;
          valor_pago?: number | null;
          valor_previsto?: number;
        };
        Relationships: [
          {
            foreignKeyName: "lancamentos_contas_fixa_id_fkey";
            columns: ["contas_fixa_id"];
            isOneToOne: false;
            referencedRelation: "contas_fixas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lancamentos_grupo_id_fkey";
            columns: ["grupo_id"];
            isOneToOne: false;
            referencedRelation: "grupos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lancamentos_subgrupo_id_fkey";
            columns: ["subgrupo_id"];
            isOneToOne: false;
            referencedRelation: "subgrupos";
            referencedColumns: ["id"];
          },
        ];
      };
      subgrupos: {
        Row: {
          created_at: string;
          grupo_id: string;
          id: string;
          nome: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          grupo_id: string;
          id?: string;
          nome: string;
          updated_at?: string;
          user_id?: string;
        };
        Update: {
          created_at?: string;
          grupo_id?: string;
          id?: string;
          nome?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "subgrupos_grupo_id_fkey";
            columns: ["grupo_id"];
            isOneToOne: false;
            referencedRelation: "grupos";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      contas_do_mes: {
        Args: { referencia: string };
        Returns: {
          contas_fixa_id: string | null;
          data_pagamento: string | null;
          data_prevista: string;
          grupo_cor: string;
          grupo_id: string;
          grupo_nome: string;
          id: string;
          metodo: string | null;
          nome: string;
          origem: Database["public"]["Enums"]["origem_lancamento"];
          pago: boolean;
          situacao: string;
          subgrupo_id: string | null;
          subgrupo_nome: string | null;
          tipo: Database["public"]["Enums"]["tipo_lancamento"];
          valor_pago: number | null;
          valor_previsto: number;
        }[];
      };
      gerar_previstos_do_mes: {
        Args: { referencia: string };
        Returns: Database["public"]["Tables"]["lancamentos"]["Row"][];
      };
      mes_referencia: { Args: { d: string }; Returns: string };
    };
    Enums: {
      origem_lancamento: "telegram" | "web" | "recorrente";
      tipo_lancamento: "entrada" | "saida";
    };
    CompositeTypes: { [_ in never]: never };
  };
};

// Apelidos convenientes, usados no resto do app em vez de indexar
// `Database["public"]["Tables"][...]` toda vez.
export type GrupoRow = Database["public"]["Tables"]["grupos"]["Row"];
export type SubgrupoRow = Database["public"]["Tables"]["subgrupos"]["Row"];
export type ContaFixaRow = Database["public"]["Tables"]["contas_fixas"]["Row"];
export type LancamentoRow = Database["public"]["Tables"]["lancamentos"]["Row"];
export type TipoLancamento = Database["public"]["Enums"]["tipo_lancamento"];
export type OrigemLancamento = Database["public"]["Enums"]["origem_lancamento"];

/** A função devolve `text`; o banco só garante um destes três valores. */
export type Situacao = "pago" | "a_vencer" | "atrasado";

export type ContaDoMesRow = Omit<
  Database["public"]["Functions"]["contas_do_mes"]["Returns"][number],
  "situacao"
> & { situacao: Situacao };
