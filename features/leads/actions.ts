"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createAppClient, getAppIdentity } from "@/lib/supabase/app";

const leadSchema = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.union([z.string().trim().email().max(320), z.literal("")]),
  phone: z.string().trim().max(40),
  company: z.string().trim().max(200),
  job_title: z.string().trim().max(200),
  source: z.string().trim().min(1).max(60),
  value: z.string(),
  tags: z.string().max(800),
  next_follow_up_at: z.string(),
}).refine((lead) => lead.email || lead.phone, {
  message: "Informe ao menos um e-mail ou telefone para o lead.",
});

export type LeadFormState = { error?: string };

function readLeadForm(formData: FormData) {
  return leadSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email") || "",
    phone: formData.get("phone") || "",
    company: formData.get("company") || "",
    job_title: formData.get("job_title") || "",
    source: formData.get("source") || "manual",
    value: formData.get("value") || "",
    tags: formData.get("tags") || "",
    next_follow_up_at: formData.get("next_follow_up_at") || "",
  });
}

export async function createLead(_state: LeadFormState, formData: FormData): Promise<LeadFormState> {
  const parsed = readLeadForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Confira os dados do lead." };
  const value = parsed.data.value ? Number(parsed.data.value) : null;
  if (value !== null && (!Number.isFinite(value) || value < 0)) return { error: "O valor deve ser um número positivo." };
  const followUp = parsed.data.next_follow_up_at ? new Date(parsed.data.next_follow_up_at) : null;
  if (followUp && Number.isNaN(followUp.getTime())) return { error: "Data de acompanhamento inválida." };
  const tags = parsed.data.tags.split(",").map((tag) => tag.trim()).filter(Boolean).slice(0, 20);

  const supabase = await createAppClient();
  const identity = await getAppIdentity();
  if (!identity) return { error: "Não foi possível identificar o usuário ativo." };
  const { data: stage, error: stageError } = await supabase.from("pipeline_stages").select("id").eq("slug", "novo").single();
  if (stageError || !stage) return { error: "Não foi possível carregar a etapa inicial do funil." };

  const { data: lead, error } = await supabase.from("leads").insert({
    name: parsed.data.name,
    email: parsed.data.email.toLowerCase() || null,
    phone: parsed.data.phone || null,
    company: parsed.data.company || null,
    job_title: parsed.data.job_title || null,
    source: parsed.data.source,
    value,
    stage_id: stage.id,
    owner_id: null,
    created_by: identity.id,
    position: Date.now(),
    tags,
    next_follow_up_at: followUp?.toISOString() ?? null,
  }).select("id").single();
  if (error || !lead) return { error: error?.message ?? "Não foi possível criar o lead." };

  const { error: activityError } = await supabase.from("activities").insert({
    lead_id: lead.id,
    actor_id: identity.id,
    type: "note",
    title: "Lead criado manualmente",
  });
  if (activityError) return { error: `Lead criado, mas a atividade não foi registrada: ${activityError.message}` };
  revalidatePath("/dashboard");
  revalidatePath("/leads");
  revalidatePath("/pipeline");
  redirect(`/leads/${lead.id}`);
}

export async function updateLead(_state: LeadFormState, formData: FormData): Promise<LeadFormState> {
  const id = String(formData.get("id") ?? "");
  const parsed = readLeadForm(formData);
  if (!z.string().uuid().safeParse(id).success) return { error: "Identificador de lead inválido." };
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Confira os dados do lead." };
  const value = parsed.data.value ? Number(parsed.data.value) : null;
  if (value !== null && (!Number.isFinite(value) || value < 0)) return { error: "O valor deve ser um número positivo." };
  const followUp = parsed.data.next_follow_up_at ? new Date(parsed.data.next_follow_up_at) : null;
  if (followUp && Number.isNaN(followUp.getTime())) return { error: "Data de acompanhamento inválida." };
  const tags = parsed.data.tags.split(",").map((tag) => tag.trim()).filter(Boolean).slice(0, 20);

  const supabase = await createAppClient();
  const identity = await getAppIdentity();
  if (!identity?.profile) return { error: "Não foi possível identificar o usuário ativo." };
  if (identity.profile.role === "sales") {
    const { data: existing, error: accessError } = await supabase.from("leads").select("owner_id").eq("id", id).maybeSingle();
    if (accessError || !existing || (existing.owner_id && existing.owner_id !== identity.id)) {
      return { error: "Você não tem permissão para editar este lead." };
    }
  }
  const { error } = await supabase.from("leads").update({
    name: parsed.data.name,
    email: parsed.data.email.toLowerCase() || null,
    phone: parsed.data.phone || null,
    company: parsed.data.company || null,
    job_title: parsed.data.job_title || null,
    source: parsed.data.source,
    value,
    tags,
    next_follow_up_at: followUp?.toISOString() ?? null,
  }).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/dashboard");
  revalidatePath("/leads");
  revalidatePath("/pipeline");
  revalidatePath(`/leads/${id}`);
  return {};
}

export async function moveLead(leadId: string, stageId: string) {
  if (!z.string().uuid().safeParse(leadId).success || !z.string().uuid().safeParse(stageId).success) {
    throw new Error("Identificador inválido ao mover o lead.");
  }
  const supabase = await createAppClient();
  const identity = await getAppIdentity();
  if (!identity?.profile) throw new Error("Não foi possível identificar o usuário ativo.");
  const profile = identity.profile;
  const { data: lead, error: leadError } = await supabase.from("leads").select("owner_id").eq("id", leadId).single();
  if (leadError || !lead) throw new Error(`Falha ao carregar o lead: ${leadError?.message ?? "registro indisponível"}`);
  if (profile.role === "sales" && lead.owner_id && lead.owner_id !== identity.id) {
    throw new Error("Você não tem permissão para mover este lead.");
  }
  const update = {
    stage_id: stageId,
    position: Date.now(),
    ...(profile.role === "sales" && !lead.owner_id ? { owner_id: identity.id } : {}),
  };
  const { error } = await supabase.from("leads").update(update).eq("id", leadId);
  if (error) throw new Error(`Não foi possível mover o lead: ${error.message}`);
  revalidatePath("/pipeline");
  revalidatePath("/dashboard");
  revalidatePath("/leads");
}

export async function addLeadNote(_state: LeadFormState, formData: FormData): Promise<LeadFormState> {
  const leadId = String(formData.get("lead_id") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  const activityType = z.enum(["note", "call", "email", "whatsapp_in", "whatsapp_out"]).safeParse(String(formData.get("type") ?? "note"));
  if (!z.string().uuid().safeParse(leadId).success || !body || body.length > 4000) return { error: "Escreva uma nota de até 4.000 caracteres." };
  if (!activityType.success) return { error: "Tipo de atividade inválido." };
  const supabase = await createAppClient();
  const identity = await getAppIdentity();
  if (!identity) return { error: "Não foi possível identificar o usuário ativo." };
  if (identity.profile?.role === "sales") {
    const { data: lead, error: accessError } = await supabase.from("leads").select("owner_id").eq("id", leadId).maybeSingle();
    if (accessError || !lead || (lead.owner_id && lead.owner_id !== identity.id)) {
      return { error: "Você não tem permissão para registrar atividade neste lead." };
    }
  }
  const { error } = await supabase.from("activities").insert({
    lead_id: leadId,
    actor_id: identity.id,
    type: activityType.data,
    title: activityType.data === "note" ? "Nota adicionada" : `Atividade: ${activityType.data.replace("_", " ")}`,
    body,
  });
  if (error) return { error: error.message };
  revalidatePath(`/leads/${leadId}`);
  return {};
}

export async function deleteLead(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!z.string().uuid().safeParse(id).success) throw new Error("Identificador de lead inválido.");
  const supabase = await createAppClient();
  const identity = await getAppIdentity();
  if (identity?.profile?.role !== "admin") throw new Error("Apenas administradores podem excluir leads.");
  const { error } = await supabase.from("leads").delete().eq("id", id);
  if (error) throw new Error(`Não foi possível excluir o lead: ${error.message}`);
  revalidatePath("/dashboard");
  revalidatePath("/leads");
  revalidatePath("/pipeline");
  redirect("/leads");
}

export async function assignLead(formData: FormData) {
  const id = z.string().uuid().safeParse(String(formData.get("id") ?? ""));
  const ownerId = z.string().uuid().or(z.literal("")).safeParse(String(formData.get("owner_id") ?? ""));
  if (!id.success || !ownerId.success) throw new Error("Lead ou responsável inválido.");
  const supabase = await createAppClient();
  const identity = await getAppIdentity();
  if (!identity?.profile) throw new Error("Não foi possível identificar o usuário ativo.");
  const profile = identity.profile;
  if (profile.role === "sales" && ownerId.data !== identity.id) {
    throw new Error("Vendas só pode assumir leads sem responsável para a própria conta.");
  }
  if (ownerId.data) {
    const { data: owner, error: ownerError } = await supabase.from("profiles").select("is_active").eq("id", ownerId.data).maybeSingle();
    if (ownerError || !owner?.is_active) throw new Error("O responsável selecionado não está ativo.");
  } else if (profile.role === "sales") {
    throw new Error("Vendas não pode remover o próprio vínculo com um lead.");
  }
  const { error } = await supabase.from("leads").update({ owner_id: ownerId.data || null }).eq("id", id.data);
  if (error) throw new Error(`Falha ao alterar responsável: ${error.message}`);
  revalidatePath(`/leads/${id.data}`);
  revalidatePath("/leads");
  revalidatePath("/dashboard");
}
