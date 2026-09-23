/**
 * Lightweight Database typing for Supabase clients.
 * After linking a live project, regenerate with `supabase gen types typescript`.
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          salary_day: number;
          currency: string;
          timezone: string;
          onboarding_completed_at: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          salary_day?: number;
          currency?: string;
          timezone?: string;
          onboarding_completed_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
      Relationships: [];
      };
      accounts: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          type: "checking" | "savings" | "other";
          is_active: boolean;
          sort_order: number;
          last_confirmed_balance_cents: number;
          last_confirmed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          type: "checking" | "savings" | "other";
          is_active?: boolean;
          sort_order?: number;
          last_confirmed_balance_cents?: number;
          last_confirmed_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["accounts"]["Insert"]>;
      Relationships: [];
      };
      salary_periods: {
        Row: {
          id: string;
          user_id: string;
          starts_on: string;
          ends_on: string;
          status: "open" | "closed";
          expected_available_cents: number;
          actual_available_cents: number | null;
          carry_over_cents: number;
          balance_confirmed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          starts_on: string;
          ends_on: string;
          status?: "open" | "closed";
          expected_available_cents?: number;
          actual_available_cents?: number | null;
          carry_over_cents?: number;
          balance_confirmed_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["salary_periods"]["Insert"]>;
      Relationships: [];
      };
      period_account_balances: {
        Row: {
          id: string;
          period_id: string;
          account_id: string;
          user_id: string;
          expected_cents: number;
          actual_cents: number | null;
          carry_over_cents: number;
        };
        Insert: {
          id?: string;
          period_id: string;
          account_id: string;
          user_id: string;
          expected_cents?: number;
          actual_cents?: number | null;
          carry_over_cents?: number;
        };
        Update: Partial<
          Database["public"]["Tables"]["period_account_balances"]["Insert"]
        >;
      Relationships: [];
      };
      income_rules: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          amount_cents: number;
          recurrence: "monthly" | "yearly" | "once";
          day_of_month: number | null;
          month_of_year: number | null;
          account_id: string | null;
          is_active: boolean;
          starts_on: string | null;
          ends_on: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          amount_cents: number;
          recurrence: "monthly" | "yearly" | "once";
          day_of_month?: number | null;
          month_of_year?: number | null;
          account_id?: string | null;
          is_active?: boolean;
          starts_on?: string | null;
          ends_on?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["income_rules"]["Insert"]>;
      Relationships: [];
      };
      fixed_expense_rules: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          amount_cents: number;
          category: string | null;
          recurrence: "monthly" | "yearly" | "once";
          day_of_month: number | null;
          month_of_year: number | null;
          account_id: string | null;
          is_active: boolean;
          starts_on: string | null;
          ends_on: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          amount_cents: number;
          category?: string | null;
          recurrence: "monthly" | "yearly" | "once";
          day_of_month?: number | null;
          month_of_year?: number | null;
          account_id?: string | null;
          is_active?: boolean;
          starts_on?: string | null;
          ends_on?: string | null;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["fixed_expense_rules"]["Insert"]
        >;
      Relationships: [];
      };
      budget_categories: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          default_amount_cents: number;
          is_active: boolean;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          default_amount_cents?: number;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["budget_categories"]["Insert"]
        >;
      Relationships: [];
      };
      period_budgets: {
        Row: {
          id: string;
          period_id: string;
          category_id: string;
          user_id: string;
          allocated_cents: number;
        };
        Insert: {
          id?: string;
          period_id: string;
          category_id: string;
          user_id: string;
          allocated_cents?: number;
        };
        Update: Partial<Database["public"]["Tables"]["period_budgets"]["Insert"]>;
      Relationships: [];
      };
      obligations: {
        Row: {
          id: string;
          user_id: string;
          period_id: string | null;
          kind: string;
          name: string;
          amount_cents: number;
          remaining_open_cents: number;
          status: string;
          due_on: string;
          account_id: string | null;
          budget_category_id: string | null;
          source_type: string | null;
          source_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          period_id?: string | null;
          kind: string;
          name: string;
          amount_cents: number;
          remaining_open_cents: number;
          status?: string;
          due_on: string;
          account_id?: string | null;
          budget_category_id?: string | null;
          source_type?: string | null;
          source_id?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["obligations"]["Insert"]>;
      Relationships: [];
      };
      ledger_events: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          name: string;
          amount_cents: number;
          occurred_on: string;
          account_id: string | null;
          obligation_id: string | null;
          budget_category_id: string | null;
          period_id: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: string;
          name: string;
          amount_cents: number;
          occurred_on: string;
          account_id?: string | null;
          obligation_id?: string | null;
          budget_category_id?: string | null;
          period_id?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["ledger_events"]["Insert"]>;
      Relationships: [];
      };
      savings_goals: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          current_amount_cents: number;
          target_amount_cents: number | null;
          scheduled_amount_cents: number;
          contribution_day: number | null;
          recurrence: string;
          linked_account_id: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          current_amount_cents?: number;
          target_amount_cents?: number | null;
          scheduled_amount_cents?: number;
          contribution_day?: number | null;
          recurrence?: string;
          linked_account_id?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["savings_goals"]["Insert"]>;
      Relationships: [];
      };
      debts: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          outstanding_cents: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          outstanding_cents?: number;
          is_active?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["debts"]["Insert"]>;
      Relationships: [];
      };
      debt_payment_rules: {
        Row: {
          id: string;
          user_id: string;
          debt_id: string;
          amount_cents: number;
          day_of_month: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          debt_id: string;
          amount_cents: number;
          day_of_month: number;
          is_active?: boolean;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["debt_payment_rules"]["Insert"]
        >;
      Relationships: [];
      };
      klarna_purchases: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          total_cents: number;
          purchased_on: string;
          plan: "pay_in_30" | "pay_in_3" | "custom";
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          total_cents: number;
          purchased_on: string;
          plan: "pay_in_30" | "pay_in_3" | "custom";
          status?: string;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["klarna_purchases"]["Insert"]
        >;
      Relationships: [];
      };
      klarna_installments: {
        Row: {
          id: string;
          user_id: string;
          purchase_id: string;
          sequence: number;
          due_on: string;
          amount_cents: number;
          obligation_id: string | null;
          status: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          purchase_id: string;
          sequence: number;
          due_on: string;
          amount_cents: number;
          obligation_id?: string | null;
          status?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["klarna_installments"]["Insert"]
        >;
      Relationships: [];
      };
      push_subscriptions: {
        Row: {
          id: string;
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          user_agent: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          user_agent?: string | null;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["push_subscriptions"]["Insert"]
        >;
      Relationships: [];
      };
      notification_preferences: {
        Row: {
          user_id: string;
          period_started: boolean;
          confirm_balance: boolean;
          large_upcoming_payment: boolean;
          klarna_due_soon: boolean;
          free_spendable_negative: boolean;
          budget_exceeded: boolean;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          period_started?: boolean;
          confirm_balance?: boolean;
          large_upcoming_payment?: boolean;
          klarna_due_soon?: boolean;
          free_spendable_negative?: boolean;
          budget_exceeded?: boolean;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["notification_preferences"]["Insert"]
        >;
      Relationships: [];
      };
      notification_log: {
        Row: {
          id: string;
          user_id: string;
          event_type: string;
          dedupe_key: string;
          payload: Json | null;
          sent_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          event_type: string;
          dedupe_key: string;
          payload?: Json | null;
          sent_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["notification_log"]["Insert"]
        >;
      Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
      CompositeTypes: Record<string, never>;
    };
}
