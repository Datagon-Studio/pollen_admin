import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabaseConfigError =
  !supabaseUrl || !supabaseAnonKey
    ? "Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Copy pollen_frontend/frontend/.env.local values into pollen_admin/.env.local, then restart npm run dev."
    : null;

/** Lazy client — only created when env is configured */
let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (supabaseConfigError) {
    throw new Error(supabaseConfigError);
  }
  if (!client) {
    client = createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    });
  }
  return client;
}

/** @deprecated use getSupabase() — kept for gradual migration */
export const supabase = supabaseConfigError
  ? (new Proxy({} as SupabaseClient, {
      get() {
        throw new Error(supabaseConfigError);
      },
    }) as SupabaseClient)
  : getSupabase();
