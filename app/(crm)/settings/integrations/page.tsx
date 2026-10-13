import { createAppClient, getAppIdentity } from "@/lib/supabase/app";
import { isEvolutionConfigured } from "@/lib/integrations/evolution";
import { saveWhatsappAutomation } from "@/features/settings/actions";
import { saveWhatsappAssistant } from "@/features/knowledge/actions";

type WhatsappAutomationSetting = {
  enabled?: boolean;
  message_template?: string;
};

export default async function IntegrationsPage({
  searchParams,
}: {
  searchParams: Promise<{ assistant?: string; whatsapp?: string }>;
}) {
  const supabase = await createAppClient();
  const identity = await getAppIdentity();
  const isAdmin = identity?.profile?.role === "admin";
  const [{ data: settings, error: settingsError }, params] = await Promise.all([
    isAdmin
      ? supabase.from("crm_settings").select("key,value").in("key", ["whatsapp_qualified_lead", "whatsapp_ai_assistant"])
      : Promise.resolve({ data: [], error: null }),
    searchParams,
  ]);
  if (settingsError) throw new Error(`Falha ao carregar as automações do WhatsApp: ${settingsError.message}`);
  const automation = (settings ?? []).find((item) => item.key === "whatsapp_qualified_lead")?.value as WhatsappAutomationSetting | undefined;
  const assistant = (settings ?? []).find((item) => item.key === "whatsapp_ai_assistant")?.value as { enabled?: boolean } | undefined;
  const evolutionConfigured = isEvolutionConfigured();
  const integrations = [
    { name: "Entrada de leads (webhook)", description: "Recebe leads de formulários e automações com assinatura HMAC.", configured: Boolean(process.env.WEBHOOK_SECRET), note: "POST /api/webhooks/leads" },
    { name: "Pontuação de leads (OpenAI)", description: "Calcula score e motivo de qualificação dos novos leads.", configured: Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_MODEL), note: "Chaves configuradas apenas no servidor" },
    { name: "WhatsApp (Evolution API)", description: "Canal de mensagens para acompanhamento de leads.", configured: evolutionConfigured, note: "Configure as variáveis no servidor" },
    { name: "Reprocessamento (cron)", description: "Tarefas agendadas para reavaliar leads e follow-ups.", configured: Boolean(process.env.CRON_SECRET), note: "Proteja as rotas de cron com segredo" },
  ];
  const { data: events, error } = isAdmin ? await supabase.from("webhook_events").select("id,source,status,error,created_at").order("created_at", { ascending: false }).limit(10) : { data: null, error: null };
  if (error) throw new Error(`Falha ao carregar eventos de integração: ${error.message}`);

  return <div>
    <div className="crm-page-head"><div><div className="crm-eyebrow">GERENCIAMENTO</div><h1>Integrações</h1><p>Conexões disponíveis para este CRM. Segredos nunca são exibidos no painel.</p></div></div>
    <div className="crm-settings-grid">{integrations.map((item) => <section className="crm-setting" key={item.name}><div className="crm-integration-heading"><h2>{item.name}</h2><span className={`crm-status ${item.configured ? "crm-integrated" : "crm-not-integrated"}`}>{item.configured ? "Configurada" : "Pendente"}</span></div><p>{item.description}</p><code>{item.note}</code></section>)}</div>
    <section className="crm-panel">
      <div className="crm-panel-head"><div><h2>Mensagem automática para leads qualificados</h2><p>Enviada uma vez quando a pontuação da IA atingir 70 ou mais.</p></div></div>
      {isAdmin ? <form className="crm-form" action={saveWhatsappAutomation}>
        {params.whatsapp === "saved" && <p className="crm-success" role="status">Configuração salva.</p>}
        <label htmlFor="whatsapp-message-template">Texto da mensagem</label>
        <textarea id="whatsapp-message-template" name="message_template" maxLength={1000} rows={5} defaultValue={automation?.message_template ?? ""} placeholder="Escreva a mensagem que será enviada. Use {nome} para inserir o nome do lead." />
        <p className="crm-note">Variável disponível: <code>{"{nome}"}</code>. A mensagem não será enviada se o texto estiver vazio ou se a integração Evolution estiver pendente.</p>
        <label className="crm-automation-toggle"><input type="checkbox" name="enabled" defaultChecked={automation?.enabled === true} /> Ativar envio automático</label>
        <button className="button button-primary">Salvar automação</button>
      </form> : <div className="crm-empty"><span>Somente administradores podem configurar a mensagem automática.</span></div>}
    </section>
    <section className="crm-panel">
      <div className="crm-panel-head"><div><h2>Atendimento por IA no WhatsApp</h2><p>Responde somente quando encontra informações relevantes nos documentos da base de conhecimento.</p></div><span className={`crm-status ${assistant?.enabled ? "crm-integrated" : "crm-not-integrated"}`}>{assistant?.enabled ? "Ativo" : "Desativado"}</span></div>
      {isAdmin ? <form className="crm-form" action={saveWhatsappAssistant}>
        {params.assistant === "saved" && <p className="crm-success" role="status">Configuração do atendimento salva.</p>}
        <p className="crm-note">Importe documentos em <a href="/settings/knowledge">Base de conhecimento</a>. Se a IA não encontrar respaldo, ela não enviará resposta.</p>
        <p className="crm-note">Configure no servidor a variável <code>WHATSAPP_WEBHOOK_SECRET</code> e a Evolution para enviar eventos a <code>/api/webhooks/evolution</code> com o cabeçalho <code>x-webhook-secret</code>.</p>
        <label className="crm-automation-toggle"><input type="checkbox" name="enabled" defaultChecked={assistant?.enabled === true} /> Ativar respostas automáticas</label>
        <button className="button button-primary">Salvar atendimento</button>
      </form> : <div className="crm-empty"><span>Somente administradores podem configurar o atendimento automático.</span></div>}
    </section>
    <section className="crm-panel"><div className="crm-panel-head"><div><h2>Eventos de webhook recentes</h2><p>{isAdmin ? "Últimas entregas registradas." : "Disponível somente para administradores."}</p></div></div>
      {!isAdmin ? <div className="crm-empty"><span>Você não tem permissão para visualizar eventos.</span></div> : !events?.length ? <div className="crm-empty"><span>Nenhum evento recebido ainda.</span></div> : <div className="crm-table-wrap"><table className="crm-table"><thead><tr><th>ORIGEM</th><th>STATUS</th><th>ERRO</th><th>RECEBIDO</th></tr></thead><tbody>{events.map((event) => <tr key={event.id}><td>{event.source}</td><td><span className="crm-status">{event.status}</span></td><td>{event.error || "—"}</td><td>{new Date(event.created_at).toLocaleString("pt-BR")}</td></tr>)}</tbody></table></div>}
    </section>
    {isAdmin && <p className="crm-note">Para enviar leads, gere uma assinatura HMAC SHA-256 com <code>WEBHOOK_SECRET</code> no sistema de origem e envie no cabeçalho <code>x-signature</code>. Segredos do WhatsApp também permanecem no servidor.</p>}
  </div>;
}
