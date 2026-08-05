// Regras de compatibilidade entre mesa e etapa. Sem banco e sem Next, para teste.
//
// Uma mesa de silk faz silk. Antes, qualquer pedido entrava em qualquer mesa —
// dava para pegar na bancada de estamparia um pedido que ainda estava no
// recebimento, e o trabalho ia para a etapa errada sem ninguém perceber.
//
// A regra é a mais simples que resolve numa confecção pequena: cada mesa
// atende UMA etapa. Mesa sem etapa definida aceita qualquer pedido — é o
// estado de quem ainda não configurou nada, e não pode travar o sistema.

export type MesaComEtapa = {
  id: string;
  name: string;
  /** Etapa que esta mesa atende. Null = aceita qualquer pedido. */
  stageId: string | null;
  stageName?: string | null;
};

/**
 * Esta mesa aceita um pedido que está nesta etapa?
 *
 * Mesa sem etapa definida aceita tudo. Pedido sem etapa também passa: ele
 * ainda não entrou no fluxo, e barrar aí impediria de começar o trabalho.
 */
export function mesaAceitaEtapa(mesa: MesaComEtapa, etapaDoPedidoId: string | null): boolean {
  if (!mesa.stageId) return true;
  if (!etapaDoPedidoId) return true;
  return mesa.stageId === etapaDoPedidoId;
}

/** As mesas que podem receber este pedido agora. */
export function mesasCompativeis<T extends MesaComEtapa>(mesas: T[], etapaDoPedidoId: string | null): T[] {
  return mesas.filter((mesa) => mesaAceitaEtapa(mesa, etapaDoPedidoId));
}

/**
 * Por que o pedido não pode entrar nesta mesa, e o que fazer.
 *
 * Diz onde o pedido está, o que a mesa atende e quais mesas servem — sem isso
 * a pessoa só vê "não pode" e fica sem saber o próximo passo.
 */
export function explicarRecusa(input: {
  numeroPedido: number;
  etapaDoPedido: string | null;
  mesa: MesaComEtapa;
  mesasValidas: { name: string }[];
}): string {
  const onde = input.etapaDoPedido ?? "sem etapa definida";
  const atende = input.mesa.stageName ?? "outra etapa";

  const base = `O pedido #${input.numeroPedido} está em ${onde} e a mesa ${input.mesa.name} atende ${atende}.`;

  if (input.mesasValidas.length === 0) {
    return `${base} Nenhuma mesa cadastrada atende essa etapa — avance o pedido na Produção primeiro, ou ajuste as mesas em Configurações.`;
  }

  const nomes = input.mesasValidas.map((m) => m.name);
  const lista =
    nomes.length === 1
      ? `a mesa ${nomes[0]}`
      : `as mesas ${nomes.slice(0, -1).join(", ")} e ${nomes[nomes.length - 1]}`;

  return `${base} Para esta etapa, use ${lista}.`;
}
