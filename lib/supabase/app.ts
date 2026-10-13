import { headers } from "next/headers";
import { createAdminClient } from "./admin";
import { getSupabaseEnv } from "./env";
import { createClient } from "./server";

export type AppIdentity = {
  id: string;
  email: string | null;
  profile: {
    id: string;
    full_name: string;
    role: "admin" | "manager" | "sales";
    is_active: boolean;
  } | null;
};

export class SupabaseSchemaMissingError extends Error {
  constructor() {
    super("A migration inicial do Supabase ainda não foi aplicada.");
    this.name = "SupabaseSchemaMissingError";
  }
}

export async function isLocalAuthBypass() {
  if (process.env.NODE_ENV !== "development") return false;
  const host = (await headers()).get("host")?.split(":")[0].toLowerCase();
  return host === "localhost" || host === "127.0.0.1";
}

export async function createAppClient() {
  if (!getSupabaseEnv()) throw new Error("Supabase public environment variables are not configured");
  if (await isLocalAuthBypass()) return createAdminClient();
  return createClient();
}

export async function getAppIdentity(): Promise<AppIdentity | null> {
  const supabase = await createAppClient();

  if (await isLocalAuthBypass()) {
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("id,full_name,role,is_active")
      .eq("is_active", true)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (error?.code === "PGRST205") throw new SupabaseSchemaMissingError();
    if (error) throw new Error(`Falha ao carregar o perfil local: ${error.message}`);
    if (!profile) return null;
    return { id: profile.id, email: null, profile };
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError) throw new Error(`Falha ao validar a sessão: ${authError.message}`);
  if (!user) return null;
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id,full_name,role,is_active")
    .eq("id", user.id)
    .maybeSingle();
  if (profileError?.code === "PGRST205") throw new SupabaseSchemaMissingError();
  if (profileError) throw new Error(`Falha ao carregar o perfil: ${profileError.message}`);
  return { id: user.id, email: user.email ?? null, profile };
}
