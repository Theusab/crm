"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createAppClient, getAppIdentity } from "@/lib/supabase/app";

const whatsappAutomationSchema = z.object({
  enabled: z.boolean(),
  messageTemplate: z.string().trim().max(1000),
}).superRefine(({ enabled, messageTemplate }, context) => {
  if (enabled && !messageTemplate) {
    context.addIssue({ code: "custom", path: ["messageTemplate"], message: "Escreva a mensagem antes de ativar a automação." });
  }
  if (enabled && /\{(?!nome\})[^{}]+\}/i.test(messageTemplate)) {
    context.addIssue({ code: "custom", path: ["messageTemplate"], message: "Use apenas a variável {nome} na mensagem." });
  }
});

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

export async function saveWhatsappAutomation(formData: FormData) {
  const parsed = whatsappAutomationSchema.safeParse({
    enabled: formData.get("enabled") === "on",
    messageTemplate: String(formData.get("message_template") ?? ""),
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Confira a configuração da automação.");
  }

  const identity = await getAppIdentity();
  if (identity?.profile?.role !== "admin") {
    throw new Error("Apenas administradores podem configurar a automação do WhatsApp.");
  }

  const supabase = await createAppClient();
  const { error } = await supabase.from("crm_settings").upsert({
    key: "whatsapp_qualified_lead",
    value: {
      enabled: parsed.data.enabled,
      message_template: parsed.data.messageTemplate,
    },
  });
  if (error) throw new Error(`Falha ao salvar a automação do WhatsApp: ${error.message}`);

  revalidatePath("/settings/integrations");
  redirect("/settings/integrations?whatsapp=saved");
}
