import { DocumentManager } from "@/components/knowledge/document-manager";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAppIdentity } from "@/lib/supabase/app";

export default async function KnowledgePage() {
  const identity = await getAppIdentity();
  if (identity?.profile?.role !== "admin") {
    return <div>
      <div className="crm-page-head"><div><div className="crm-eyebrow">INTELIGÊNCIA ARTIFICIAL</div><h1>Base de conhecimento</h1></div></div>
      <section className="crm-panel crm-empty"><strong>Acesso restrito</strong><span>Somente administradores podem gerenciar os documentos da IA.</span></section>
    </div>;
  }

  const db = createAdminClient();
  const { data: documents, error } = await db
    .from("knowledge_documents")
    .select("id,title,file_name,content_type,chunk_count,created_at")
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Falha ao carregar a base de conhecimento: ${error.message}`);

  return <div>
    <div className="crm-page-head"><div><div className="crm-eyebrow">INTELIGÊNCIA ARTIFICIAL</div><h1>Base de conhecimento</h1><p>Adicione documentos para orientar as respostas automáticas do WhatsApp.</p></div></div>
    {!process.env.OPENAI_API_KEY && <p className="crm-error">Configure OPENAI_API_KEY no servidor para indexar documentos.</p>}
    <section className="crm-panel">
      <div className="crm-panel-head"><div><h2>Documentos da empresa</h2><p>PDFs e arquivos de texto pesquisados semanticamente pela IA.</p></div></div>
      <DocumentManager documents={documents ?? []} />
    </section>
    <p className="crm-note">O modelo consulta os trechos mais relevantes. Se não encontrar respaldo nos documentos, não enviará resposta ao cliente.</p>
  </div>;
}
