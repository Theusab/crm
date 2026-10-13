import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { createAppClient } from "@/lib/supabase/app";

export default async function LeadsPage({ searchParams }: { searchParams: Promise<{ q?: string; stage?: string }> }) {
  const params = await searchParams;
  const supabase = await createAppClient();
  const [{ data: leads, error }, { data: stages }] = await Promise.all([
    supabase.from("leads").select("id,name,email,phone,company,value,score,status,source,created_at,stage:pipeline_stages(name)").order("created_at", { ascending: false }).limit(200),
    supabase.from("pipeline_stages").select("id,name").order("position"),
  ]);
  if (error) throw new Error(`Falha ao carregar leads: ${error.message}`);
  const term = params.q?.trim().toLowerCase() ?? "";
  const rows = (leads ?? []).filter((lead) => {
    const stage = Array.isArray(lead.stage) ? lead.stage[0] : lead.stage;
    return (!params.stage || stage?.name === params.stage) &&
      (!term || [lead.name, lead.email, lead.phone, lead.company].some((value) => value?.toLowerCase().includes(term)));
  });

  return <div>
    <div className="crm-page-head"><div><div className="crm-eyebrow">RELACIONAMENTO</div><h1>Leads</h1><p>Pesquise, filtre e acompanhe seus potenciais clientes.</p></div><Link className="button button-primary" href="/leads/new"><Plus size={15} /> Novo lead</Link></div>
    <section className="crm-panel">
      <form className="crm-toolbar" method="get">
        <label className="crm-search"><Search size={15} /><input name="q" defaultValue={params.q} placeholder="Buscar por nome, empresa, e-mail ou telefone" /></label>
        <select name="stage" defaultValue={params.stage ?? ""}><option value="">Todas as etapas</option>{stages?.map((stage) => <option key={stage.id}>{stage.name}</option>)}</select>
        <button className="button button-secondary">Filtrar</button>
      </form>
      {rows.length === 0 ? <div className="crm-empty"><strong>{leads?.length ? "Nenhum lead corresponde aos filtros" : "Ainda não há leads"}</strong><span>{leads?.length ? "Altere a busca ou o filtro de etapa." : "Cadastre um contato ou configure a integração de entrada."}</span>{!leads?.length && <Link className="button button-primary" href="/leads/new"><Plus size={15} /> Cadastrar lead</Link>}</div> : <div className="crm-table-wrap"><table className="crm-table"><thead><tr><th>CONTATO</th><th>ETAPA</th><th>STATUS</th><th>VALOR</th><th>SCORE IA</th><th>ORIGEM</th><th>DATA</th></tr></thead><tbody>{rows.map((lead) => {
        const stage = Array.isArray(lead.stage) ? lead.stage[0] : lead.stage;
        return <tr key={lead.id}><td><Link href={`/leads/${lead.id}`}>{lead.name}</Link><br /><span>{lead.company || lead.email || lead.phone || "—"}</span></td><td>{stage?.name ?? "—"}</td><td><span className="crm-status" data-status={lead.status}>{lead.status === "won" ? "Ganho" : lead.status === "lost" ? "Perdido" : "Aberto"}</span></td><td>{lead.value === null ? "—" : new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL",maximumFractionDigits:0}).format(Number(lead.value))}</td><td>{lead.score ?? "Pendente"}</td><td>{lead.source}</td><td>{new Date(lead.created_at).toLocaleDateString("pt-BR")}</td></tr>;
      })}</tbody></table></div>}
    </section>
  </div>;
}
