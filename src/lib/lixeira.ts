// Tipos da lixeira e o que cada exclusão levaria junto se fosse definitiva.
// Sem banco e sem Next, para permitir teste.

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
  peca: "a ficha técnica dela",
  material: "a ficha técnica das peças que o usam e todo o histórico de estoque",
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

/** Há quantos dias o item está na lixeira. */
export function diasNaLixeira(deletedAt: Date, agora: Date = new Date()): number {
  const DIA = 86400000;
  const inicio = new Date(deletedAt.getFullYear(), deletedAt.getMonth(), deletedAt.getDate());
  const fim = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
  return Math.max(0, Math.floor((fim.getTime() - inicio.getTime()) / DIA));
}
