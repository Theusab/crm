import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Pencil, Trash2 } from "lucide-react";
import { createAppClient, getAppIdentity } from "@/lib/supabase/app";
import { NoteForm } from "@/components/leads/note-form";
import { WhatsAppQuickMessage } from "@/components/whatsapp/whatsapp-quick-message";
import { assignLead, deleteLead } from "@/features/leads/actions";
import { getRecordType } from "@/lib/leads/record-type";

export async function RecordDetailPage({ id, recordType }: { id: string; recordType: "lead" | "contact" }) {
  const supabase = await createAppClient();
  const [{ data: lead, error }, { data: activities, error: activityError }, identity] = await Promise.all([
    supabase.from("leads").select("id,name,email,phone,company,job_title,value,score,score_reason,source,status,created_at,tags,next_follow_up_at,owner_id,custom,stage:pipeline_stages(name),owner:profiles!leads_owner_id_fkey(full_name)").eq("id", id).maybeSingle(),
    supabase.from("activities").select("id,type,title,body,created_at").eq("lead_id", id).order("created_at", { ascending: false }),
    getAppIdentity(),
  ]);
  if (error || activityError) throw new Error(`Falha ao carregar o registro: ${error?.message ?? activityError?.message}`);
  if (!lead || getRecordType(lead.custom) !== recordType) notFound();

  const isContact = recordType === "contact";
  const basePath = isContact ? "/contacts" : "/leads";
  const label = isContact ? "contato" : "lead";
  const custom = lead.custom && typeof lead.custom === "object" ? lead.custom : {};
  const email = lead.email || custom.source_email;
  const profile = identity?.profile ?? null;
  const { data: teammates } = profile?.role === "admin" || profile?.role === "manager"
    ? await supabase.from("profiles").select("id,full_name").eq("is_active", true).order("full_name")
    : { data: null };
  const stage = Array.isArray(lead.stage) ? lead.stage[0] : lead.stage;
  const owner = Array.isArray(lead.owner) ? lead.owner[0] : lead.owner;

  return <div>
    <div className="crm-page-head"><div><div className="crm-eyebrow">{isContact ? "CONTATOS" : "LEADS"} / DETALHES</div><h1>{lead.name}</h1><p>{lead.company || email || lead.phone || "Informações de contato"}</p></div><div className="crm-actions"><Link className="button button-secondary" href={basePath}><ChevronLeft size={14} /> Voltar</Link><Link className="button button-secondary" href={`${basePath}/${id}/edit`}><Pencil size={14} /> Editar</Link>{profile?.role === "admin" && <form action={deleteLead}><input type="hidden" name="id" value={id} /><button className="button button-secondary" aria-label={`Excluir ${label}`}><Trash2 size={14} /></button></form>}</div></div>
    <div className="crm-detail-grid">
      <section className="crm-panel">
        <div className="crm-panel-head"><div><h2>Informações do {label}</h2><p>{isContact ? "Dados e histórico deste contato." : "Detalhes do contato e da oportunidade."}</p></div><span className="crm-status" data-status={lead.status}>{isContact ? "Contato" : stage?.name ?? "Sem etapa"}</span></div>
        <dl className="crm-details"><dt>E-mail</dt><dd>{email || "—"}</dd><dt>Telefone</dt><dd>{lead.phone || "—"}</dd><dt>Empresa</dt><dd>{lead.company || "—"}</dd>{custom.city && <><dt>Cidade</dt><dd>{custom.city}</dd></>}{custom.specialty && <><dt>Especialidade</dt><dd>{custom.specialty}</dd></>}{custom.website && <><dt>Site</dt><dd>{String(custom.website)}</dd></>}{custom.source_status && <><dt>Status de origem</dt><dd>{custom.source_status}</dd></>}<dt>Cargo</dt><dd>{lead.job_title || "—"}</dd><dt>Valor estimado</dt><dd>{lead.value === null ? "—" : new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(Number(lead.value))}</dd><dt>Origem</dt><dd>{lead.source}</dd><dt>Responsável</dt><dd>{owner?.full_name || "Sem responsável"}</dd><dt>Próximo contato</dt><dd>{lead.next_follow_up_at ? new Date(lead.next_follow_up_at).toLocaleString("pt-BR") : "Não agendado"}</dd><dt>Tags</dt><dd>{lead.tags?.length ? lead.tags.join(", ") : "—"}</dd>{!isContact && <><dt>Score IA</dt><dd>{lead.score ?? "Aguardando pontuação"}{lead.score_reason && <small>{lead.score_reason}</small>}</dd></>}<dt>Criado em</dt><dd>{new Date(lead.created_at).toLocaleString("pt-BR")}</dd></dl>
        <WhatsAppQuickMessage
          phone={lead.phone}
          name={lead.name}
          city={typeof custom.city === "string" ? custom.city : null}
          country={typeof custom.country === "string" ? custom.country : typeof custom.country_code === "string" ? custom.country_code : null}
          language={typeof custom.language === "string" ? custom.language : typeof custom.locale === "string" ? custom.locale : null}
          source={lead.source}
        />
        {!isContact && profile?.role === "sales" && !lead.owner_id && <form action={assignLead} className="crm-assignment"><input type="hidden" name="id" value={lead.id} /><input type="hidden" name="owner_id" value={identity?.id ?? ""} /><button className="button button-primary">Assumir este lead</button></form>}
        {!isContact && teammates && <form action={assignLead} className="crm-assignment"><input type="hidden" name="id" value={lead.id} /><label>Alterar responsável<select name="owner_id" defaultValue={lead.owner_id ?? ""}><option value="">Sem responsável</option>{teammates.map((member) => <option key={member.id} value={member.id}>{member.full_name || "Sem nome"}</option>)}</select></label><button className="button button-secondary">Salvar responsável</button></form>}
      </section>
      <section className="crm-panel">
        <div className="crm-panel-head"><div><h2>Atividades</h2><p>Histórico de interações e atualizações.</p></div></div>
        <NoteForm leadId={lead.id} />
        {activities?.length ? activities.map((activity) => <article className="crm-activity" key={activity.id}><strong>{activity.title}</strong><time>{new Date(activity.created_at).toLocaleString("pt-BR")}</time>{activity.body && <p>{activity.body}</p>}</article>) : <div className="crm-empty"><span>Nenhuma atividade registrada ainda.</span></div>}
      </section>
    </div>
  </div>;
}
