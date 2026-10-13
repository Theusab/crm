"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SignUpPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function signUp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    const form = new FormData(event.currentTarget);
    const fullName = String(form.get("full_name")).trim();
    const email = String(form.get("email")).trim();
    const password = String(form.get("password"));
    const passwordConfirmation = String(form.get("password_confirmation"));
    if (password.length < 8) {
      setError("Use uma senha com pelo menos 8 caracteres.");
      return;
    }
    if (password !== passwordConfirmation) {
      setError("As senhas não correspondem.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    setLoading(false);
    if (authError) {
      setError(authError.message);
      return;
    }
    if (data.session) {
      router.replace("/dashboard");
      router.refresh();
      return;
    }
    setMessage("Conta criada. Confira seu e-mail para confirmar o endereço antes de entrar.");
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <Link className="brand auth-brand" href="/"><span className="brand-mark"><span /></span><span className="brand-name">blackcore<span>.</span></span></Link>
        <div className="auth-heading"><span>COMECE A ORGANIZAR SUAS VENDAS</span><h1>Criar sua conta</h1><p>Cadastre seu usuário para acessar o workspace BlackCore.</p></div>
        <form className="auth-form" onSubmit={signUp}>
          <label>Nome completo<input name="full_name" autoComplete="name" required maxLength={200} placeholder="Seu nome" /></label>
          <label>E-mail<input name="email" type="email" autoComplete="email" required placeholder="voce@empresa.com" /></label>
          <label>Senha<input name="password" type="password" autoComplete="new-password" minLength={8} required placeholder="Mínimo de 8 caracteres" /></label>
          <label>Confirmar senha<input name="password_confirmation" type="password" autoComplete="new-password" minLength={8} required placeholder="Digite a senha novamente" /></label>
          {error && <p className="form-error" role="alert">{error}</p>}
          {message && <p className="crm-success" role="status">{message}</p>}
          <button className="button button-primary" type="submit" disabled={loading}>{loading ? "Criando conta..." : "Criar conta"}</button>
        </form>
        <p className="auth-register-link">Já tem uma conta? <Link href="/login">Entrar</Link></p>
        <p className="auth-footnote">O acesso é protegido pelo Supabase Auth; novos perfis entram com o cargo definido pela regra do workspace.</p>
      </section>
    </main>
  );
}
