import type { OrderStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  ficaNaPrateleira,
  notaDoAjuste,
  pecasDoPedido,
  planejarPrateleira,
  saldoDoPedidoNaPrateleira,
  type ItemParaPrateleira,
  type MovimentoDoPedido,
} from "@/lib/prateleira";

const propria = (id: string) => id !== "camisa-do-cliente";

describe("pecasDoPedido", () => {
  it("soma a mesma peca em linhas diferentes (tamanhos)", () => {
    const m = pecasDoPedido(
      [
        { productId: "polo", quantity: 40 },
        { productId: "polo", quantity: 20 },
        { productId: "bone", quantity: 5 },
      ],
      propria,
    );
    expect(m.get("polo")).toBe(60);
    expect(m.get("bone")).toBe(5);
  });

  it("item avulso, peca do cliente e quantidade zero ficam de fora", () => {
    const m = pecasDoPedido(
      [
        { productId: null, quantity: 50 },
        { productId: "camisa-do-cliente", quantity: 100 },
        { productId: "polo", quantity: 0 },
        { productId: "bone", quantity: -3 },
      ],
      propria,
    );
    expect(m.size).toBe(0);
  });
});

describe("saldoDoPedidoNaPrateleira", () => {
  it("entrou 60 e saiu 60: nada na prateleira", () => {
    const m = saldoDoPedidoNaPrateleira([
      { productId: "polo", type: "IN", quantity: 60 },
      { productId: "polo", type: "OUT", quantity: 60 },
    ]);
    expect(m.size).toBe(0);
  });

  it("entrou 60, saiu 20: 40 na prateleira", () => {
    const m = saldoDoPedidoNaPrateleira([
      { productId: "polo", type: "IN", quantity: 60 },
      { productId: "polo", type: "OUT", quantity: 20 },
    ]);
    expect(m.get("polo")).toBe(40);
  });

  it("acerto e movimento sem peca nao contam", () => {
    const m = saldoDoPedidoNaPrateleira([
      { productId: "polo", type: "ADJUSTMENT", quantity: 999 },
      { productId: null, type: "IN", quantity: 10 },
    ]);
    expect(m.size).toBe(0);
  });
});

describe("planejarPrateleira", () => {
  const deveria = (pares: [string, number][]) => new Map(pares);

  it("pedido que ficou pronto: entrada de tudo", () => {
    expect(planejarPrateleira(deveria([["polo", 60]]), new Map())).toEqual([{ productId: "polo", type: "IN", quantity: 60 }]);
  });

  it("chamar de novo nao duplica", () => {
    expect(planejarPrateleira(deveria([["polo", 60]]), deveria([["polo", 60]]))).toEqual([]);
  });

  it("pedido entregue: saida de tudo o que ele pos", () => {
    expect(planejarPrateleira(new Map(), deveria([["polo", 60], ["bone", 5]]))).toEqual([
      { productId: "bone", type: "OUT", quantity: 5 },
      { productId: "polo", type: "OUT", quantity: 60 },
    ]);
  });

  it("pedido pronto editado: so a diferenca", () => {
    expect(planejarPrateleira(deveria([["polo", 50], ["bone", 8]]), deveria([["polo", 60], ["regata", 3]]))).toEqual([
      { productId: "bone", type: "IN", quantity: 8 },
      { productId: "polo", type: "OUT", quantity: 10 },
      { productId: "regata", type: "OUT", quantity: 3 },
    ]);
  });
});

// ---------------------------------------------------------------------------
// Simulação de ponta a ponta: um estoque de verdade, com o GREATEST(0, ...)
// do banco, recebendo o que o sistema lança em cada passo do pedido.
// ---------------------------------------------------------------------------

type Estoque = Map<string, number>;

function simular(estoque: Estoque, movimentos: MovimentoDoPedido[], itens: ItemParaPrateleira[], status: OrderStatus, remover = false) {
  const alvo = remover || !ficaNaPrateleira(status) ? new Map<string, number>() : pecasDoPedido(itens, propria);
  const ajustes = planejarPrateleira(alvo, saldoDoPedidoNaPrateleira(movimentos));
  for (const a of ajustes) {
    const atual = estoque.get(a.productId) ?? 0;
    estoque.set(a.productId, a.type === "IN" ? atual + a.quantity : Math.max(0, atual - a.quantity));
    movimentos.push({ productId: a.productId, type: a.type, quantity: a.quantity });
  }
  return ajustes;
}

describe("o pedido passando pelas etapas", () => {
  const itens: ItemParaPrateleira[] = [
    { productId: "polo", quantity: 40 },
    { productId: "polo", quantity: 20 },
    { productId: "camisa-do-cliente", quantity: 100 },
  ];

  it("criado e em producao: estoque nao muda; pronto: +60; entregue: -60", () => {
    const estoque: Estoque = new Map([["polo", 10]]);
    const movs: MovimentoDoPedido[] = [];

    for (const etapa of ["RECEIVED", "CUTTING", "SEWING", "FINISHING"] as OrderStatus[]) {
      simular(estoque, movs, itens, etapa);
      expect(estoque.get("polo")).toBe(10);
    }

    simular(estoque, movs, itens, "READY");
    expect(estoque.get("polo")).toBe(70);
    expect(estoque.has("camisa-do-cliente")).toBe(false); // peça do cliente não é estoque da confecção

    simular(estoque, movs, itens, "DELIVERED");
    expect(estoque.get("polo")).toBe(10);
  });

  it("o antigo estoque fantasma nao acontece mais", () => {
    // Antes: 45 no estoque, pedido de 60 criado -> estoque 0, anotava saída de
    // 60; excluir o pedido devolvia 60 e o estoque ia a 60 (eram 45).
    const estoque: Estoque = new Map([["polo", 45]]);
    const movs: MovimentoDoPedido[] = [];
    simular(estoque, movs, itens, "RECEIVED");
    expect(estoque.get("polo")).toBe(45);
    simular(estoque, movs, itens, "RECEIVED", true); // excluído antes de ficar pronto
    expect(estoque.get("polo")).toBe(45);
  });

  it("excluir um pedido pronto tira da prateleira o que ele pos", () => {
    const estoque: Estoque = new Map([["polo", 0]]);
    const movs: MovimentoDoPedido[] = [];
    simular(estoque, movs, itens, "READY");
    expect(estoque.get("polo")).toBe(60);
    simular(estoque, movs, itens, "READY", true);
    expect(estoque.get("polo")).toBe(0);
  });

  it("pedido que ja estava pronto antes da mudanca e entregue sem tirar o que nunca entrou", () => {
    const estoque: Estoque = new Map([["polo", 12]]);
    const movs: MovimentoDoPedido[] = []; // nenhuma entrada registrada para ele
    expect(simular(estoque, movs, itens, "DELIVERED")).toEqual([]);
    expect(estoque.get("polo")).toBe(12);
  });

  it("se alguem contou menos na prateleira, a entrega nao deixa o estoque negativo", () => {
    const estoque: Estoque = new Map([["polo", 0]]);
    const movs: MovimentoDoPedido[] = [];
    simular(estoque, movs, itens, "READY"); // 60
    estoque.set("polo", 45); // "Contei e tenho 45"
    simular(estoque, movs, itens, "DELIVERED");
    expect(estoque.get("polo")).toBe(0);
    // E o pedido fica zerado no histórico dele: nada sobra "na prateleira".
    expect(saldoDoPedidoNaPrateleira(movs).size).toBe(0);
  });

  it("pronto editado de 60 para 50 polos: sai 10", () => {
    const estoque: Estoque = new Map([["polo", 0]]);
    const movs: MovimentoDoPedido[] = [];
    simular(estoque, movs, itens, "READY");
    simular(estoque, movs, [{ productId: "polo", quantity: 50 }], "READY");
    expect(estoque.get("polo")).toBe(50);
  });
});

describe("notaDoAjuste", () => {
  it("escreve o que aconteceu, com o numero do pedido", () => {
    expect(notaDoAjuste({ productId: "p", type: "IN", quantity: 60 }, 1001, "READY", "etapa")).toBe(
      "Pedido #1001 ficou pronto — entrou na prateleira",
    );
    expect(notaDoAjuste({ productId: "p", type: "OUT", quantity: 60 }, 1001, "DELIVERED", "etapa")).toBe(
      "Pedido #1001 entregue — saiu da prateleira",
    );
    expect(notaDoAjuste({ productId: "p", type: "OUT", quantity: 60 }, 1001, "READY", "exclusao")).toBe(
      "Pedido #1001 excluído — saiu da prateleira",
    );
    expect(notaDoAjuste({ productId: "p", type: "OUT", quantity: 10 }, 1001, "READY", "edicao")).toBe(
      "Pedido #1001 alterado — prateleira ajustada",
    );
  });
});
