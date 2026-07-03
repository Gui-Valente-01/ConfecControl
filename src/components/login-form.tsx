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
        <span className="text-sm font-medium text-[#405047]">E-mail</span>
        <div className="relative mt-1">
          <Mail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#63736b]" size={17} aria-hidden="true" />
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            className="h-11 w-full rounded-lg border border-[#c7d3ce] pl-10 pr-3 text-sm outline-none ring-[#087f7d]/20 transition focus:border-[#087f7d] focus:ring-4"
            placeholder="voce@suaempresa.com"
          />
        </div>
      </label>
      <label className="block">
        <span className="text-sm font-medium text-[#405047]">Senha</span>
        <div className="relative mt-1">
          <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#63736b]" size={17} aria-hidden="true" />
          <input
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="h-11 w-full rounded-lg border border-[#c7d3ce] pl-10 pr-3 text-sm outline-none ring-[#087f7d]/20 transition focus:border-[#087f7d] focus:ring-4"
            placeholder="********"
          />
        </div>
      </label>

      {state.error ? (
        <p className="rounded-lg bg-[#fff0f2] px-3 py-2 text-sm font-medium text-[#9f2f42]">{state.error}</p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="flex h-11 w-full items-center justify-center rounded-lg bg-[#087f7d] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#05605e] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Entrando..." : "Entrar no painel"}
      </button>
    </form>
  );
}
