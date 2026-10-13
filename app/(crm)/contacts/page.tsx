import Link from "next/link";
import { Search } from "lucide-react";
import { createAppClient } from "@/lib/supabase/app";

export default async function ContactsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const params = await searchParams;
  const supabase = await createAppClient();
  const { data: contacts, error } = await supabase
    .from("leads")
    .select("id,name,email,phone,company,source,created_at,custom")
    .eq("custom->>record_type", "contact")
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw new Error(`Falha ao carregar contatos: ${error.message}`);

  const term = params.q?.trim().toLowerCase() ?? "";
  const rows = (contacts ?? []).filter((contact) => {
    const custom = contact.custom && typeof contact.custom === "object" ? contact.custom : {};
    return !term || [contact.name, contact.email, custom.source_email, contact.phone, contact.company, contact.source, custom.city]
      .some((value) => String(value ?? "").toLowerCase().includes(term));
  });

  return <div>
    <div className="crm-page-head"><div><div className="crm-eyebrow">RELACIONAMENTO</div><h1>Contatos</h1><p>Registros de contato anteriores à migração, separados dos leads ativos do funil.</p></div></div>
    <section className="crm-panel">
      <form className="crm-toolbar" method="get">
        <label className="crm-search"><Search size={15} /><input name="q" defaultValue={params.q} placeholder="Buscar por nome, empresa, e-mail ou telefone" /></label>
        <button className="button button-secondary">Buscar</button>
      </form>
      {rows.length === 0 ? <div className="crm-empty"><strong>{contacts?.length ? "Nenhum contato corresponde à busca" : "Ainda não há contatos"}</strong><span>{contacts?.length ? "Altere o termo de busca." : "Os registros de contato anteriores aparecerão aqui."}</span></div> : <div className="crm-table-wrap"><table className="crm-table"><thead><tr><th>CONTATO</th><th>EMPRESA</th><th>E-MAIL</th><th>TELEFONE</th><th>ORIGEM</th><th>DATA</th></tr></thead><tbody>{rows.map((contact) => {
        const custom = contact.custom && typeof contact.custom === "object" ? contact.custom : {};
        const email = contact.email || custom.source_email;
        return <tr key={contact.id}><td><Link href={`/contacts/${contact.id}`}>{contact.name}</Link></td><td>{contact.company || "—"}</td><td>{email || "—"}</td><td>{contact.phone || "—"}</td><td>{contact.source}</td><td>{new Date(contact.created_at).toLocaleDateString("pt-BR")}</td></tr>;
      })}</tbody></table></div>}
    </section>
  </div>;
}
