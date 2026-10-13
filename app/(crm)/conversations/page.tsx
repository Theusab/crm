import { ConversationInbox, type WhatsAppConversation } from "@/components/whatsapp/conversation-inbox";
import { createAppClient } from "@/lib/supabase/app";

export default async function ConversationsPage() {
  const supabase = await createAppClient();
  const { data: activities, error: activitiesError } = await supabase
    .from("activities")
    .select("id,lead_id,type,title,body,created_at")
    .in("type", ["whatsapp_in", "whatsapp_out"])
    .order("created_at", { ascending: false })
    .limit(1000);
  if (activitiesError) throw new Error(`Falha ao carregar mensagens: ${activitiesError.message}`);

  const leadIds = [...new Set((activities ?? []).map((activity) => activity.lead_id))];
  const { data: leads, error: leadsError } = leadIds.length
    ? await supabase.from("leads").select("id,name,phone,company").eq("custom->>record_type", "lead").in("id", leadIds)
    : { data: [], error: null };
  if (leadsError) throw new Error(`Falha ao carregar contatos das conversas: ${leadsError.message}`);

  const leadById = new Map((leads ?? []).map((lead) => [lead.id, lead]));
  const conversations = new Map<string, WhatsAppConversation>();
  for (const activity of activities ?? []) {
    const lead = leadById.get(activity.lead_id);
    if (!lead) continue;
    const conversation: WhatsAppConversation = conversations.get(lead.id) ?? {
      lead,
      messages: [],
      lastMessageAt: activity.created_at,
    };
    conversation.messages.push({
      id: activity.id,
      direction: activity.type === "whatsapp_out" ? "outgoing" : "incoming",
      title: activity.title,
      body: activity.body,
      createdAt: activity.created_at,
    });
    conversations.set(lead.id, conversation);
  }

  return <div>
    <div className="crm-page-head"><div><div className="crm-eyebrow">ATENDIMENTO</div><h1>Conversas</h1><p>Histórico de mensagens recebidas e respostas enviadas pelo CRM no WhatsApp.</p></div></div>
    <ConversationInbox conversations={[...conversations.values()]} />
  </div>;
}
