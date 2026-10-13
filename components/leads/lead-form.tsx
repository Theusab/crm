"use client";

import { useActionState } from "react";
import Link from "next/link";
import { createLead, updateLead, type LeadFormState } from "@/features/leads/actions";

type LeadRecord = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  job_title: string | null;
  source: string;
  value: number | null;
  tags: string[];
  next_follow_up_at: string | null;
};

function localDateTime(value: string) {
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);
}

export function LeadForm({ lead, basePath = "/leads" }: { lead?: LeadRecord; basePath?: "/leads" | "/contacts" }) {
  const action = lead ? updateLead : createLead;
  const [state, formAction, pending] = useActionState<LeadFormState, FormData>(action, {});

  return (
    <section className="crm-panel">
      <div className="crm-form">
        {state.error && <p className="crm-error" role="alert">{state.error}</p>}
        <form action={formAction} className="crm-form">
          {lead && <input type="hidden" name="id" value={lead.id} />}
          <label>Nome completo *<input name="name" required maxLength={200} defaultValue={lead?.name} placeholder="Ex.: Ana Souza" /></label>
          <div className="crm-form-grid">
            <label>E-mail<input name="email" type="email" maxLength={320} defaultValue={lead?.email ?? ""} placeholder="ana@empresa.com" /></label>
            <label>Telefone<input name="phone" maxLength={40} defaultValue={lead?.phone ?? ""} placeholder="+55 11 99999-9999" /></label>
          </div>
          <div className="crm-form-grid">
            <label>Empresa<input name="company" maxLength={200} defaultValue={lead?.company ?? ""} placeholder="Nome da empresa" /></label>
            <label>Cargo<input name="job_title" maxLength={200} defaultValue={lead?.job_title ?? ""} placeholder="Cargo do contato" /></label>
          </div>
          <div className="crm-form-grid">
            <label>Origem<input name="source" required maxLength={60} defaultValue={lead?.source ?? "manual"} placeholder="Ex.: site, indicação" /></label>
            <label>Valor estimado (R$)<input name="value" type="number" min="0" step="0.01" defaultValue={lead?.value ?? ""} placeholder="0,00" /></label>
          </div>
          <div className="crm-form-grid">
            <label>Próximo acompanhamento<input name="next_follow_up_at" type="datetime-local" defaultValue={lead?.next_follow_up_at ? localDateTime(lead.next_follow_up_at) : ""} /></label>
            <label>Tags<input name="tags" maxLength={800} defaultValue={lead?.tags?.join(", ") ?? ""} placeholder="Ex.: prioridade, inbound" /></label>
          </div>
          <span className="crm-note">É necessário informar pelo menos um e-mail ou telefone.</span>
          <div className="crm-actions"><Link className="button button-secondary" href={lead ? `${basePath}/${lead.id}` : "/leads"}>Cancelar</Link><button className="button button-primary" disabled={pending}>{pending ? "Salvando..." : lead ? "Salvar alterações" : "Criar lead"}</button></div>
        </form>
      </div>
    </section>
  );
}
