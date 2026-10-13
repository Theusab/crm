"use client";

import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import { ArrowUp, Bot, RotateCcw, Sparkles, UserRound } from "lucide-react";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  sources?: string[];
  error?: boolean;
};

const suggestions = [
  { label: "Priorize meus leads", prompt: "Quais leads abertos devo priorizar agora e por quê?" },
  { label: "Resuma o funil", prompt: "Faça um resumo do meu funil e destaque os principais pontos de atenção." },
  { label: "Prepare um follow-up", prompt: "Crie uma mensagem curta de follow-up para um lead que ainda não respondeu. Mostre como rascunho." },
  { label: "Analise a base", prompt: "O que você consegue concluir sobre os leads mais recentes? Aponte oportunidades e lacunas." },
];

export function AssistantChat({ userName, configured }: { userName: string; configured: boolean }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const feedRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function sendMessage(text: string) {
    const content = text.trim();
    if (!content || loading || !configured) return;

    const nextMessages: ChatMessage[] = [...messages, { role: "user", content }];
    setMessages(nextMessages);
    setDraft("");
    setLoading(true);

    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages
            .filter((message) => !message.error)
            .slice(-8)
            .map(({ role, content: messageContent }) => ({ role, content: messageContent })),
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(typeof result.error === "string" ? result.error : "Não foi possível responder agora.");
      setMessages((current) => [...current, {
        role: "assistant",
        content: typeof result.answer === "string" ? result.answer : "Não consegui gerar uma resposta agora.",
        sources: Array.isArray(result.sources) ? result.sources.filter((source: unknown): source is string => typeof source === "string") : [],
      }]);
    } catch (error) {
      setMessages((current) => [...current, {
        role: "assistant",
        content: error instanceof Error ? error.message : "Não foi possível responder agora. Tente novamente.",
        error: true,
      }]);
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage(draft);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      formRef.current?.requestSubmit();
    }
  }

  return <section className="crm-assistant-panel" aria-label="Conversa com o assistente">
    <header className="crm-assistant-chat-head">
      <div className="crm-assistant-identity">
        <span className="crm-assistant-avatar"><Sparkles size={17} /></span>
        <span><strong>BlackCore Copilot</strong><small>Seu CRM, com inteligência extra</small></span>
      </div>
      <button className="crm-assistant-reset" type="button" onClick={() => setMessages([])} disabled={!messages.length || loading}>
        <RotateCcw size={14} /> Nova conversa
      </button>
    </header>

    <div className="crm-assistant-feed" ref={feedRef} aria-live="polite" aria-busy={loading}>
      {!messages.length ? <div className="crm-assistant-welcome">
        <span className="crm-assistant-welcome-icon"><Bot size={24} /></span>
        <h2>{userName ? `Olá, ${userName.split(" ")[0]}.` : "Olá, vamos trabalhar melhor."}</h2>
        <p>Pergunte sobre seus leads e o funil, peça uma análise ou prepare um rascunho para o próximo contato.</p>
        <div className="crm-assistant-suggestions">
          {suggestions.map(({ label, prompt }) => <button key={label} type="button" onClick={() => void sendMessage(prompt)} disabled={!configured || loading}>{label}<ArrowUp size={13} /></button>)}
        </div>
      </div> : <div className="crm-assistant-thread">
        {messages.map((message, index) => <article className={`crm-assistant-message ${message.role === "user" ? "is-user" : "is-assistant"} ${message.error ? "has-error" : ""}`} key={`${index}-${message.role}`}>
          <span className="crm-assistant-message-avatar">{message.role === "user" ? <UserRound size={15} /> : <Sparkles size={15} />}</span>
          <div className="crm-assistant-message-body">
            <strong>{message.role === "user" ? "Você" : "BlackCore Copilot"}</strong>
            <p>{message.content}</p>
            {Boolean(message.sources?.length) && <div className="crm-assistant-sources"><span>Base consultada</span>{message.sources?.map((source) => <span className="crm-assistant-source" key={source}>{source}</span>)}</div>}
          </div>
        </article>)}
        {loading && <article className="crm-assistant-message is-assistant" aria-label="Assistente está respondendo">
          <span className="crm-assistant-message-avatar"><Sparkles size={15} /></span>
          <div className="crm-assistant-message-body"><strong>BlackCore Copilot</strong><p className="crm-assistant-typing"><i /><i /><i /></p></div>
        </article>}
      </div>}
    </div>

    <form className="crm-assistant-composer" ref={formRef} onSubmit={handleSubmit}>
      <textarea value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={handleKeyDown} maxLength={3000} rows={2} placeholder={configured ? "Pergunte sobre o CRM ou peça uma sugestão…" : "Configure OPENAI_API_KEY para conversar com a IA"} disabled={!configured || loading} aria-label="Mensagem para o assistente" />
      <div className="crm-assistant-composer-bottom"><span>Enter envia · Shift + Enter quebra a linha</span><button className="crm-assistant-send" type="submit" disabled={!configured || loading || !draft.trim()} aria-label="Enviar mensagem"><ArrowUp size={17} /></button></div>
    </form>
  </section>;
}
