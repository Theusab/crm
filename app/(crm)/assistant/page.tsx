import Link from "next/link";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { AssistantChat } from "@/components/assistant/assistant-chat";
import { getAppIdentity } from "@/lib/supabase/app";

export default async function AssistantPage() {
  const identity = await getAppIdentity();
  const configured = Boolean(process.env.OPENAI_API_KEY);

  return <div>
    <div className="crm-page-head">
      <div>
        <div className="crm-eyebrow">BLACKCORE COPILOT</div>
        <h1>Assistente IA</h1>
        <p>Um copiloto para entender seu funil, priorizar leads e preparar o próximo contato.</p>
      </div>
      <span className={`crm-assistant-status ${configured ? "is-ready" : "is-offline"}`}>
        <i />{configured ? "IA conectada" : "Configuração necessária"}
      </span>
    </div>

    {!configured && <section className="crm-assistant-setup">
      <div className="crm-assistant-setup-icon"><Sparkles size={18} /></div>
      <div><strong>Conecte a OpenAI para começar</strong><p>Adicione <code>OPENAI_API_KEY</code> ao arquivo de ambiente do servidor e reinicie o CRM.</p></div>
      <Link href="/settings/integrations">Ver integrações <ArrowUpRight size={14} /></Link>
    </section>}

    <AssistantChat userName={identity?.profile?.full_name || ""} configured={configured} />
    <p className="crm-assistant-privacy">O assistente consulta somente os registros que sua conta tem permissão para ver. Confirme os dados antes de tomar decisões.</p>
  </div>;
}
