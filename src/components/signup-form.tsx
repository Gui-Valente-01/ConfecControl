"use client";

import { Building2, LockKeyhole, Mail, UserRound } from "lucide-react";
import { useActionState } from "react";
import { signupAction } from "@/app/cadastro/actions";
import { emptyFormState } from "@/lib/form-state";

const wrapClass = "relative mt-1";
const inputClass = "h-11 w-full rounded-lg border border-[#d8cfbf] pl-10 pr-3 text-sm outline-none ring-[#0f8b8d]/20 focus:ring-4";
const iconClass = "pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#766d5d]";

export function SignupForm() {
  const [state, formAction, pending] = useActionState(signupAction, emptyFormState);

  return (
    <form className="mt-6 space-y-4" action={formAction}>
      <label className="block">
        <span className="text-sm font-medium text-[#544d43]">Nome da empresa</span>
        <div className={wrapClass}>
          <Building2 className={iconClass} size={17} aria-hidden="true" />
          <input name="companyName" required className={inputClass} placeholder="Confecção Estrela" />
        </div>
      </label>
      <label className="block">
        <span className="text-sm font-medium text-[#544d43]">Seu nome</span>
        <div className={wrapClass}>
          <UserRound className={iconClass} size={17} aria-hidden="true" />
          <input name="name" required className={inputClass} placeholder="Maria Souza" />
        </div>
      </label>
      <label className="block">
        <span className="text-sm font-medium text-[#544d43]">E-mail</span>
        <div className={wrapClass}>
          <Mail className={iconClass} size={17} aria-hidden="true" />
          <input name="email" type="email" required autoComplete="email" className={inputClass} placeholder="você@empresa.com" />
        </div>
      </label>
      <label className="block">
        <span className="text-sm font-medium text-[#544d43]">Senha</span>
        <div className={wrapClass}>
          <LockKeyhole className={iconClass} size={17} aria-hidden="true" />
          <input name="password" type="password" required minLength={6} autoComplete="new-password" className={inputClass} placeholder="mínimo 6 caracteres" />
        </div>
      </label>

      {state.error ? <p className="rounded-lg bg-[#fdecef] px-3 py-2 text-sm font-medium text-[#b23647]">{state.error}</p> : null}

      <button
        type="submit"
        disabled={pending}
        className="flex h-11 w-full items-center justify-center rounded-lg bg-[#0f8b8d] px-4 text-sm font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Criando..." : "Criar minha empresa"}
      </button>
    </form>
  );
}
