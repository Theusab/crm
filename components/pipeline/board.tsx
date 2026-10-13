"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { moveLead } from "@/features/leads/actions";

type Stage = { id: string; name: string; color: string; slug: string };
type Lead = { id: string; name: string; company: string | null; value: number | null; stage_id: string; score: number | null; custom: Record<string, unknown> | null };
const money = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(value);

export function Board({ stages, leads }: { stages: Stage[]; leads: Lead[] }) {
  const [dragged, setDragged] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function drop(stageId: string) {
    if (!dragged || pending) return;
    const leadId = dragged;
    setDragged(null);
    setMessage("");
    startTransition(async () => {
      try {
        await moveLead(leadId, stageId);
        router.refresh();
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Falha ao mover o lead.");
      }
    });
  }

  return (
    <>
      {message && <p className="crm-error" role="alert">{message}</p>}
      <div className="crm-board">
        {stages.filter((stage) => !["ganho", "perdido"].includes(stage.slug)).map((stage) => {
          const cards = leads.filter((lead) => lead.stage_id === stage.id);
          const total = cards.reduce((sum, lead) => sum + Number(lead.value ?? 0), 0);
          return <section className="crm-column" key={stage.id} onDragOver={(event) => event.preventDefault()} onDrop={() => drop(stage.id)}>
            <h2><span style={{ color: stage.color }}>●</span> {stage.name} <span className="crm-status">{cards.length}</span></h2>
            <div className="crm-column-total">{money(total)}</div>
            <div className="crm-dropzone">
              {cards.map((lead) => <article className="crm-card" key={lead.id} draggable onDragStart={() => setDragged(lead.id)} onDragEnd={() => setDragged(null)}>
                <strong>{lead.name}</strong><span>{[lead.company && lead.company !== lead.name ? lead.company : null, lead.custom?.city, lead.custom?.specialty].filter(Boolean).join(" · ") || "Empresa não informada"}</span>
                <span className="crm-card-value">{money(Number(lead.value ?? 0))} {lead.score !== null && `· Score ${lead.score}`}</span>
              </article>)}
              {!cards.length && <span className="crm-note">Solte um lead nesta etapa</span>}
            </div>
          </section>;
        })}
      </div>
      {pending && <p className="crm-note">Atualizando funil...</p>}
    </>
  );
}
