// Regras puras de produção e consumo de material, sem banco e sem Next, para
// permitir teste unitário. São as contas que mexem no estoque e movem o pedido
// de etapa — onde um erro custa dinheiro do cliente.

export type ConsumptionItem = {
  productId: string | null;
  quantity: number;
};

export type BomLine = {
  productId: string;
  materialId: string;
  quantityPerUnit: number;
};

/**
 * Quanto de cada material um pedido consome.
 *
 * Percorre os itens do pedido e, para cada um, aplica a ficha técnica da peça
 * (quanto ela gasta por unidade). O mesmo material pode vir de peças
 * diferentes, então os valores se somam.
 *
 * Item sem peça do catálogo (produto avulso) não consome nada: não há ficha.
 */
export function computeStockConsumption(items: ConsumptionItem[], boms: BomLine[]): Map<string, number> {
  const consumption = new Map<string, number>();
  if (boms.length === 0) return consumption;

  // Agrupa a ficha por peça para não varrer a lista inteira a cada item.
  const bomByProduct = new Map<string, BomLine[]>();
  for (const bom of boms) {
    const list = bomByProduct.get(bom.productId);
    if (list) list.push(bom);
    else bomByProduct.set(bom.productId, [bom]);
  }

  for (const item of items) {
    if (!item.productId || item.quantity <= 0) continue;
    for (const bom of bomByProduct.get(item.productId) ?? []) {
      const qty = bom.quantityPerUnit * item.quantity;
      if (qty <= 0) continue;
      consumption.set(bom.materialId, (consumption.get(bom.materialId) ?? 0) + qty);
    }
  }

  return consumption;
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

export type ProductCostInfo = {
  id: string;
  bom: { materialName: string; materialPriceInCents: number }[];
};

/**
 * Peças cujo custo está incompleto, e quais materiais faltam precificar.
 *
 * É mais perigoso do que custo zerado: a peça mostra um número, mas ele está
 * por baixo — e o lucro no relatório aparece maior do que é de verdade. O dono
 * então precifica em cima de uma margem que não existe.
 */
export function findIncompleteCosts(products: ProductCostInfo[]): {
  productIds: Set<string>;
  materialNames: string[];
} {
  const productIds = new Set<string>();
  const materialNames = new Set<string>();

  for (const product of products) {
    for (const line of product.bom) {
      if (line.materialPriceInCents > 0) continue;
      productIds.add(product.id);
      materialNames.add(line.materialName);
    }
  }

  return { productIds, materialNames: [...materialNames] };
}
