// Aviso de erro em producao.
//
// Sem isto, o jeito de descobrir que o sistema quebrou para um cliente e ele
// ligar. E ele liga sabendo dizer "deu erro", nao em qual tela nem por que.
//
// DUAS DECISOES QUE VALEM SER LIDAS ANTES DE MEXER AQUI:
//
// 1. Nada de dado de cliente sai daqui. O sistema guarda nome, telefone e
//    valor de pedido de gente real, e um servico de monitoramento e uma
//    empresa de fora. Entao o envio vai desligado de PII, e o que sobra e
//    limpo em beforeSend. O objetivo e saber ONDE quebrou, nao PARA QUEM.
//
// 2. Sem a chave configurada, tudo isto vira nada. O sistema continua
//    funcionando igual, sem erro e sem tentativa de conexao. Assim da para
//    subir o codigo antes de existir a conta, e ligar depois so pelo painel
//    de variaveis do Vercel.

import * as Sentry from "@sentry/nextjs";

export const DSN = process.env.NEXT_PUBLIC_SENTRY_DSN ?? "";

export const monitoramentoLigado = Boolean(DSN);

/** Campos que nunca podem sair do servidor, mesmo dentro de uma mensagem. */
const SEGREDOS = /(?:senha|password|token|secret|authorization|cookie|api[_-]?key)/i;

function limparObjeto(alvo: Record<string, unknown> | undefined) {
  if (!alvo) return;
  for (const chave of Object.keys(alvo)) {
    if (SEGREDOS.test(chave)) alvo[chave] = "[removido]";
  }
}

export const opcoesComuns: Sentry.NodeOptions & Sentry.BrowserOptions = {
  dsn: DSN,
  enabled: monitoramentoLigado,

  // Sem isto o SDK anexa e-mail, IP e cabecalhos da pessoa que estava usando.
  sendDefaultPii: false,

  // Amostra dos eventos de desempenho. 10% ja mostra a tela lenta sem
  // transformar o plano gratuito em plano pago no primeiro mes.
  tracesSampleRate: 0.1,

  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,

  beforeSend(evento) {
    // O corpo do formulario e o que mais carrega dado de cliente: nome, valor
    // do pedido, telefone. Para achar o erro basta a rota e a pilha.
    if (evento.request) {
      delete evento.request.data;
      delete evento.request.cookies;
      limparObjeto(evento.request.headers as Record<string, unknown>);
      // A query string as vezes leva termo de busca digitado pela pessoa.
      if (evento.request.query_string) evento.request.query_string = "[removido]";
    }
    limparObjeto(evento.extra);
    delete evento.user;
    return evento;
  },

  // Ruido que nao e problema do sistema: extensao do navegador, perda de rede
  // no 4G da oficina, aba fechada no meio de um envio.
  ignoreErrors: [
    "ResizeObserver loop",
    "Failed to fetch",
    "NetworkError",
    "Load failed",
    "AbortError",
  ],
};
