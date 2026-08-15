"use client";

import { useFormStatus } from "react-dom";

/**
 * Botão das ações da demonstração, com aviso de que está trabalhando.
 *
 * Existe porque montar o cenário leva vários segundos: são dezenas de
 * cadastros criados de uma vez. Sem sinal nenhum na tela, o visitante acha
 * que o clique não pegou e clica de novo — e aí espera o dobro.
 */
export function BotaoSubmitDemo({
  className,
  rotulo,
  rotuloOcupado,
  icone,
}: {
  className?: string;
  rotulo: string;
  rotuloOcupado: string;
  icone: React.ReactNode;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={`inline-flex items-center gap-2 rounded-lg text-sm font-semibold transition active:scale-[0.98] disabled:cursor-progress disabled:opacity-70 ${className ?? ""}`}
    >
      {icone}
      {pending ? rotuloOcupado : rotulo}
    </button>
  );
}
