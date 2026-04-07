import "server-only";

import { createClient } from "@supabase/supabase-js";

function getSupabaseUrl() {
  return process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
}

function getSupabaseServerKey() {
  return process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
}

export function hasSupabaseServerEnv() {
  return Boolean(getSupabaseUrl() && getSupabaseServerKey());
}

export function createSupabaseAdminClient() {
  const url = getSupabaseUrl();
  const serverKey = getSupabaseServerKey();

  if (!url || !serverKey) {
    throw new Error("Supabase environment variables are not configured.");
  }

  return createClient(url, serverKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}
