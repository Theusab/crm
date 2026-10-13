import { CircleAlert } from "lucide-react";

export default async function SetupPage({ searchParams }: { searchParams: Promise<{ reason?: string }> }) {
  const { reason } = await searchParams;
  if (reason === "schema") {
    return <main className="setup-page"><section className="setup-card"><div className="setup-alert"><CircleAlert size={19} /></div><span className="setup-kicker">BLACKCORE CRM</span><h1>Aplique as migrations do CRM</h1><p>As chaves do Supabase estão carregadas, mas as tabelas do CRM ainda não existem no projeto conectado.</p><ol><li>Abra o SQL Editor do projeto Supabase e execute a migration <code>supabase/migrations/0001_init.sql</code>.</li><li>Execute também <code>supabase/migrations/0002_backfill_existing_profiles.sql</code> para vincular contas já cadastradas.</li><li>Recarregue esta página após as migrations terminarem.</li></ol><p className="setup-warning">A migration 0001 cria as tabelas, regras RLS, o primeiro administrador e as etapas padrão do funil.</p></section></main>;
  }
  return (
    <main className="setup-page">
      <section className="setup-card">
        <div className="setup-alert"><CircleAlert size={19} /></div>
        <span className="setup-kicker">BLACKCORE CRM</span>
        <h1>Conecte seu projeto Supabase</h1>
        <p>O painel está pronto, mas ainda não encontrou as variáveis de conexão neste ambiente. Nenhum lead demonstrativo será exibido.</p>
        <ol>
          <li>Crie ou abra o arquivo <code>.env.local</code> na raiz do projeto.</li>
          <li>Preencha as variáveis abaixo com as chaves do seu projeto Supabase.</li>
          <li>Reinicie o servidor de desenvolvimento.</li>
        </ol>
        <pre>{`NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sua-chave-publica
SUPABASE_SECRET_KEY=sua-chave-secreta
WEBHOOK_SECRET=gere-um-segredo-forte`}</pre>
        <p className="setup-warning">Mantenha a chave secreta apenas em variáveis do servidor. Nunca use o prefixo NEXT_PUBLIC_ nela.</p>
        <p className="setup-note">Depois de salvar o arquivo, reinicie o servidor e recarregue esta página para entrar.</p>
      </section>
    </main>
  );
}
