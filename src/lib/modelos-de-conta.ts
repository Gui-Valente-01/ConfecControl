// Com que cara a conta de um cliente novo nasce.
//
// Até aqui toda empresa recebia as mesmas oito etapas, fosse fábrica de boné ou
// facção. Na implantação, a primeira meia hora era apagar "Corte" de quem não
// corta e renomear "Bordado/estampa" para o que a oficina chama de verdade. O
// modelo faz isso antes: quem gera o convite em /master escolhe o tipo de
// confecção, e a conta já abre com as etapas e os serviços daquele ramo.
//
// As chaves são as mesmas das páginas /para/*. O teste cobra que as duas listas
// andem juntas: segmento anunciado no site sem modelo de conta seria vender uma
// coisa e entregar outra.
//
// REGRA DOS NOMES — leia antes de mexer em qualquer etapa
// ---------------------------------------------------------------------------
// O status do pedido não é escolhido: ele é deduzido do NOME da etapa, em
// stageNameToOrderStatus (src/lib/status.ts). "Pronto" vira pronto, "Entregue"
// vira entregue, "Corte", "Costura", "Bordado", "Estampa" e "Acabamento" viram
// em produção. Qualquer outro nome cai em "recebido".
//
// Isso tem consequência direta:
//   - sem uma etapa com "entregue" no nome, o pedido nunca é dado como entregue
//     e fica para sempre na lista de atrasados;
//   - uma etapa chamada "Montagem" ou "Expedição" no meio da produção faz o
//     pedido aparecer como "Recebido" para quem olha o andamento.
// Por isso aqui é "Costura e montagem", e não "Montagem". O teste em
// tests/modelos-de-conta.test.ts reprova o modelo que quebrar isso.
//
// Sem banco e sem Next: só dados e funções puras, para dar para testar.

import type { OrderStatus } from "@prisma/client";
import { stageNameToOrderStatus } from "@/lib/status";

export type ModeloDeConta = {
  /** Nome do modelo para quem escolhe em /master. */
  nome: string;
  /** Etapas de produção, na ordem em que o pedido anda. */
  etapas: string[];
  /**
   * Serviços que o ramo costuma cobrar à parte, para o catálogo não começar
   * vazio. Entram com preço zero de propósito: preço inventado viraria número
   * errado no pedido e no relatório de lucro. O dono preenche o dele.
   */
  servicos: string[];
};

/**
 * As etapas que toda conta recebia antes de existir modelo.
 *
 * Continua sendo o que se aplica quando o convite não tem segmento — inclusive
 * os convites criados antes desta mudança. Não mexer sem pensar nisso: alterar
 * aqui muda a conta de quem ativar um convite antigo.
 */
export const MODELO_PADRAO: ModeloDeConta = {
  nome: "Genérico",
  etapas: ["Recebido", "Aguardando material", "Corte", "Costura", "Bordado/estampa", "Acabamento", "Pronto", "Entregue"],
  servicos: [],
};

export const MODELOS_DE_CONTA: Record<string, ModeloDeConta> = {
  bones: {
    nome: "Bonés e chapéus",
    etapas: [
      "Recebido",
      "Arte em aprovação",
      "Aguardando material",
      "Corte",
      "Bordado ou estampa",
      "Costura e montagem",
      "Acabamento e embalagem",
      "Pronto",
      "Entregue",
    ],
    servicos: ["Bordado frontal", "Bordado lateral", "Estampa", "Etiqueta personalizada"],
  },
  camisetas: {
    nome: "Camisetas",
    etapas: ["Recebido", "Aguardando material", "Corte", "Costura", "Estampa", "Revisão e acabamento", "Pronto", "Entregue"],
    servicos: ["Silk", "Sublimação", "DTF", "Bordado"],
  },
  brindes: {
    nome: "Brindes promocionais",
    etapas: [
      "Recebido",
      "Arte em aprovação",
      "Aguardando material",
      "Corte",
      "Costura",
      "Estampa ou bordado",
      "Acabamento e embalagem",
      "Pronto",
      "Entregue",
    ],
    servicos: ["Estampa do logo", "Bordado do logo", "Embalagem individual"],
  },
  bordados: {
    nome: "Bordados",
    etapas: ["Recebido", "Matriz em aprovação", "Aguardando material", "Bordado", "Acabamento e arremate", "Pronto", "Entregue"],
    servicos: ["Digitalização de matriz", "Bordado no peito", "Bordado nas costas"],
  },
  estamparias: {
    nome: "Estamparias e serigrafias",
    etapas: [
      "Recebido",
      "Arte e gravação de tela",
      "Aguardando material",
      "Estampa",
      "Secagem e acabamento",
      "Pronto",
      "Entregue",
    ],
    servicos: ["Silk 1 cor", "Silk até 4 cores", "Sublimação", "DTF"],
  },
  uniformes: {
    nome: "Uniformes",
    etapas: [
      "Recebido",
      "Aguardando material",
      "Corte",
      "Costura",
      "Bordado ou estampa do logo",
      "Acabamento",
      "Pronto",
      "Entregue",
    ],
    servicos: ["Bordado do logo", "Estampa do logo", "Personalização com nome"],
  },
  faccoes: {
    nome: "Facções",
    // Facção costuma receber o lote já cortado: não há "Corte" aqui, e a
    // primeira coisa depois de receber é contar o que chegou.
    etapas: [
      "Recebido",
      "Conferência do lote",
      "Aguardando material",
      "Costura",
      "Revisão e acabamento",
      "Pronto",
      "Entregue ao contratante",
    ],
    servicos: ["Costura", "Overloque", "Arremate", "Passadoria"],
  },
  moda: {
    nome: "Marca própria e roupas",
    etapas: [
      "Recebido",
      "Modelagem e piloto",
      "Aguardando material",
      "Corte",
      "Costura",
      "Acabamento",
      "Pronto",
      "Entregue",
    ],
    // Marca própria vende peça, não serviço. Catálogo vazio é mais honesto do
    // que três serviços que o cliente teria de apagar.
    servicos: [],
  },
};

/** As chaves válidas, na ordem em que aparecem em /master. */
export const SEGMENTOS_COM_MODELO = Object.keys(MODELOS_DE_CONTA);

/**
 * O modelo de um segmento. Segmento vazio ou desconhecido cai no padrão.
 *
 * Desconhecido não é erro aqui: um convite criado com um segmento que depois
 * saiu da lista precisa continuar abrindo conta, só que com as etapas padrão.
 * Quem recusa segmento inválido é a tela que cria o convite.
 */
export function modeloDaConta(segmento: string | null | undefined): ModeloDeConta {
  if (!segmento || !segmentoValido(segmento)) return MODELO_PADRAO;
  return MODELOS_DE_CONTA[segmento];
}

/**
 * Se o segmento existe na lista.
 *
 * Checagem de chave própria, e não `segmento in MODELOS_DE_CONTA` nem acesso
 * direto: o valor vem de formulário, e "constructor" ou "toString" existem em
 * todo objeto por herança — o acesso devolveria uma função no lugar do modelo.
 */
export function segmentoValido(segmento: string): boolean {
  return Object.prototype.hasOwnProperty.call(MODELOS_DE_CONTA, segmento);
}

// A cor segue o que a etapa significa, não a posição. São as mesmas cores que
// as oito etapas padrão sempre tiveram, então a conta genérica nasce idêntica
// ao que era; e duas etapas de produção em modelos diferentes pintam igual.
const COR_RECEBIDO = "#5b68d8";

const COR_POR_STATUS: Partial<Record<OrderStatus, string>> = {
  RECEIVED: COR_RECEBIDO,
  WAITING_MATERIAL: "#8a6fdb",
  CUTTING: "#087f7d",
  SEWING: "#c88a2b",
  EMBROIDERY_PRINT: "#c87941",
  FINISHING: "#c43f54",
  READY: "#111a16",
  DELIVERED: "#66756d",
};

export type EtapaParaCriar = { companyId: string; name: string; position: number; color: string };

/** As linhas de etapa que a conta nova recebe, prontas para o createMany. */
export function etapasParaCriar(modelo: ModeloDeConta, companyId: string): EtapaParaCriar[] {
  return modelo.etapas.map((name, i) => ({
    companyId,
    name,
    position: i + 1,
    color: COR_POR_STATUS[stageNameToOrderStatus(name)] ?? COR_RECEBIDO,
  }));
}

export type ServicoParaCriar = { companyId: string; name: string; position: number };

export function servicosParaCriar(modelo: ModeloDeConta, companyId: string): ServicoParaCriar[] {
  return modelo.servicos.map((name, i) => ({ companyId, name, position: i + 1 }));
}
