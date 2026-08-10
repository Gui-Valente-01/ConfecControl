// Regras puras de produção e consumo de material, sem banco e sem Next, para
// permitir teste unitário. São as contas que mexem no estoque e movem o pedido
// de etapa — onde um erro custa dinheiro do cliente.

export type ConsumptionItem = {
  productId: string | null;
  quantity: number;
};

/**
 * Quanto sai do estoque de cada PEÇA quando um pedido é lançado.
 *
 * O estoque passou a ser da peça pronta, não do material: a confecção compra
 * a peça e presta o serviço em cima dela. Controlar matéria-prima exigia
 * manter preço e consumo de cada material em dia, e o que ninguém mantém
 * acaba fazendo o custo sair por baixo.
 *
 * Duas linhas do mesmo pedido podem apontar para a mesma peça (tamanhos
 * diferentes, por exemplo), então as quantidades se somam.
 *
 * Item sem peça do catálogo não baixa nada: não há o que descontar.
 */
export function computeProductConsumption(items: ConsumptionItem[]): Map<string, number> {
  const consumo = new Map<string, number>();

  for (const item of items) {
    if (!item.productId || item.quantity <= 0) continue;
    consumo.set(item.productId, (consumo.get(item.productId) ?? 0) + item.quantity);
  }

  return consumo;
}


export type Stage = {
  id: string;
  name: string;
  position: number;
  active: boolean;
};

/**
 * A próxima etapa da produção depois da atual.
 *
 * É a etapa ativa de menor posição acima da atual — etapas desativadas são
 * puladas, porque a confecção que não faz bordado não deve ver o pedido parar
 * lá. Devolve null quando o pedido já está na última etapa ativa.
 */
export function pickNextStage(stages: Stage[], currentPosition: number): Stage | null {
  let next: Stage | null = null;
  for (const stage of stages) {
    if (!stage.active) continue;
    if (stage.position <= currentPosition) continue;
    if (!next || stage.position < next.position) next = stage;
  }
  return next;
}

/**
 * A tela ainda está mostrando a etapa certa?
 *
 * O botão de avançar manda junto a etapa que a tela via quando carregou. Se
 * outra pessoa moveu o pedido nesse meio tempo, esse valor está velho — e
 * avançar a partir dele joga o pedido para uma etapa que já passou.
 *
 * Cenário real: o pedido está na Costura. O gerente ainda tem a tela de meia
 * hora atrás, mostrando Corte. Ele clica em avançar, o sistema calcula "a
 * próxima depois de Corte" e o pedido volta para o Silk sozinho.
 */
export function isStageOutdated(
  telaViu: string | null | undefined,
  pedidoTem: string | null | undefined,
): boolean {
  return (telaViu ?? null) !== (pedidoTem ?? null);
}

/**
 * O trabalho de bancada foi feito na etapa em que o pedido ainda está?
 *
 * A tarefa guarda o nome da etapa no momento de pegar. Se o pedido mudou de
 * etapa enquanto a pessoa trabalhava, concluir avançaria a partir da etapa
 * nova e puparia uma etapa inteira sem ninguém ter feito o serviço.
 *
 * Tarefa sem etapa registrada (pedido que nunca teve etapa) não trava: não há
 * o que comparar, e barrar aí só impediria a pessoa de fechar o trabalho.
 */
export function isTaskStageOutdated(
  etapaPega: string | null | undefined,
  etapaAtual: string | null | undefined,
): boolean {
  if (!etapaPega) return false;
  return etapaPega !== (etapaAtual ?? null);
}
