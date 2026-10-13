"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseEnv } from "./env";

export function createClient() {
  const env = getSupabaseEnv();
  if (!env) throw new Error("Supabase environment variables are not configured");
  return createBrowserClient(env.url, env.anonKey);
}
