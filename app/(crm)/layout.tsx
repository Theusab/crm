import Link from "next/link";
import { redirect } from "next/navigation";
import {
  BarChart3,
  Bell,
  ChevronDown,
  CircleHelp,
  Contact,
  LayoutDashboard,
  LogOut,
  MessageCircle,
  Settings,
  Sparkles,
  Target,
  Users,
  UserPlus,
} from "lucide-react";
import { getAppIdentity, isLocalAuthBypass, SupabaseSchemaMissingError } from "@/lib/supabase/app";
import "./crm.css";

const links = [
  { href: "/dashboard", label: "Visão geral", icon: LayoutDashboard },
  { href: "/leads", label: "Leads", icon: Users },
  { href: "/contacts", label: "Contatos", icon: Contact },
  { href: "/conversations", label: "Conversas", icon: MessageCircle },
  { href: "/assistant", label: "Assistente IA", icon: Sparkles },
  { href: "/pipeline", label: "Funil de vendas", icon: Target },
  { href: "/reports", label: "Relatórios", icon: BarChart3 },
];

export default async function CrmLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const localBypass = await isLocalAuthBypass();
  let identity;
  try {
    identity = await getAppIdentity();
  } catch (error) {
    if (error instanceof SupabaseSchemaMissingError) redirect("/setup?reason=schema");
    throw error;
  }
  if (!identity) redirect(localBypass ? "/account-disabled" : "/login");
  const profile = identity.profile;
  if (!profile || !profile.is_active) redirect("/account-disabled");

  const name = profile.full_name || identity.email?.split("@")[0] || "Usuário";
  const role = profile.role === "admin" ? "Administrador" : profile.role === "manager" ? "Gerente" : "Vendas";

  return (
    <main className="crm-shell">
      <aside className="crm-sidebar">
        <Link className="crm-brand" href="/dashboard"><span className="crm-brand-mark">B</span><span>blackcore<span>.</span></span></Link>
        <button className="crm-workspace"><span className="crm-workspace-icon">B</span><span><strong>BlackCore Studio</strong><small>CRM de vendas</small></span><ChevronDown size={15} /></button>
        <span className="crm-nav-caption">WORKSPACE</span>
        <nav className="crm-nav" aria-label="Navegação principal">
          {links.map(({ href, label, icon: Icon }) => <Link key={href} href={href}><Icon size={17} />{label}</Link>)}
        </nav>
        <span className="crm-nav-caption crm-nav-spaced">GERENCIAR</span>
        <nav className="crm-nav" aria-label="Gerenciamento">
          <Link href="/settings/team"><Users size={17} />Equipe</Link>
          <Link href="/settings/pipeline"><Target size={17} />Etapas do funil</Link>
          <Link href="/settings/knowledge"><MessageCircle size={17} />Base de conhecimento</Link>
          <Link href="/settings/integrations"><Settings size={17} />Integrações</Link>
          {localBypass && <Link href="/cadastro"><UserPlus size={17} />Cadastrar usuário</Link>}
        </nav>
        <div className="crm-sidebar-bottom">
          <Link className="crm-help" href="/settings/integrations"><CircleHelp size={16} />Ajuda e integrações</Link>
          <div className="crm-profile"><span className="crm-user-avatar">{name.slice(0, 2).toUpperCase()}</span><span><strong>{name}</strong><small>{role}</small></span>
            {localBypass ? <span className="crm-local-badge">Acesso local</span> : <form action="/auth/signout" method="post"><button aria-label="Sair da conta" title="Sair"><LogOut size={16} /></button></form>}
          </div>
        </div>
      </aside>
      <section className="crm-main">
        <header className="crm-topbar"><span className="crm-crumb">Workspace <span>/</span> BlackCore CRM</span><div><span className="crm-live"><i />Banco conectado</span><Bell size={17} className="crm-bell" /><span className="crm-user-avatar crm-user-avatar-small">{name.slice(0, 2).toUpperCase()}</span></div></header>
        <div className="crm-content">{children}</div>
      </section>
    </main>
  );
}
