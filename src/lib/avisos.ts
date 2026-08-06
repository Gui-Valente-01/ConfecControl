// Avisos da equipe. Sem banco e sem React, para permitir teste.
//
// Duas coisas chegam por aqui:
//
//   1. o que o SISTEMA percebe sozinho: pedido novo, mudou de etapa, ficou
//      pronto, foi entregue;
//   2. o que uma PESSOA precisa pedir: a cor certa, uma foto do modelo, ajuda
//      com o serviço, ou só deixar um recado no pedido.
//
// O segundo grupo é o que hoje acontece por WhatsApp e some: a pessoa manda
// "qual a cor do 1042?" no grupo, alguém responde três horas depois, e nada
// disso fica no pedido. Aqui fica.

export const TIPOS_AVISO = [
  "PEDIDO_CRIADO",
  "ETAPA_MUDOU",
  "PEDIDO_PRONTO",
  "PEDIDO_ENTREGUE",
  "PEDE_COR",
  "PEDE_FOTO",
  "PEDE_AJUDA",
  "OBSERVACAO",
] as const;

export type TipoAviso = (typeof TIPOS_AVISO)[number];

const TIPOS = new Set<string>(TIPOS_AVISO);

export function eTipoAviso(valor: string): valor is TipoAviso {
  return TIPOS.has(valor);
}

/** Os que uma pessoa dispara na bancada. O resto o sistema gera sozinho. */
export const TIPOS_CHAMADO: TipoAviso[] = ["PEDE_COR", "PEDE_FOTO", "PEDE_AJUDA", "OBSERVACAO"];

export function eChamado(tipo: TipoAviso): boolean {
  return TIPOS_CHAMADO.includes(tipo);
}

type Descricao = {
  rotulo: string;
  /** Verbo do botão, quando é um chamado. */
  acao?: string;
  /** O que escrever no aviso quando ninguém digitou nada. */
  padrao: string;
  /** Chamado que nasce urgente: quem pede ajuda não pode esperar. */
  urgentePorPadrao: boolean;
};

const DESCRICOES: Record<TipoAviso, Descricao> = {
  PEDIDO_CRIADO: { rotulo: "Pedido novo", padrao: "Um pedido novo entrou.", urgentePorPadrao: false },
  ETAPA_MUDOU: { rotulo: "Mudou de etapa", padrao: "O pedido avançou na produção.", urgentePorPadrao: false },
  PEDIDO_PRONTO: { rotulo: "Ficou pronto", padrao: "A produção terminou. Falta entregar.", urgentePorPadrao: false },
  PEDIDO_ENTREGUE: { rotulo: "Entregue", padrao: "O pedido foi entregue ao cliente.", urgentePorPadrao: false },
  PEDE_COR: {
    rotulo: "Pediu a cor",
    acao: "Pedir cor",
    padrao: "Preciso saber a cor para continuar.",
    urgentePorPadrao: true,
  },
  PEDE_FOTO: {
    rotulo: "Pediu foto do modelo",
    acao: "Pedir foto",
    padrao: "Preciso da foto do modelo para produzir.",
    urgentePorPadrao: true,
  },
  PEDE_AJUDA: {
    rotulo: "Pediu ajuda",
    acao: "Pedir ajuda",
    padrao: "Preciso de ajuda aqui na bancada.",
    urgentePorPadrao: true,
  },
  OBSERVACAO: {
    rotulo: "Observação",
    acao: "Deixar recado",
    padrao: "Deixou uma observação no pedido.",
    urgentePorPadrao: false,
  },
};

export function descreverTipo(tipo: TipoAviso): Descricao {
  return DESCRICOES[tipo];
}

/**
 * O texto que aparece no aviso.
 *
 * Quem escreveu algo manda; quem não escreveu recebe a frase padrão do tipo —
 * um aviso em branco na lista não diz nada a ninguém.
 */
export function textoDoAviso(tipo: TipoAviso, escrito: string | null | undefined): string {
  const limpo = (escrito ?? "").trim();
  return limpo.length > 0 ? limpo : DESCRICOES[tipo].padrao;
}

/** Chamado de ajuda nasce urgente; o resto só se alguém marcar. */
export function urgenciaPadrao(tipo: TipoAviso): boolean {
  return DESCRICOES[tipo].urgentePorPadrao;
}

export type AvisoBasico = {
  tipo: TipoAviso;
  urgente: boolean;
  lido: boolean;
  criadoEm: Date;
};

/**
 * Quantos avisos ainda não foram lidos, e quantos deles são urgentes.
 *
 * O número de urgentes é separado porque é ele que decide se o sino fica
 * vermelho: cinco avisos comuns podem esperar, um pedido de ajuda não.
 */
export function contarNaoLidos(avisos: AvisoBasico[]): { total: number; urgentes: number } {
  const naoLidos = avisos.filter((a) => !a.lido);
  return { total: naoLidos.length, urgentes: naoLidos.filter((a) => a.urgente).length };
}

/**
 * Ordem da lista: urgente não lido primeiro, depois o resto por data.
 *
 * Sem isso o pedido de ajuda de agora ficaria embaixo de dez avisos comuns de
 * "mudou de etapa", que é justamente o que a pessoa não precisa ver primeiro.
 */
export function ordenarAvisos<T extends AvisoBasico>(avisos: T[]): T[] {
  return [...avisos].sort((a, b) => {
    const pesoA = (!a.lido && a.urgente ? 2 : 0) + (!a.lido ? 1 : 0);
    const pesoB = (!b.lido && b.urgente ? 2 : 0) + (!b.lido ? 1 : 0);
    if (pesoA !== pesoB) return pesoB - pesoA;
    return b.criadoEm.getTime() - a.criadoEm.getTime();
  });
}

/** "agora", "há 5 min", "há 2 h", "ontem", "12/08" — tempo curto de lista. */
export function tempoRelativo(quando: Date, agora: Date = new Date()): string {
  const minutos = Math.floor((agora.getTime() - quando.getTime()) / 60000);
  if (minutos < 1) return "agora";
  if (minutos < 60) return `há ${minutos} min`;

  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `há ${horas} h`;

  const dias = Math.floor(horas / 24);
  if (dias === 1) return "ontem";
  if (dias < 7) return `há ${dias} dias`;
  return quando.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}
