"use client";

import { Building2, KeyRound, LockKeyhole, Mail, UserRound } from "lucide-react";
import { useActionState } from "react";
import { signupAction } from "@/app/cadastro/actions";
import { useFieldError } from "@/components/use-field-error";
import { emptyFormState } from "@/lib/form-state";

const wrapClass = "relative mt-1";
const inputClass = "h-11 w-full rounded-lg border border-[#c7d3ce] pl-10 pr-3 text-sm outline-none ring-[#087f7d]/20 transition focus:border-[#087f7d] focus:ring-4";
const iconClass = "pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#63736b]";

export function SignupForm() {
  const [state, formAction, pending] = useActionState(signupAction, emptyFormState);
  const formRef = useFieldError(state);

  return (
    <form ref={formRef} className="mt-6 space-y-4" action={formAction}>
      <label className="block">
        <span className="text-sm font-medium text-[#405047]">Token de acesso</span>
        <div className={wrapClass}>
          <KeyRound className={iconClass} size={17} aria-hidden="true" />
          <input
            name="accessCode"
            required
            inputMode="numeric"
            className={inputClass}
            placeholder="8 dígitos recebidos na contratação"
            autoComplete="one-time-code"
          />
        </div>
        <span className="mt-1 block text-xs text-[#8a9890]">Use a numeração que o administrador master gerou para você.</span>
      </label>
      <label className="block">
        <span className="text-sm font-medium text-[#405047]">Nome da empresa</span>
        <div className={wrapClass}>
          <Building2 className={iconClass} size={17} aria-hidden="true" />
          <input name="companyName" required className={inputClass} placeholder="Confecção Estrela" />
        </div>
      </label>
      <label className="block">
        <span className="text-sm font-medium text-[#405047]">Seu nome</span>
        <div className={wrapClass}>
          <UserRound className={iconClass} size={17} aria-hidden="true" />
          <input name="name" required className={inputClass} placeholder="Maria Souza" />
        </div>
      </label>
      <label className="block">
        <span className="text-sm font-medium text-[#405047]">E-mail</span>
        <div className={wrapClass}>
          <Mail className={iconClass} size={17} aria-hidden="true" />
          <input name="email" type="email" required autoComplete="email" className={inputClass} placeholder="você@empresa.com" />
        </div>
      </label>
      <label className="block">
        <span className="text-sm font-medium text-[#405047]">Senha</span>
        <div className={wrapClass}>
          <LockKeyhole className={iconClass} size={17} aria-hidden="true" />
          <input name="password" type="password" required minLength={6} autoComplete="new-password" className={inputClass} placeholder="mínimo 6 caracteres" />
        </div>
      </label>

      {state.error ? <p className="rounded-lg bg-[#fff0f2] px-3 py-2 text-sm font-medium text-[#9f2f42]">{state.error}</p> : null}

      <button
        type="submit"
        disabled={pending}
        className="flex h-11 w-full items-center justify-center rounded-lg bg-[#087f7d] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#05605e] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Criando..." : "Criar minha empresa"}
      </button>
    </form>
  );
}
