"use client";

import Link from "next/link";

export default function CrmError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const schemaError = error.message.includes("Could not find the table") || error.message.includes("schema cache");
  return <main className="crm-content"><section className="setup-card">
    <span className="setup-kicker">BLACKCORE CRM</span>
    <h1>{schemaError ? "Aplique as migrations do CRM" : "Não foi possível carregar esta tela"}</h1>
    <p>{schemaError ? "O Supabase está conectado, mas ainda não encontrou as tabelas do CRM. Execute as migrations da pasta supabase/migrations." : "Ocorreu um erro ao carregar os dados. Tente novamente; se continuar, confira o estado do Supabase."}</p>
    <div className="crm-actions"><button className="button button-secondary" onClick={reset}>Tentar novamente</button>{schemaError && <Link className="button button-primary" href="/setup?reason=schema">Ver instruções</Link>}</div>
  </section></main>;
}
