"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

export type WhatsAppConversation = {
  lead: { id: string; name: string; phone: string | null; company: string | null };
  messages: {
    id: string;
    direction: "incoming" | "outgoing";
    title: string;
    body: string | null;
    createdAt: string;
  }[];
  lastMessageAt: string;
};

function formatDate(value: string, includeDate = false) {
  return new Date(value).toLocaleString("pt-BR", includeDate
    ? { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }
    : { hour: "2-digit", minute: "2-digit" });
}

export function ConversationInbox({ conversations }: { conversations: WhatsAppConversation[] }) {
  const [search, setSearch] = useState("");
  const [selectedLeadId, setSelectedLeadId] = useState(conversations[0]?.lead.id ?? "");
  const messageListRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("pt-BR");
    if (!query) return conversations;
    return conversations.filter(({ lead }) =>
      [lead.name, lead.phone, lead.company].some((value) => value?.toLocaleLowerCase("pt-BR").includes(query)),
    );
  }, [conversations, search]);

  const selected = filtered.find(({ lead }) => lead.id === selectedLeadId) ?? filtered[0];
  useEffect(() => {
    if (selected) setSelectedLeadId(selected.lead.id);
  }, [selected]);
  useEffect(() => {
    if (messageListRef.current) messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
  }, [selected?.lead.id, selected?.messages.length]);

  if (!conversations.length) {
    return <section className="crm-panel crm-empty crm-conversations-empty">
      <strong>Nenhuma conversa de WhatsApp ainda</strong>
      <span>Quando um cliente enviar uma mensagem, o histórico aparecerá aqui.</span>
      <Link className="text-link" href="/settings/integrations">Configurar integração</Link>
    </section>;
  }

  return <section className="crm-panel crm-conversations">
    <aside className="crm-conversation-sidebar">
      <div className="crm-conversation-search">
        <input aria-label="Buscar conversa" placeholder="Buscar nome ou telefone..." value={search} onChange={(event) => setSearch(event.target.value)} />
      </div>
      <div className="crm-conversation-items">
        {!filtered.length ? <div className="crm-empty"><span>Nenhuma conversa encontrada.</span></div> : filtered.map((conversation) => {
          const latest = conversation.messages[0];
          return <button
            aria-pressed={selected?.lead.id === conversation.lead.id}
            className={`crm-conversation-item ${selected?.lead.id === conversation.lead.id ? "is-selected" : ""}`}
            key={conversation.lead.id}
            onClick={() => setSelectedLeadId(conversation.lead.id)}
            type="button"
          >
            <span className="crm-conversation-avatar">{conversation.lead.name.slice(0, 2).toUpperCase()}</span>
            <span className="crm-conversation-preview">
              <strong>{conversation.lead.name}</strong>
              <span>{latest?.direction === "outgoing" ? "Você: " : ""}{latest?.body || latest?.title}</span>
            </span>
            <time>{formatDate(conversation.lastMessageAt)}</time>
          </button>;
        })}
      </div>
    </aside>
    {selected ? <div className="crm-conversation-thread">
      <header className="crm-conversation-header">
        <span className="crm-conversation-avatar">{selected.lead.name.slice(0, 2).toUpperCase()}</span>
        <span><strong>{selected.lead.name}</strong><small>{selected.lead.phone || selected.lead.company || "Contato"}</small></span>
        <Link href={`/leads/${selected.lead.id}`}>Ver lead</Link>
      </header>
      <div className="crm-conversation-messages" ref={messageListRef}>
        {[...selected.messages].reverse().map((message) => <article className={`crm-message ${message.direction}`} key={message.id}>
          <p>{message.body || message.title}</p>
          <time>{message.direction === "outgoing" ? "CRM" : selected.lead.name} · {formatDate(message.createdAt, true)}</time>
        </article>)}
      </div>
      <footer className="crm-conversation-footer">As respostas automáticas da IA aparecem neste histórico quando enviadas pelo WhatsApp.</footer>
    </div> : <div className="crm-empty crm-conversation-no-selection"><span>Nenhuma conversa corresponde à busca.</span></div>}
  </section>;
}
