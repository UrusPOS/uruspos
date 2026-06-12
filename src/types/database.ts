import type { UserRole } from "./auth";

export type KedaiType = "simple" | "standard" | "full";

export interface Kedai {
  id: string;
  nama: string;
  logo_url: string | null;
  tema_warna: string | null;
  status: string;
  kedai_type: KedaiType;
}

export interface AppUser {
  id: string;
  kedai_id: string | null;
  nama: string;
  username: string;
  role: UserRole;
  is_active: boolean;
  password: string | null;
}

export interface Database {
  public: {
    Tables: {
      kedai: {
        Row: Kedai;
        Insert: Omit<Kedai, "id"> & { id?: string };
        Update: Partial<Omit<Kedai, "id">>;
        Relationships: [];
      };
      users: {
        Row: AppUser;
        Insert: Omit<AppUser, "id"> & { id?: string };
        Update: Partial<Omit<AppUser, "id">>;
        Relationships: [
          {
            foreignKeyName: "users_kedai_id_fkey";
            columns: ["kedai_id"];
            isOneToOne: false;
            referencedRelation: "kedai";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}