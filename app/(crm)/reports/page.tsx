import { createAppClient } from "@/lib/supabase/app";

const currency = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(value);
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const hasValidPhone = (value: unknown) => {
  const digits = String(value ?? "").replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 15;
};
const isUsableValue = (value: unknown) => {
  const normalized = String(value ?? "").trim();
  return normalized !== "" && !/^(?:-|n\/a|na|não localizado|nao localizado|não informado|nao informado)$/i.test(normalized);
};
const getCustomValue = (record: { custom: unknown }, key: string) => {
  const custom = record.custom && typeof record.custom === "object" && !Array.isArray(record.custom)
    ? record.custom as Record<string, unknown>
    : {};
  return custom[key];
};

function getBreakdown<T>(records: T[], getValue: (record: T) => unknown) {
  const counts = new Map<string, number>();
  for (const record of records) {
    const value = String(getValue(record) ?? "").trim();
    if (!isUsableValue(value)) continue;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "pt-BR"))
    .slice(0, 6);
}

export default async function ReportsPage() {
  const supabase = await createAppClient();
  const [
    { data: stages, error: stagesError },
    { data: leads, error: leadsError },
  ] = await Promise.all([
    supabase.from("pipeline_stages").select("id,name,color,probability,is_won,is_lost").order("position"),
    supabase.from("leads").select("id,stage_id,status,value,created_at,score,source,email,phone,custom").eq("custom->>record_type", "lead"),
  ]);
  if (stagesError || leadsError) {
    throw new Error(`Falha ao carregar relatórios: ${stagesError?.message ?? leadsError?.message}`);
  }
  const records = leads ?? [];
  const sourceLeads = records.filter((lead) => lead.source === "leadsBlackcore");
  const won = records.filter((lead) => lead.status === "won");
  const lost = records.filter((lead) => lead.status === "lost");
  const open = records.filter((lead) => lead.status === "open");
  const wonValue = won.reduce((sum, lead) => sum + Number(lead.value ?? 0), 0);
  const conversion = records.length ? Math.round(won.length / records.length * 100) : 0;
  const withEmail = sourceLeads.filter((lead) => emailPattern.test(String(lead.email || getCustomValue(lead, "source_email") || "").trim())).length;
  const withPhone = sourceLeads.filter((lead) => hasValidPhone(lead.phone)).length;
  const withContactChannel = sourceLeads.filter((lead) =>
    emailPattern.test(String(lead.email || getCustomValue(lead, "source_email") || "").trim()) ||
    hasValidPhone(lead.phone),
  ).length;
  const withWebsite = sourceLeads.filter((lead) =>
    isUsableValue(getCustomValue(lead, "website")) ||
    /^(?:sim|yes|true|1)$/i.test(String(getCustomValue(lead, "has_website") ?? "").trim()),
  ).length;
  const cities = getBreakdown(sourceLeads, (lead) => getCustomValue(lead, "city"));
  const specialties = getBreakdown(sourceLeads, (lead) => getCustomValue(lead, "specialty"));
  const leadStatuses = getBreakdown(sourceLeads, (lead) => getCustomValue(lead, "source_status"));
  const missingContactChannel = sourceLeads.length - withContactChannel;
  const highestCity = cities[0];
  const highestSpecialty = specialties[0];
  const reportBreakdown = (items: { label: string; count: number }[]) => items.length
    ? <div className="crm-stage-report">{items.map(({ label, count }) => <div className="crm-report-row" key={label}><span><i style={{ background: "#817de6" }} />{label}</span><strong>{count}</strong><div className="crm-report-track"><i style={{ width: `${sourceLeads.length ? Math.max(count / sourceLeads.length * 100, 2) : 0}%`, background: "#817de6" }} /></div><span>{sourceLeads.length ? Math.round(count / sourceLeads.length * 100) : 0}%</span></div>)}</div>
    : <div className="crm-empty"><span>Não há dados suficientes para esta análise.</span></div>;

  return <div>
    <div className="crm-page-head"><div><div className="crm-eyebrow">ANÁLISE</div><h1>Relatórios</h1><p>Visão dos leads importados e do desempenho comercial.</p></div></div>
    <section className="crm-panel">
      <div className="crm-panel-head"><div><h2>Análise dos leads da base BlackCore</h2><p>Indicadores dos {sourceLeads.length} leads importados para o CRM.</p></div><span className="crm-status">Base BlackCore</span></div>
      <div className="crm-metrics">
        <article className="crm-metric"><span>Total de leads</span><strong>{sourceLeads.length}</strong><small>Registros importados no CRM</small></article>
        <article className="crm-metric"><span>Com telefone válido</span><strong>{withPhone}</strong><small>{sourceLeads.length ? Math.round(withPhone / sourceLeads.length * 100) : 0}% da base · 10 a 15 dígitos</small></article>
        <article className="crm-metric"><span>Com e-mail válido</span><strong>{withEmail}</strong><small>{sourceLeads.length ? Math.round(withEmail / sourceLeads.length * 100) : 0}% da base</small></article>
        <article className="crm-metric"><span>Com site</span><strong>{withWebsite}</strong><small>{sourceLeads.length ? Math.round(withWebsite / sourceLeads.length * 100) : 0}% da base</small></article>
      </div>
      <div className="crm-panel-head"><div><h2>Leitura inicial</h2><p>Sinais para orientar as próximas ações de prospecção.</p></div></div>
      <div className="crm-stage-report">
        <div className="crm-report-row"><span><i style={{ background: "#5c9a73" }} />Com ao menos um canal válido</span><strong>{withContactChannel}</strong><div className="crm-report-track"><i style={{ width: `${sourceLeads.length ? Math.max(withContactChannel / sourceLeads.length * 100, 2) : 0}%`, background: "#5c9a73" }} /></div><span>{sourceLeads.length ? Math.round(withContactChannel / sourceLeads.length * 100) : 0}%</span></div>
        <div className="crm-report-row"><span><i style={{ background: "#d39a54" }} />Sem canal válido para contato</span><strong>{missingContactChannel}</strong><div className="crm-report-track"><i style={{ width: `${sourceLeads.length ? Math.max(missingContactChannel / sourceLeads.length * 100, 2) : 0}%`, background: "#d39a54" }} /></div><span>{sourceLeads.length ? Math.round(missingContactChannel / sourceLeads.length * 100) : 0}%</span></div>
      </div>
      <div className="crm-panel-head"><div><h2>Concentração da base</h2><p>{highestCity ? `Maior concentração: ${highestCity.label} (${highestCity.count}).` : "Cidade não informada nos leads."} {highestSpecialty ? `Especialidade mais frequente: ${highestSpecialty.label} (${highestSpecialty.count}).` : "Especialidade não informada."}</p></div></div>
    </section>
    <div className="crm-settings-grid">
      <section className="crm-panel"><div className="crm-panel-head"><div><h2>Principais cidades</h2><p>Até seis cidades com mais leads.</p></div></div>{reportBreakdown(cities)}</section>
      <section className="crm-panel"><div className="crm-panel-head"><div><h2>Especialidades</h2><p>Até seis áreas mais representadas.</p></div></div>{reportBreakdown(specialties)}</section>
    </div>
    {leadStatuses.length > 0 && <section className="crm-panel"><div className="crm-panel-head"><div><h2>Status de origem dos leads</h2><p>Distribuição conforme os valores cadastrados na base de origem.</p></div></div>{reportBreakdown(leadStatuses)}</section>}
    <div className="crm-page-head"><div><div className="crm-eyebrow">PIPELINE</div><h2>Desempenho comercial</h2><p>Resumo dos leads cadastrados diretamente no funil do CRM.</p></div></div>
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
