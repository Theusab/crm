export default function AccountDisabledPage() {
  return <main className="auth-page"><section className="auth-card"><span className="setup-kicker">BLACKCORE CRM</span><h1>Acesso indisponível</h1><p className="auth-heading">Sua conta não tem um perfil ativo neste workspace. Peça a um administrador para ativá-la ou confira se a migration inicial foi aplicada.</p><form action="/auth/signout" method="post"><button className="button button-secondary">Sair e trocar de conta</button></form></section></main>;
}
