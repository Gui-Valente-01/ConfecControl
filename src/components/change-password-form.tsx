"use client";

import { KeyRound } from "lucide-react";
import { useActionState } from "react";
import { changePasswordAction } from "@/app/conta/actions";
import { SubmitButton } from "@/components/submit-button";
import { useActionFeedback } from "@/components/toast";
import { emptyFormState } from "@/lib/form-state";

const fieldClass =
  "mt-1 h-10 w-full rounded-lg border border-[#c7d3ce] px-3 text-sm outline-none ring-[#087f7d]/20 transition focus:border-[#087f7d] focus:ring-4";

export function ChangePasswordForm() {
  const [state, formAction] = useActionState(changePasswordAction, emptyFormState);
  useActionFeedback(state);

  return (
    <form className="space-y-3" action={formAction}>
      <label className="block">
        <span className="text-sm font-medium text-[#405047]">Senha atual</span>
        <input name="current" type="password" required autoComplete="current-password" className={fieldClass} />
      </label>
      <label className="block">
        <span className="text-sm font-medium text-[#405047]">Nova senha</span>
        <input name="next" type="password" required minLength={6} autoComplete="new-password" className={fieldClass} placeholder="mínimo 6 caracteres" />
      </label>
      <label className="block">
        <span className="text-sm font-medium text-[#405047]">Confirmar nova senha</span>
        <input name="confirm" type="password" required minLength={6} autoComplete="new-password" className={fieldClass} />
      </label>
      {state.error ? <p className="rounded-lg bg-[#fff0f2] px-3 py-2 text-sm font-medium text-[#9f2f42]">{state.error}</p> : null}
      <SubmitButton>
        <KeyRound size={16} aria-hidden="true" />
        Alterar senha
      </SubmitButton>
    </form>
  );
}
