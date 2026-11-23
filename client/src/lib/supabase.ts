import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cachedClient: SupabaseClient | null = null;
let warnedMissing = false;

function resolveSupabaseConfig(): { url: string; key: string } | null {
  const url = (import.meta.env.VITE_SUPABASE_URL ?? "").trim();
  const key = (
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
    import.meta.env.VITE_SUPABASE_ANON_KEY ??
    ""
  ).trim();

  if (!url || !key) {
    return null;
  }
  return { url, key };
}

export function isSupabaseConfigured(): boolean {
  return resolveSupabaseConfig() !== null;
}

/**
 * Returns a shared Supabase client strictly configured for Realtime Broadcast
 * (no persistent Supabase Auth session so it never interferes with Etukas auth).
 * Returns null if VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY are not set.
 */
export function getSupabaseClient(): SupabaseClient | null {
  if (cachedClient) return cachedClient;

  const config = resolveSupabaseConfig();
  if (!config) {
    if (!warnedMissing && import.meta.env.DEV) {
      warnedMissing = true;
      console.info(
        "[Etukas Tracking] VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY not configured — using backend DB snapshot fallback."
      );
    }
    return null;
  }

  cachedClient = createClient(config.url, config.key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    },
    realtime: {
      params: {
        eventsPerSecond: 2
      }
    }
  });

  return cachedClient;
}
