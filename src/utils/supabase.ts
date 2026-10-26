import type { SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);

let client: Promise<SupabaseClient | null> | null = null;
const onLoad: ((client: SupabaseClient) => void)[] = [];

// The Supabase library is large, so it is downloaded only when accounts are
// configured and something actually needs it, and the client is created once
export const getSupabase = (): Promise<SupabaseClient | null> => {
  if (!isSupabaseConfigured) return Promise.resolve(null);
  client ??= import('@supabase/supabase-js').then(({ createClient }) => {
    const created = createClient(supabaseUrl, supabaseKey);
    for (const callback of onLoad.splice(0)) callback(created);
    return created;
  });
  return client;
};

// Runs `callback` once the client exists, whoever caused it to load
export const whenSupabaseLoads = (callback: (client: SupabaseClient) => void) => {
  if (client) void client.then((c) => c && callback(c));
  else onLoad.push(callback);
};

// Supabase keeps a signed-in session in localStorage under "sb-<project>-auth-token"
export const hasStoredSession = () => {
  try {
    return Object.keys(localStorage).some((key) => key.startsWith('sb-') && key.endsWith('-auth-token'));
  } catch {
    return false;
  }
};
