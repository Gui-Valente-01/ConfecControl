"use client";

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

function novaChave(): string {
  // randomUUID existe em todo navegador atual; o fallback cobre contexto sem
  // crypto (navegador antigo, http sem TLS) para o formulário não quebrar.
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/**
 * Campo escondido que identifica UMA tentativa de envio.
 *
 * O servidor usa esta chave para distinguir duas coisas que chegam iguais: o
 * mesmo clique repetido (duplo clique, retry do navegador, conexão instável) e
 * duas operações de verdade. Sem ela, as duas são indistinguíveis, e a escolha
 * seria entre aceitar cobrança dobrada ou recusar um pagamento legítimo.
 *
 * A chave se renova quando o envio TERMINA, e não a cada digitação: assim o
 * mesmo clique repetido carrega a chave antiga (o banco recusa a segunda), e um
 * segundo recebimento de verdade — inclusive de valor idêntico, que acontece em
 * parcela — carrega uma chave nova e passa.
 */
export function CampoIdempotencia({ name = "idempotencyKey" }: { name?: string }) {
  const [chave, setChave] = useState(novaChave);
  const { pending } = useFormStatus();
  const estavaEnviando = useRef(false);

  useEffect(() => {
    if (pending) {
      estavaEnviando.current = true;
      return;
    }
    if (estavaEnviando.current) {
      estavaEnviando.current = false;
      setChave(novaChave());
    }
  }, [pending]);

  return <input type="hidden" name={name} value={chave} readOnly />;
}
