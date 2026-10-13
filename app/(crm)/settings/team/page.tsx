import { inviteTeammate, updateTeammateRole } from "@/features/team/actions";
import { createAppClient, getAppIdentity } from "@/lib/supabase/app";

export default async function TeamPage() {
  const supabase = await createAppClient();
  const identity = await getAppIdentity();
  const [{ data: profiles, error }, { data: current }] = await Promise.all([
    supabase.from("profiles").select("id,full_name,role,is_active,created_at").order("created_at"),
    Promise.resolve({ data: identity?.profile ?? null }),
  ]);
  if (error) throw new Error(`Falha ao carregar a equipe: ${error.message}`);
  const isAdmin = current?.role === "admin";
  return <div>
    <div className="crm-page-head"><div><div className="crm-eyebrow">GERENCIAMENTO</div><h1>Minha equipe</h1><p>Usuários e permissões do seu workspace.</p></div></div>
    {isAdmin && <section className="crm-panel"><div className="crm-panel-head"><div><h2>Convidar pessoa</h2><p>O convite será enviado por e-mail. Novos integrantes entram com acesso de vendas.</p></div></div><form className="crm-form crm-invite-form" action={inviteTeammate}><div className="crm-form-grid"><label>Nome<input name="full_name" required maxLength={200} placeholder="Nome completo" /></label><label>E-mail<input name="email" type="email" required placeholder="pessoa@empresa.com" /></label></div><button className="button button-primary">Enviar convite</button></form></section>}
    {!isAdmin && <div className="crm-note">Apenas administradores podem convidar pessoas ou alterar cargos.</div>}
    <section className="crm-panel"><div className="crm-panel-head"><div><h2>Integrantes</h2><p>Usuários cadastrados no Supabase Auth.</p></div></div>
      {profiles?.length ? profiles.map((profile) => <article className="crm-team-row" key={profile.id}><span className="crm-user-avatar">{profile.full_name.slice(0,2).toUpperCase() || "U"}</span><span><strong>{profile.full_name || "Sem nome"}</strong><small>{profile.id === identity?.id ? "Você" : profile.id}</small></span><span className="crm-team-status">{profile.is_active ? "Ativo" : "Inativo"}</span>{isAdmin ? <form action={updateTeammateRole}><input type="hidden" name="id" value={profile.id} /><select name="role" defaultValue={profile.role}><option value="admin">Admin</option><option value="manager">Gerente</option><option value="sales">Vendas</option></select><button className="button button-secondary">Salvar cargo</button></form> : <span className="crm-status">{profile.role}</span>}</article>) : <div className="crm-empty"><span>Nenhum integrante cadastrado.</span></div>}
    </section>
  </div>;
}
