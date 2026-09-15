// Tipos da lixeira e o que cada exclusão levaria junto se fosse definitiva.
// Sem banco e sem Next, para permitir teste.

import { diasDeCalendario } from "@/lib/datas";

export const TIPOS_LIXEIRA = ["cliente", "peca", "material", "terceirizada", "servico"] as const;

export type TipoLixeira = (typeof TIPOS_LIXEIRA)[number];

const TIPOS = new Set<string>(TIPOS_LIXEIRA);

export function eTipoLixeira(valor: string): valor is TipoLixeira {
  return TIPOS.has(valor);
}

const ROTULOS: Record<TipoLixeira, string> = {
  cliente: "Cliente",
  peca: "Peça",
  material: "Material",
  terceirizada: "Terceirizada",
  servico: "Serviço",
};

export function rotuloTipo(tipo: TipoLixeira): string {
  return ROTULOS[tipo];
}

/**
 * O que a exclusão definitiva leva junto, por tipo.
 *
 * É o texto da segunda confirmação, na tela da lixeira. Enquanto o item está
 * na lixeira nada disso foi apagado — some só se a pessoa mandar apagar de vez.
 */
const CASCATA: Record<TipoLixeira, string | null> = {
  cliente: null,
  peca: "todo o histórico de entrada e saída dela",
  material: "a ficha técnica antiga das peças que o usam e o histórico de estoque dele",
  terceirizada: null,
  servico: null,
};

export function descreverCascata(tipo: TipoLixeira): string | null {
  return CASCATA[tipo];
}

/** Texto da confirmação de apagar de vez, com o nome e o que vai junto. */
export function textoApagarDeVez(tipo: TipoLixeira, nome: string): string {
  const cascata = descreverCascata(tipo);
  const cabecalho = `Apagar ${rotuloTipo(tipo).toLowerCase()} "${nome}" de vez?`;
  const consequencia = cascata
    ? `\n\nIsso apaga junto ${cascata}. Depois disso não tem como voltar.`
    : "\n\nDepois disso não tem como voltar.";
  return cabecalho + consequencia;
}

/**
 * Há quantos dias o item está na lixeira, contando dias do calendário de
 * Brasília: pelo relógio do servidor (UTC), o que foi apagado às 20h já
 * aparecia como "excluído ontem" às 22h.
 */
export function diasNaLixeira(deletedAt: Date, agora: Date = new Date()): number {
  return Math.max(0, diasDeCalendario(deletedAt, agora));
}
