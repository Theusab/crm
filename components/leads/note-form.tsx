"use client";

import { useActionState } from "react";
import { addLeadNote, type LeadFormState } from "@/features/leads/actions";

export function NoteForm({ leadId }: { leadId: string }) {
  const [state, action, pending] = useActionState<LeadFormState, FormData>(addLeadNote, {});
  return <form action={action} className="crm-note-form">
    <input type="hidden" name="lead_id" value={leadId} />
    <label htmlFor="lead-activity-type">Registrar atividade</label>
    <select id="lead-activity-type" name="type" defaultValue="note">
      <option value="note">Nota</option>
      <option value="call">Ligação</option>
      <option value="email">E-mail</option>
      <option value="whatsapp_in">WhatsApp recebido</option>
      <option value="whatsapp_out">WhatsApp enviado</option>
    </select>
    <textarea id="lead-note" name="body" maxLength={4000} required placeholder="Registre um contato, uma observação ou o próximo passo..." />
    {state.error && <span className="crm-error" role="alert">{state.error}</span>}
    <button className="button button-primary" disabled={pending}>{pending ? "Salvando..." : "Salvar nota"}</button>
  </form>;
}
