// As transições permitidas de um documento fiscal. Sem banco e sem Next.
//
// Nota fiscal não é um registro comum: cada mudança de situação tem efeito
// legal e algumas são irreversíveis. Uma nota AUTORIZADA não pode voltar a
// RASCUNHO, e uma CANCELADA não volta de jeito nenhum — o cancelamento foi
// registrado na SEFAZ, e o sistema fingir que não aconteceu criaria uma
// divergência entre o que a empresa vê e o que o fisco vê.
//
// Por isso a transição é explícita e validada, em vez de um simples update.

import type { FiscalStatus } from "@prisma/client";

/** Para onde cada situação pode ir. Lista vazia = ponto final. */
const PERMITIDAS: Record<FiscalStatus, FiscalStatus[]> = {
  // Rascunho: montado no sistema, ainda não foi para lugar nenhum.
  DRAFT: ["VALIDATING", "ERROR"],
  // Conferindo os dados obrigatórios antes de enviar.
  VALIDATING: ["PROCESSING", "REJECTED", "ERROR", "DRAFT"],
  // Já está com o provedor/SEFAZ; a resposta pode demorar.
  PROCESSING: ["AUTHORIZED", "REJECTED", "ERROR"],
  // Autorizada: existe para o fisco. Só pode ser cancelada.
  AUTHORIZED: ["CANCELLATION_PENDING"],
  // Rejeitada: dá para corrigir e tentar de novo.
  REJECTED: ["DRAFT", "VALIDATING", "ERROR"],
  // Cancelamento pedido, aguardando a SEFAZ confirmar.
  CANCELLATION_PENDING: ["CANCELLED", "AUTHORIZED", "ERROR"],
  // Fim da linha. Nota cancelada não volta.
  CANCELLED: [],
  // Falha de comunicação ou erro inesperado: dá para retomar.
  ERROR: ["DRAFT", "VALIDATING", "PROCESSING"],
};

/** Situações a partir das quais nada mais acontece. */
export const SITUACOES_FINAIS: FiscalStatus[] = ["CANCELLED"];

/** Situações em que o documento vale como nota emitida. */
export const SITUACOES_VALIDAS: FiscalStatus[] = ["AUTHORIZED"];

/** Situações em que ainda se espera resposta de fora. */
export const SITUACOES_EM_ANDAMENTO: FiscalStatus[] = [
  "VALIDATING",
  "PROCESSING",
  "CANCELLATION_PENDING",
];

export function podeTransicionar(de: FiscalStatus, para: FiscalStatus): boolean {
  return PERMITIDAS[de]?.includes(para) ?? false;
}

/** Transições possíveis a partir daqui. Útil para a tela e para os testes. */
export function proximosEstados(de: FiscalStatus): FiscalStatus[] {
  return [...(PERMITIDAS[de] ?? [])];
}

export class TransicaoInvalida extends Error {
  constructor(
    readonly de: FiscalStatus,
    readonly para: FiscalStatus,
  ) {
    super(`Transição fiscal inválida: ${de} → ${para}.`);
    this.name = "TransicaoInvalida";
  }
}

/**
 * Confere a transição antes de gravar.
 *
 * Estourar é proposital: uma transição inválida é defeito de programação, e
 * seguir em frente gravaria no banco uma situação que não existe no mundo
 * real — do tipo que só aparece quando o contador pede a nota.
 */
export function garantirTransicao(de: FiscalStatus, para: FiscalStatus): void {
  if (!podeTransicionar(de, para)) throw new TransicaoInvalida(de, para);
}

/** Já acabou? */
export function estaFinalizado(status: FiscalStatus): boolean {
  return SITUACOES_FINAIS.includes(status);
}

/** Pode tentar emitir de novo? */
export function podeReemitir(status: FiscalStatus): boolean {
  return status === "REJECTED" || status === "ERROR" || status === "DRAFT";
}

/** Pode pedir cancelamento? */
export function podeCancelar(status: FiscalStatus): boolean {
  return status === "AUTHORIZED";
}

const ROTULOS: Record<FiscalStatus, string> = {
  DRAFT: "Rascunho",
  VALIDATING: "Conferindo dados",
  PROCESSING: "Enviada, aguardando a SEFAZ",
  AUTHORIZED: "Autorizada",
  REJECTED: "Rejeitada",
  CANCELLATION_PENDING: "Cancelamento em andamento",
  CANCELLED: "Cancelada",
  ERROR: "Falha ao emitir",
};

/** Nome da situação em português, para a tela. */
export function rotuloDoStatus(status: FiscalStatus): string {
  return ROTULOS[status];
}
