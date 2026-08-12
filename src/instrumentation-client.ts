// Liga o monitoramento no navegador de quem esta usando o sistema.
//
// Vale a pena existir junto com o do servidor: boa parte do que quebra na
// oficina quebra no aparelho — celular antigo, 4G caindo no meio do envio,
// tela que o servidor entregou certo e o navegador nao conseguiu montar.

import * as Sentry from "@sentry/nextjs";
import { monitoramentoLigado, opcoesComuns } from "@/lib/monitoramento";

if (monitoramentoLigado) {
  Sentry.init({
    ...opcoesComuns,
    // Gravacao de tela fica de fora de proposito: ela filma o que a pessoa ve,
    // e o que ela ve sao os pedidos e os dados dos clientes dela.
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
  });
}

// Necessario para o Sentry medir a troca de telas do App Router.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
