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
