"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    const form = new FormData(event.currentTarget);
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: String(form.get("email")),
      password: String(form.get("password")),
    });
    setLoading(false);
    if (authError) {
      setError("Não foi possível entrar. Confira seu e-mail e senha.");
      return;
    }
    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <a className="brand auth-brand" href="/"><span className="brand-mark"><span /></span><span className="brand-name">blackcore<span>.</span></span></a>
        <div className="auth-heading"><span>SEU ESPAÇO DE VENDAS</span><h1>Bem-vindo de volta</h1><p>Entre para acessar seu CRM.</p></div>
        <form className="auth-form" onSubmit={signIn}>
          <label>E-mail<input name="email" type="email" autoComplete="email" required placeholder="voce@empresa.com" /></label>
          <label>Senha<input name="password" type="password" autoComplete="current-password" required placeholder="Sua senha" /></label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="button button-primary" type="submit" disabled={loading}>{loading ? "Entrando..." : "Entrar na minha conta"}</button>
        </form>
        <p className="auth-register-link">Primeira vez aqui? <Link href="/cadastro">Criar uma conta</Link></p>
        <p className="auth-footnote">Acesso protegido pela autenticação do Supabase.</p>
      </section>
    </main>
  );
}
