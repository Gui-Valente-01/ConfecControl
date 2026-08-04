"use client";

import { useEffect, useRef } from "react";
import type { FormState } from "@/lib/form-state";

/**
 * Leva a pessoa até o campo que deu erro.
 *
 * O aviso de erro aparece num toast no canto da tela e some em quatro
 * segundos. Num formulário de oito campos isso não diz onde está o problema:
 * a pessoa lê "Telefone inválido" e precisa caçar qual dos campos é.
 *
 * Quando a action devolve `field`, este hook acha o campo com aquele name
 * dentro do próprio formulário, rola até ele, coloca o cursor lá e marca como
 * inválido — a borda vermelha vem do CSS, por [aria-invalid="true"].
 *
 * Devolve a ref que deve ir no <form>. Sem `field`, não faz nada além de
 * limpar a marcação anterior, para o campo não ficar vermelho para sempre
 * depois de corrigido.
 */
export function useFieldError(state: FormState) {
  const formRef = useRef<HTMLFormElement>(null);
  const lastRef = useRef<FormState | null>(null);

  useEffect(() => {
    if (lastRef.current === state) return;
    lastRef.current = state;

    const form = formRef.current;
    if (!form) return;

    // Limpa o que foi marcado na tentativa anterior.
    for (const marcado of form.querySelectorAll("[data-cc-invalid]")) {
      marcado.removeAttribute("aria-invalid");
      marcado.removeAttribute("data-cc-invalid");
    }

    if (!state.error || !state.field) return;

    const campo = form.querySelector<HTMLElement>(`[name="${CSS.escape(state.field)}"]`);
    if (!campo) return;

    campo.setAttribute("aria-invalid", "true");
    campo.setAttribute("data-cc-invalid", "true");
    campo.scrollIntoView({ block: "center", behavior: "smooth" });
    // preventScroll porque o scrollIntoView acima já cuida disso, e com
    // rolagem suave: o foco sozinho daria um pulo seco.
    if (campo instanceof HTMLInputElement || campo instanceof HTMLSelectElement || campo instanceof HTMLTextAreaElement) {
      campo.focus({ preventScroll: true });
    }
  }, [state]);

  return formRef;
}
