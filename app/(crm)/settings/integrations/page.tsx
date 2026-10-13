import { createAppClient, getAppIdentity } from "@/lib/supabase/app";

export default async function IntegrationsPage() {
  const supabase = await createAppClient();
  const identity = await getAppIdentity();
  const isAdmin = identity?.profile?.role === "admin";
  const integrations = [
    { name: "Entrada de leads (webhook)", description: "Recebe leads de formulários e automações com assinatura HMAC.", configured: Boolean(process.env.WEBHOOK_SECRET), note: "POST /api/webhooks/leads" },
    { name: "Pontuação de leads (OpenAI)", description: "Calcula score e motivo de qualificação dos novos leads.", configured: Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_MODEL), note: "Chaves configuradas apenas no servidor" },
    { name: "WhatsApp (Evolution API)", description: "Canal de mensagens para acompanhamento de leads.", configured: Boolean(process.env.EVOLUTION_API_URL && process.env.EVOLUTION_API_KEY && process.env.EVOLUTION_INSTANCE), note: "Configure as variáveis no servidor" },
    { name: "Reprocessamento (cron)", description: "Tarefas agendadas para reavaliar leads e follow-ups.", configured: Boolean(process.env.CRON_SECRET), note: "Proteja as rotas de cron com segredo" },
  ];
  const { data: events, error } = isAdmin ? await supabase.from("webhook_events").select("id,source,status,error,created_at").order("created_at", { ascending: false }).limit(10) : { data: null, error: null };
  if (error) throw new Error(`Falha ao carregar eventos de integração: ${error.message}`);

  return <div>
    <div className="crm-page-head"><div><div className="crm-eyebrow">GERENCIAMENTO</div><h1>Integrações</h1><p>Conexões disponíveis para este CRM. Segredos nunca são exibidos no painel.</p></div></div>
    <div className="crm-settings-grid">{integrations.map((item) => <section className="crm-setting" key={item.name}><div className="crm-integration-heading"><h2>{item.name}</h2><span className={`crm-status ${item.configured ? "crm-integrated" : "crm-not-integrated"}`}>{item.configured ? "Configurada" : "Pendente"}</span></div><p>{item.description}</p><code>{item.note}</code></section>)}</div>
    <section className="crm-panel"><div className="crm-panel-head"><div><h2>Eventos de webhook recentes</h2><p>{isAdmin ? "Últimas entregas registradas." : "Disponível somente para administradores."}</p></div></div>
      {!isAdmin ? <div className="crm-empty"><span>Você não tem permissão para visualizar eventos.</span></div> : !events?.length ? <div className="crm-empty"><span>Nenhum evento recebido ainda.</span></div> : <div className="crm-table-wrap"><table className="crm-table"><thead><tr><th>ORIGEM</th><th>STATUS</th><th>ERRO</th><th>RECEBIDO</th></tr></thead><tbody>{events.map((event) => <tr key={event.id}><td>{event.source}</td><td><span className="crm-status">{event.status}</span></td><td>{event.error || "—"}</td><td>{new Date(event.created_at).toLocaleString("pt-BR")}</td></tr>)}</tbody></table></div>}
    </section>
    {isAdmin && <p className="crm-note">Para enviar leads, gere uma assinatura HMAC SHA-256 com <code>WEBHOOK_SECRET</code> no sistema de origem e envie no cabeçalho <code>x-signature</code>.</p>}
  </div>;
}
