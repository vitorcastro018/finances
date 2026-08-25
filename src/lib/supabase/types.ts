// Escrito à mão a partir do schema em `supabase/migrations/` (sem projeto
// Supabase vivo neste ambiente para gerar via
// `mcp__Supabase__generate_typescript_types`). Depois de aplicar as
// migrations num projeto real, regerar e não editar as seções
// `Database`/`Constants` à mão.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      categorias: {
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
      contas_fixas: {
        Row: {
          ativa: boolean;
          categoria_id: string;
          created_at: string;
          dia_vencimento: number;
          id: string;
          nome: string;
          updated_at: string;
          user_id: string;
          valor_previsto: number | null;
        };
        Insert: {
          ativa?: boolean;
          categoria_id: string;
          created_at?: string;
          dia_vencimento: number;
          id?: string;
          nome: string;
          updated_at?: string;
          user_id?: string;
          valor_previsto?: number | null;
        };
        Update: {
          ativa?: boolean;
          categoria_id?: string;
          created_at?: string;
          dia_vencimento?: number;
          id?: string;
          nome?: string;
          updated_at?: string;
          user_id?: string;
          valor_previsto?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "contas_fixas_categoria_id_fkey";
            columns: ["categoria_id"];
            isOneToOne: false;
            referencedRelation: "categorias";
            referencedColumns: ["id"];
          },
        ];
      };
      lancamentos: {
        Row: {
          categoria_id: string;
          contas_fixa_id: string | null;
          created_at: string;
          data_pagamento: string | null;
          data_prevista: string;
          id: string;
          metodo: string | null;
          nome: string;
          origem: Database["public"]["Enums"]["origem_lancamento"];
          pago: boolean;
          tipo: Database["public"]["Enums"]["tipo_lancamento"];
          updated_at: string;
          user_id: string;
          valor_pago: number | null;
          valor_previsto: number;
        };
        Insert: {
          categoria_id: string;
          contas_fixa_id?: string | null;
          created_at?: string;
          data_pagamento?: string | null;
          data_prevista: string;
          id?: string;
          metodo?: string | null;
          nome: string;
          origem?: Database["public"]["Enums"]["origem_lancamento"];
          pago?: boolean;
          tipo: Database["public"]["Enums"]["tipo_lancamento"];
          updated_at?: string;
          user_id?: string;
          valor_pago?: number | null;
          valor_previsto: number;
        };
        Update: {
          categoria_id?: string;
          contas_fixa_id?: string | null;
          created_at?: string;
          data_pagamento?: string | null;
          data_prevista?: string;
          id?: string;
          metodo?: string | null;
          nome?: string;
          origem?: Database["public"]["Enums"]["origem_lancamento"];
          pago?: boolean;
          tipo?: Database["public"]["Enums"]["tipo_lancamento"];
          updated_at?: string;
          user_id?: string;
          valor_pago?: number | null;
          valor_previsto?: number;
        };
        Relationships: [
          {
            foreignKeyName: "lancamentos_categoria_id_fkey";
            columns: ["categoria_id"];
            isOneToOne: false;
            referencedRelation: "categorias";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lancamentos_contas_fixa_id_fkey";
            columns: ["contas_fixa_id"];
            isOneToOne: false;
            referencedRelation: "contas_fixas";
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
          categoria_cor: string;
          categoria_id: string;
          categoria_nome: string;
          contas_fixa_id: string | null;
          data_pagamento: string | null;
          data_prevista: string;
          id: string;
          metodo: string | null;
          nome: string;
          origem: Database["public"]["Enums"]["origem_lancamento"];
          pago: boolean;
          situacao: string;
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
      origem_lancamento: "web" | "recorrente";
      tipo_lancamento: "entrada" | "saida";
    };
    CompositeTypes: { [_ in never]: never };
  };
};

// Apelidos convenientes, usados no resto do app em vez de indexar
// `Database["public"]["Tables"][...]` toda vez.
export type CategoriaRow = Database["public"]["Tables"]["categorias"]["Row"];
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
