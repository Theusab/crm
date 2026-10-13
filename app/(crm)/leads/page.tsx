import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { createAppClient } from "@/lib/supabase/app";

export default async function LeadsPage({ searchParams }: { searchParams: Promise<{ q?: string; stage?: string }> }) {
  const params = await searchParams;
  const supabase = await createAppClient();
  const [
    { data: leads, error },
    { data: stages, error: stagesError },
  ] = await Promise.all([
    supabase.from("leads").select("id,name,email,phone,company,job_title,value,score,status,source,created_at,custom,stage:pipeline_stages(name)").eq("custom->>record_type", "lead").order("created_at", { ascending: false }).limit(500),
    supabase.from("pipeline_stages").select("id,name").order("position"),
  ]);
  if (error || stagesError) throw new Error(`Falha ao carregar leads: ${error?.message ?? stagesError?.message}`);

  const term = params.q?.trim().toLowerCase() ?? "";
  const rows = (leads ?? []).filter((lead) => {
    const stage = Array.isArray(lead.stage) ? lead.stage[0] : lead.stage;
    const custom = lead.custom && typeof lead.custom === "object" ? lead.custom : {};
    return (!params.stage || stage?.name === params.stage) &&
      (!term || [lead.name, lead.email, custom.source_email, lead.phone, lead.company, custom.city, custom.specialty]
        .some((value) => String(value ?? "").toLowerCase().includes(term)));
  });

  return <div>
    <div className="crm-page-head"><div><div className="crm-eyebrow">RELACIONAMENTO</div><h1>Leads</h1><p>Os leads da base BlackCore estão no CRM e no funil de vendas.</p></div><Link className="button button-primary" href="/leads/new"><Plus size={15} /> Novo lead</Link></div>
    <section className="crm-panel">
      <form className="crm-toolbar" method="get">
        <label className="crm-search"><Search size={15} /><input name="q" defaultValue={params.q} placeholder="Buscar por empresa, cidade, especialidade, e-mail ou telefone" /></label>
        <select name="stage" defaultValue={params.stage ?? ""}><option value="">Todas as etapas</option>{stages?.map((stage) => <option key={stage.id}>{stage.name}</option>)}</select>
        <button className="button button-secondary">Filtrar</button>
      </form>
      {rows.length === 0 ? <div className="crm-empty"><strong>{leads?.length ? "Nenhum lead corresponde aos filtros" : "Ainda não há leads"}</strong><span>{leads?.length ? "Altere a busca ou o filtro de etapa." : "Cadastre um lead ou configure uma integração de entrada."}</span>{!leads?.length && <Link className="button button-primary" href="/leads/new"><Plus size={15} /> Cadastrar lead</Link>}</div> : <div className="crm-table-wrap"><table className="crm-table"><thead><tr><th>LEAD</th><th>CIDADE</th><th>ESPECIALIDADE</th><th>ETAPA</th><th>STATUS</th><th>SCORE IA</th><th>DATA</th></tr></thead><tbody>{rows.map((lead) => {
        const stage = Array.isArray(lead.stage) ? lead.stage[0] : lead.stage;
        const custom = lead.custom && typeof lead.custom === "object" ? lead.custom : {};
        return <tr key={lead.id}><td><Link className="crm-lead-link" href={`/leads/${lead.id}`}><span className="crm-lead-name">{lead.name}</span><span className="crm-lead-meta">{lead.email || custom.source_email || lead.phone || "Abrir ficha do lead"}</span></Link></td><td>{custom.city || "—"}</td><td>{custom.specialty || lead.job_title || "—"}</td><td>{stage?.name ?? "—"}</td><td><span className="crm-status" data-status={lead.status}>{lead.status === "won" ? "Ganho" : lead.status === "lost" ? "Perdido" : "Aberto"}</span></td><td>{lead.score ?? "Pendente"}</td><td>{new Date(lead.created_at).toLocaleDateString("pt-BR")}</td></tr>;
      })}</tbody></table></div>}
    </section>
  </div>;
}
