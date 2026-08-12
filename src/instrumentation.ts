// Liga o monitoramento no lado do servidor. O Next chama este arquivo uma vez,
// antes de atender a primeira requisicao.
//
// As regras de privacidade e a chave vivem em lib/monitoramento.ts.

import * as Sentry from "@sentry/nextjs";
import { monitoramentoLigado, opcoesComuns } from "@/lib/monitoramento";

export async function register() {
  if (!monitoramentoLigado) return;
  Sentry.init(opcoesComuns);
}

// Erro dentro de uma pagina ou de uma Server Action chega aqui. Sem este
// gancho, falha de servidor no App Router nao vira aviso.
export const onRequestError = Sentry.captureRequestError;
