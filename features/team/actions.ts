"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createAppClient, getAppIdentity } from "@/lib/supabase/app";

async function requireAdmin() {
  const supabase = await createAppClient();
  const identity = await getAppIdentity();
  if (identity?.profile?.role !== "admin") throw new Error("Apenas administradores podem gerenciar a equipe.");
  return supabase;
}

export async function inviteTeammate(formData: FormData) {
  await requireAdmin();
  const email = z.string().email().safeParse(String(formData.get("email") ?? "").trim());
  const name = z.string().trim().min(1).max(200).safeParse(String(formData.get("full_name") ?? ""));
  if (!email.success || !name.success) throw new Error("Informe um nome e um e-mail válidos.");
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.inviteUserByEmail(email.data, { data: { full_name: name.data } });
  if (error) throw new Error(`Falha ao enviar convite: ${error.message}`);
  revalidatePath("/settings/team");
}

export async function updateTeammateRole(formData: FormData) {
  const supabase = await requireAdmin();
  const id = z.string().uuid().safeParse(String(formData.get("id") ?? ""));
  const role = z.enum(["admin", "manager", "sales"]).safeParse(String(formData.get("role") ?? ""));
  if (!id.success || !role.success) throw new Error("Usuário ou cargo inválido.");
  const { error } = await supabase.from("profiles").update({ role: role.data }).eq("id", id.data);
  if (error) throw new Error(`Falha ao atualizar cargo: ${error.message}`);
  revalidatePath("/settings/team");
}
