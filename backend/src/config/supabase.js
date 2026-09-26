import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

const rawUrl = process.env.SUPABASE_URL;
const supabaseUrl = rawUrl ? rawUrl.replace(/\/rest\/v1\/?$/, "") : null;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

/**
 * Factory helper to get or initialize the Supabase admin client.
 * Returns null if Supabase environment variables are missing.
 */
export function getSupabaseClient() {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return null;
  }
  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false },
  });
}

/**
 * Singleton Supabase admin client instance using service role credentials.
 * Evaluates to null when environment variables are omitted.
 */
export const supabase = (supabaseUrl && supabaseServiceRoleKey)
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false },
    })
  : null;