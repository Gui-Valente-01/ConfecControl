"use client";

import { LockKeyhole, Mail } from "lucide-react";
import { useActionState } from "react";
import { loginAction, type LoginState } from "@/app/login/actions";

const initialState: LoginState = {};

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <form className="mt-6 space-y-4" action={formAction}>
      <label className="block">
        <span className="text-sm font-medium text-[#544d43]">E-mail</span>
        <div className="relative mt-1">
          <Mail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#766d5d]" size={17} aria-hidden="true" />
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            className="h-11 w-full rounded-lg border border-[#d8cfbf] pl-10 pr-3 text-sm outline-none ring-[#0f8b8d]/20 focus:ring-4"
            placeholder="voce@suaempresa.com"
          />
        </div>
      </label>
      <label className="block">
        <span className="text-sm font-medium text-[#544d43]">Senha</span>
        <div className="relative mt-1">
          <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#766d5d]" size={17} aria-hidden="true" />
          <input
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="h-11 w-full rounded-lg border border-[#d8cfbf] pl-10 pr-3 text-sm outline-none ring-[#0f8b8d]/20 focus:ring-4"
            placeholder="********"
          />
        </div>
      </label>

      {state.error ? (
        <p className="rounded-lg bg-[#fdecef] px-3 py-2 text-sm font-medium text-[#b23647]">{state.error}</p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="flex h-11 w-full items-center justify-center rounded-lg bg-[#0f8b8d] px-4 text-sm font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Entrando..." : "Entrar no painel"}
      </button>
    </form>
  );
}
