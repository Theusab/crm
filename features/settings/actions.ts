"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAppClient, getAppIdentity } from "@/lib/supabase/app";

export async function updatePipelineStage(formData: FormData) {
  const id = z.string().uuid().safeParse(String(formData.get("id") ?? ""));
  const name = z.string().trim().min(1).max(100).safeParse(String(formData.get("name") ?? ""));
  const color = z.string().regex(/^#[0-9a-fA-F]{6}$/).safeParse(String(formData.get("color") ?? ""));
  const probability = z.coerce.number().int().min(0).max(100).safeParse(formData.get("probability"));
  if (!id.success || !name.success || !color.success || !probability.success) throw new Error("Confira o nome, a cor e a probabilidade (0–100) da etapa.");

  const identity = await getAppIdentity();
  if (!identity?.profile || !["admin", "manager"].includes(identity.profile.role)) {
    throw new Error("Apenas admins e gerentes podem editar as etapas.");
  }
  const supabase = await createAppClient();
  const { error } = await supabase.from("pipeline_stages").update({
    name: name.data,
    color: color.data,
    probability: probability.data,
  }).eq("id", id.data);
  if (error) throw new Error(`Falha ao salvar etapa: ${error.message}`);
  revalidatePath("/settings/pipeline");
  revalidatePath("/dashboard");
  revalidatePath("/pipeline");
}
