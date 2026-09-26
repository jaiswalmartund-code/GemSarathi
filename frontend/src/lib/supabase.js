// Optional Supabase Realtime for the live dashboard.
// Active only when VITE_SUPABASE_URL + VITE_SUPABASE_KEY are set (i.e. the
// backend runs in DB_MODE=supabase). Otherwise this module exports null and
// the UI keeps its normal load-on-open behaviour - nothing breaks.
import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_KEY;

export const supabase = url && key ? createClient(url, key) : null;
export const realtimeEnabled = Boolean(supabase);

export function isRealtimeEnabled() {
  return realtimeEnabled;
}

// Subscribe to all changes on a table; returns an unsubscribe function.
// Usage: useEffect(() => subscribeToTable("bids", reload), [reload])
export function subscribeToTable(table, onChange) {
  if (!supabase) return () => {};
  const channel = supabase
    .channel(`gem-${table}`)
    .on("postgres_changes", { event: "*", schema: "public", table }, () => onChange())
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}
