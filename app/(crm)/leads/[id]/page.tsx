import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Pencil, Trash2 } from "lucide-react";
import { createAppClient, getAppIdentity } from "@/lib/supabase/app";
import { LeadForm } from "@/components/leads/lead-form";
import { NoteForm } from "@/components/leads/note-form";
import { assignLead, deleteLead } from "@/features/leads/actions";

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createAppClient();
  const [{ data: lead, error }, { data: activities, error: activityError }, identity] = await Promise.all([
    supabase.from("leads").select("id,name,email,phone,company,job_title,value,score,score_reason,source,status,created_at,tags,next_follow_up_at,owner_id,stage:pipeline_stages(name),owner:profiles!leads_owner_id_fkey(full_name)").eq("id", id).maybeSingle(),
    supabase.from("activities").select("id,type,title,body,created_at").eq("lead_id", id).order("created_at", { ascending: false }),
    getAppIdentity(),
  ]);
  if (error || activityError) throw new Error(`Falha ao carregar o lead: ${error?.message ?? activityError?.message}`);
  if (!lead) notFound();
  const profile = identity?.profile ?? null;
  const { data: teammates } = profile?.role === "admin" || profile?.role === "manager"
    ? await supabase.from("profiles").select("id,full_name").eq("is_active", true).order("full_name")
    : { data: null };
  const stage = Array.isArray(lead.stage) ? lead.stage[0] : lead.stage;
  const owner = Array.isArray(lead.owner) ? lead.owner[0] : lead.owner;

  return <div>
    <div className="crm-page-head"><div><div className="crm-eyebrow">LEADS / DETALHES</div><h1>{lead.name}</h1><p>{lead.company || lead.email || lead.phone || "Informações de contato"}</p></div><div className="crm-actions"><Link className="button button-secondary" href="/leads"><ChevronLeft size={14} /> Voltar</Link><Link className="button button-secondary" href={`/leads/${id}/edit`}><Pencil size={14} /> Editar</Link>{profile?.role === "admin" && <form action={deleteLead}><input type="hidden" name="id" value={id} /><button className="button button-secondary" aria-label="Excluir lead"><Trash2 size={14} /></button></form>}</div></div>
    <div className="crm-detail-grid">
      <section className="crm-panel">
        <div className="crm-panel-head"><div><h2>Informações do lead</h2><p>Detalhes do contato e da oportunidade.</p></div><span className="crm-status" data-status={lead.status}>{stage?.name ?? "Sem etapa"}</span></div>
        <dl className="crm-details"><dt>E-mail</dt><dd>{lead.email || "—"}</dd><dt>Telefone</dt><dd>{lead.phone || "—"}</dd><dt>Empresa</dt><dd>{lead.company || "—"}</dd><dt>Cargo</dt><dd>{lead.job_title || "—"}</dd><dt>Valor estimado</dt><dd>{lead.value === null ? "—" : new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(Number(lead.value))}</dd><dt>Origem</dt><dd>{lead.source}</dd><dt>Responsável</dt><dd>{owner?.full_name || "Sem responsável"}</dd><dt>Próximo contato</dt><dd>{lead.next_follow_up_at ? new Date(lead.next_follow_up_at).toLocaleString("pt-BR") : "Não agendado"}</dd><dt>Tags</dt><dd>{lead.tags?.length ? lead.tags.join(", ") : "—"}</dd><dt>Score IA</dt><dd>{lead.score ?? "Aguardando pontuação"}{lead.score_reason && <small>{lead.score_reason}</small>}</dd><dt>Criado em</dt><dd>{new Date(lead.created_at).toLocaleString("pt-BR")}</dd></dl>
        {profile?.role === "sales" && !lead.owner_id && <form action={assignLead} className="crm-assignment"><input type="hidden" name="id" value={lead.id} /><input type="hidden" name="owner_id" value={identity?.id ?? ""} /><button className="button button-primary">Assumir este lead</button></form>}
        {teammates && <form action={assignLead} className="crm-assignment"><input type="hidden" name="id" value={lead.id} /><label>Alterar responsável<select name="owner_id" defaultValue={lead.owner_id ?? ""}><option value="">Sem responsável</option>{teammates.map((member) => <option key={member.id} value={member.id}>{member.full_name || "Sem nome"}</option>)}</select></label><button className="button button-secondary">Salvar responsável</button></form>}
      </section>
      <section className="crm-panel">
        <div className="crm-panel-head"><div><h2>Atividades</h2><p>Histórico de interações e atualizações.</p></div></div>
        <NoteForm leadId={lead.id} />
        {activities?.length ? activities.map((activity) => <article className="crm-activity" key={activity.id}><strong>{activity.title}</strong><time>{new Date(activity.created_at).toLocaleString("pt-BR")}</time>{activity.body && <p>{activity.body}</p>}</article>) : <div className="crm-empty"><span>Nenhuma atividade registrada ainda.</span></div>}
      </section>
    </div>
  </div>;
}
