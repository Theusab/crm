import { createAppClient } from "@/lib/supabase/app";

const currency = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(value);

export default async function ReportsPage() {
  const supabase = await createAppClient();
  const [{ data: stages, error: stagesError }, { data: leads, error: leadsError }] = await Promise.all([
    supabase.from("pipeline_stages").select("id,name,color,probability,is_won,is_lost").order("position"),
    supabase.from("leads").select("id,stage_id,status,value,created_at,score"),
  ]);
  if (stagesError || leadsError) throw new Error(`Falha ao carregar relatórios: ${stagesError?.message ?? leadsError?.message}`);
  const records = leads ?? [];
  const won = records.filter((lead) => lead.status === "won");
  const lost = records.filter((lead) => lead.status === "lost");
  const open = records.filter((lead) => lead.status === "open");
  const wonValue = won.reduce((sum, lead) => sum + Number(lead.value ?? 0), 0);
  const conversion = records.length ? Math.round(won.length / records.length * 100) : 0;
  return <div>
    <div className="crm-page-head"><div><div className="crm-eyebrow">ANÁLISE</div><h1>Relatórios</h1><p>Resumo calculado com os registros reais do CRM.</p></div></div>
    <section className="crm-metrics"><article className="crm-metric"><span>Total de leads</span><strong>{records.length}</strong><small>Registros visíveis conforme sua permissão</small></article><article className="crm-metric"><span>Em aberto</span><strong>{open.length}</strong><small>Oportunidades ativas</small></article><article className="crm-metric"><span>Taxa de ganhos</span><strong>{conversion}%</strong><small>{won.length} ganhos · {lost.length} perdidos</small></article><article className="crm-metric"><span>Receita ganha</span><strong>{currency(wonValue)}</strong><small>Valor associado aos negócios ganhos</small></article></section>
    <section className="crm-panel"><div className="crm-panel-head"><div><h2>Desempenho por etapa</h2><p>Distribuição do volume e valor de oportunidades.</p></div></div>
      {!stages?.length ? <div className="crm-empty"><span>Nenhuma etapa configurada.</span></div> : <div className="crm-stage-report">{stages.map((stage) => {
        const stageLeads = records.filter((lead) => lead.stage_id === stage.id);
        const value = stageLeads.reduce((sum, lead) => sum + Number(lead.value ?? 0), 0);
        return <div className="crm-report-row" key={stage.id}><span><i style={{ background: stage.color }} />{stage.name}</span><strong>{stageLeads.length}</strong><div className="crm-report-track"><i style={{ width: `${records.length ? Math.max(stageLeads.length / records.length * 100, stageLeads.length ? 2 : 0) : 0}%`, background: stage.color }} /></div><span>{currency(value)}</span></div>;
      })}</div>}
    </section>
  </div>;
}
