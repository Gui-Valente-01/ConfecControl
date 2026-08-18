"use client";

import { LockKeyhole, LogIn, Mail } from "lucide-react";
import { useActionState } from "react";
import { portalActivateAction, portalLoginAction } from "@/app/portal/entrar/actions";
import { emptyFormState } from "@/lib/form-state";

const wrap = "relative mt-1";
const input =
  "h-11 w-full rounded-lg border border-line-strong bg-surface pl-10 pr-3 text-sm outline-none ring-primary/20 transition focus:border-primary focus:ring-4";
const icon = "pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted";
const button =
  "flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60";

// Primeiro acesso: veio pelo link de convite (token) e define a senha.
export function PortalActivateForm({ token, companyName }: { token: string; companyName: string }) {
  const [state, formAction, pending] = useActionState(portalActivateAction, emptyFormState);

  return (
    <form action={formAction} className="mt-6 space-y-4">
      <input type="hidden" name="token" value={token} />
      <p className="rounded-lg bg-primary-soft px-3 py-2.5 text-sm leading-6 text-primary-dark">
        Você foi convidado por <strong>{companyName}</strong>. Crie uma senha para acompanhar seus pedidos.
      </p>
      <label className="block">
        <span className="text-sm font-medium text-body">Criar senha</span>
        <div className={wrap}>
          <LockKeyhole className={icon} size={17} aria-hidden="true" />
          <input name="password" type="password" required minLength={10} autoComplete="new-password" className={input} placeholder="mínimo 10 caracteres" />
        </div>
      </label>
      <label className="block">
        <span className="text-sm font-medium text-body">Confirmar senha</span>
        <div className={wrap}>
          <LockKeyhole className={icon} size={17} aria-hidden="true" />
          <input name="confirm" type="password" required minLength={10} autoComplete="new-password" className={input} placeholder="repita a senha" />
        </div>
      </label>
      {state.error ? <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm font-medium text-danger-dark">{state.error}</p> : null}
      <button type="submit" disabled={pending} className={button}>
        {pending ? "Entrando..." : "Criar senha e entrar"}
      </button>
    </form>
  );
}

// Acessos seguintes: e-mail + senha.
export function PortalLoginForm() {
  const [state, formAction, pending] = useActionState(portalLoginAction, emptyFormState);

  return (
    <form action={formAction} className="mt-6 space-y-4">
      <label className="block">
        <span className="text-sm font-medium text-body">E-mail</span>
        <div className={wrap}>
          <Mail className={icon} size={17} aria-hidden="true" />
          <input name="email" type="email" required autoComplete="email" className={input} placeholder="seu@email.com" />
        </div>
      </label>
      <label className="block">
        <span className="text-sm font-medium text-body">Senha</span>
        <div className={wrap}>
          <LockKeyhole className={icon} size={17} aria-hidden="true" />
          <input name="password" type="password" required autoComplete="current-password" className={input} placeholder="sua senha" />
        </div>
      </label>
      {state.error ? <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm font-medium text-danger-dark">{state.error}</p> : null}
      <button type="submit" disabled={pending} className={button}>
        <LogIn size={17} aria-hidden="true" />
        {pending ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}
