import Link from "next/link";
import { ArrowRight, Plus, Target, Users } from "lucide-react";
import { createAppClient } from "@/lib/supabase/app";

const currency = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(value);

export default async function DashboardPage() {
  const supabase = await createAppClient();
  const [{ count: leadCount, error: countError }, { data: stages, error: stagesError }, { data: leads, error: leadsError }, { count: wonCount, error: wonError }, { data: summaries, error: summariesError }] = await Promise.all([
    supabase.from("leads").select("id", { count: "exact", head: true }).eq("status", "open"),
    supabase.from("pipeline_stages").select("id,name,slug,color,probability").order("position"),
    supabase.from("leads").select("id,name,company,value,score,source,created_at,stage:pipeline_stages(name,slug)").order("created_at", { ascending: false }).limit(8),
    supabase.from("leads").select("id", { count: "exact", head: true }).eq("status", "won"),
    supabase.from("leads").select("stage_id,value,score,status"),
  ]);
  if (countError || stagesError || leadsError || wonError || summariesError) throw new Error(`Falha ao carregar o painel: ${countError?.message ?? stagesError?.message ?? leadsError?.message ?? wonError?.message ?? summariesError?.message}`);

  const totalValue = (summaries ?? []).filter((lead) => lead.status === "open").reduce((sum, lead) => sum + Number(lead.value ?? 0), 0);
  const scoredCount = (summaries ?? []).filter((lead) => lead.score !== null).length;
  const noLeads = !leadCount;
  const noStages = !stages?.length;

  return <div>
    <div className="crm-page-head"><div><div className="crm-eyebrow">VISÃO GERAL</div><h1>Seu painel de vendas</h1><p>Indicadores calculados a partir dos leads da sua equipe.</p></div><div className="crm-actions"><Link className="button button-primary" href="/leads/new"><Plus size={15} /> Novo lead</Link></div></div>
    <section className="crm-metrics">
      <article className="crm-metric"><span><Users size={13} /> Leads ativos</span><strong>{leadCount ?? 0}</strong><small>Leads abertos no funil</small></article>
      <article className="crm-metric"><span><Target size={13} /> Pipeline em aberto</span><strong>{currency(totalValue)}</strong><small>Valor de todas as oportunidades abertas</small></article>
      <article className="crm-metric"><span>Conversões</span><strong>{wonCount ?? 0}</strong><small>Leads marcados como ganhos</small></article>
      <article className="crm-metric"><span>Leads pontuados</span><strong>{scoredCount}</strong><small>Com avaliação de potencial por IA</small></article>
    </section>
    <section className="crm-panel">
      <div className="crm-panel-head"><div><h2>Leads recentes</h2><p>Contatos recebidos recentemente no CRM.</p></div><Link className="text-link" href="/leads">Ver todos <ArrowRight size={14} /></Link></div>
      {noLeads ? <div className="crm-empty"><Users size={22} /><strong>Seu funil está pronto para começar</strong><span>Os leads reais aparecerão aqui quando forem cadastrados ou recebidos por integração.</span><Link className="button button-primary" href="/leads/new"><Plus size={15} /> Cadastrar primeiro lead</Link></div> : <div className="crm-table-wrap"><table className="crm-table"><thead><tr><th>CONTATO</th><th>ETAPA</th><th>VALOR</th><th>SCORE IA</th><th>ORIGEM</th><th>RECEBIDO</th></tr></thead><tbody>{(leads ?? []).map((lead) => {
        const stage = Array.isArray(lead.stage) ? lead.stage[0] : lead.stage;
        return <tr key={lead.id}><td><Link href={`/leads/${lead.id}`}>{lead.name}</Link><br /><span>{lead.company || "—"}</span></td><td><span className="crm-status">{stage?.name ?? "Sem etapa"}</span></td><td>{lead.value === null ? "—" : currency(Number(lead.value))}</td><td>{lead.score ?? "Pendente"}</td><td>{lead.source}</td><td>{new Date(lead.created_at).toLocaleDateString("pt-BR")}</td></tr>;
      })}</tbody></table></div>}
    </section>
    <section className="crm-panel">
      <div className="crm-panel-head"><div><h2>Etapas do funil</h2><p>Leads reais agrupados por etapa.</p></div><Link className="text-link" href="/pipeline">Abrir funil <ArrowRight size={14} /></Link></div>
      {noStages ? <div className="crm-empty"><strong>Nenhuma etapa configurada</strong><span>Execute a migration inicial para criar as etapas do funil.</span></div> : <div className="crm-metrics crm-stage-metrics">{stages?.map((stage) => {
        const stageLeads = (summaries ?? []).filter((lead) => lead.stage_id === stage.id);
        return <article className="crm-metric" key={stage.id}><span>{stage.name}</span><strong>{stageLeads.length}</strong><small>{stage.probability}% de probabilidade</small></article>;
      })}</div>}
    </section>
  </div>;
}
