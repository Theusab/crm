"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import OpenAI from "openai";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAppIdentity } from "@/lib/supabase/app";

export type KnowledgeActionState = {
  error?: string;
  success?: string;
};

const MAX_FILE_SIZE = 8 * 1024 * 1024;
const MAX_TEXT_LENGTH = 120_000;
const CHUNK_SIZE = 1_200;
const CHUNK_OVERLAP = 200;

function splitIntoChunks(text: string) {
  const chunks: string[] = [];
  let offset = 0;
  while (offset < text.length) {
    let end = Math.min(offset + CHUNK_SIZE, text.length);
    if (end < text.length) {
      const boundary = text.lastIndexOf(" ", end);
      if (boundary > offset + CHUNK_SIZE * 0.6) end = boundary;
    }
    const chunk = text.slice(offset, end).trim();
    if (chunk) chunks.push(chunk);
    offset = end - CHUNK_OVERLAP;
  }
  return chunks;
}

async function readDocument(file: File, extension: string) {
  const bytes = Buffer.from(await file.arrayBuffer());
  const { default: pdfParse } = await import("pdf-parse");
  const text = extension === ".pdf"
    ? (await pdfParse(bytes)).text
    : bytes.toString("utf8");
  return text
    .replace(/\u0000/g, "")
    .replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_TEXT_LENGTH);
}

export async function uploadKnowledgeDocument(
  _state: KnowledgeActionState,
  formData: FormData,
): Promise<KnowledgeActionState> {
  const identity = await getAppIdentity();
  if (identity?.profile?.role !== "admin") return { error: "Somente administradores podem enviar documentos." };

  const entry = formData.get("file");
  if (!(entry instanceof File) || entry.size === 0) return { error: "Selecione um arquivo PDF ou TXT." };
  if (entry.size > MAX_FILE_SIZE) return { error: "O arquivo não pode ultrapassar 8 MB." };
  const extension = entry.name.toLowerCase().slice(entry.name.lastIndexOf("."));
  if (![".pdf", ".txt"].includes(extension)) return { error: "Formato inválido. Envie um arquivo PDF ou TXT." };

  let text: string;
  try {
    text = await readDocument(entry, extension);
  } catch (error) {
    return { error: `Não foi possível ler o documento: ${error instanceof Error ? error.message : String(error)}` };
  }
  if (text.length < 40) return { error: "O documento não contém texto suficiente para criar a base de conhecimento." };
  if (!process.env.OPENAI_API_KEY) return { error: "Configure OPENAI_API_KEY no servidor para indexar documentos." };

  const chunks = splitIntoChunks(text);
  const openai = new OpenAI({ timeout: 30_000, maxRetries: 1 });
  const embeddings: number[][] = [];
  try {
    for (let start = 0; start < chunks.length; start += 32) {
      const batch = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: chunks.slice(start, start + 32),
      });
      embeddings.push(...batch.data.sort((a, b) => a.index - b.index).map((item) => item.embedding));
    }
  } catch (error) {
    return { error: `Falha ao indexar o documento com a OpenAI: ${error instanceof Error ? error.message : String(error)}` };
  }

  const db = createAdminClient();
  const safeFileName = entry.name.replace(/[\\/\u0000-\u001f]/g, "_").slice(0, 255);
  const title = safeFileName.replace(/\.(pdf|txt)$/i, "").slice(0, 200) || "Documento";
  const contentType = extension === ".pdf" ? "application/pdf" : "text/plain";
  const { data: document, error: documentError } = await db.from("knowledge_documents").insert({
    title,
    file_name: safeFileName,
    content_type: contentType,
    chunk_count: chunks.length,
    created_by: identity.id,
  }).select("id").single();
  if (documentError || !document) {
    return { error: `Falha ao salvar o documento: ${documentError?.message ?? "registro indisponível"}` };
  }

  const rows = chunks.map((content, index) => ({
    document_id: document.id,
    chunk_index: index,
    content,
    embedding: `[${embeddings[index].join(",")}]`,
  }));
  const { error: chunkError } = await db.from("knowledge_chunks").insert(rows);
  if (chunkError) {
    const { error: cleanupError } = await db.from("knowledge_documents").delete().eq("id", document.id);
    if (cleanupError) console.error("Falha ao remover documento parcialmente indexado:", cleanupError.message);
    return { error: `Falha ao salvar os trechos do documento: ${chunkError.message}` };
  }

  revalidatePath("/settings/knowledge");
  revalidatePath("/settings/integrations");
  return { success: `${title} foi indexado com ${chunks.length} trechos.` };
}

export async function deleteKnowledgeDocument(formData: FormData) {
  const id = z.string().uuid().safeParse(String(formData.get("id") ?? ""));
  if (!id.success) throw new Error("Identificador de documento inválido.");
  const identity = await getAppIdentity();
  if (identity?.profile?.role !== "admin") throw new Error("Somente administradores podem remover documentos.");

  const db = createAdminClient();
  const { error } = await db.from("knowledge_documents").delete().eq("id", id.data);
  if (error) throw new Error(`Falha ao remover documento: ${error.message}`);
  revalidatePath("/settings/knowledge");
}

export async function saveWhatsappAssistant(formData: FormData) {
  const enabled = formData.get("enabled") === "on";
  const identity = await getAppIdentity();
  if (identity?.profile?.role !== "admin") throw new Error("Apenas administradores podem configurar o atendimento automático.");

  const db = createAdminClient();
  const { error } = await db.from("crm_settings").upsert({
    key: "whatsapp_ai_assistant",
    value: { enabled },
  });
  if (error) throw new Error(`Falha ao salvar a configuração do atendimento: ${error.message}`);
  revalidatePath("/settings/integrations");
  redirect("/settings/integrations?assistant=saved");
}
