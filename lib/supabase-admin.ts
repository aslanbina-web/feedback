import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config } from "@/lib/config";
import type { Database } from "@/lib/database.types";

let client: SupabaseClient<Database> | null = null;

export function getSupabaseAdmin() {
  if (!client) {
    client = createClient<Database>(config.supabaseUrl, config.supabaseServiceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return client;
}
