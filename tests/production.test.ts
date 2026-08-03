import { describe, expect, it } from "vitest";
import { computeStockConsumption, findIncompleteCosts, pickNextStage, type BomLine, type Stage } from "@/lib/production";

// Ficha de exemplo: a camiseta gasta malha e linha; o boné gasta malha e aba.
const boms: BomLine[] = [
  { productId: "camiseta", materialId: "malha", quantityPerUnit: 0.25 },
  { productId: "camiseta", materialId: "linha", quantityPerUnit: 0.02 },
  { productId: "bone", materialId: "malha", quantityPerUnit: 0.1 },
  { productId: "bone", materialId: "aba", quantityPerUnit: 1 },
];

describe("computeStockConsumption", () => {
  it("multiplica a ficha pela quantidade do item", () => {
    const out = computeStockConsumption([{ productId: "camiseta", quantity: 120 }], boms);
    expect(out.get("malha")).toBeCloseTo(30);
    expect(out.get("linha")).toBeCloseTo(2.4);
  });

  it("soma o mesmo material vindo de pecas diferentes", () => {
    const out = computeStockConsumption(
      [
        { productId: "camiseta", quantity: 100 }, // 25 kg de malha
        { productId: "bone", quantity: 50 }, // 5 kg de malha
      ],
      boms,
    );
    expect(out.get("malha")).toBeCloseTo(30);
    expect(out.get("aba")).toBeCloseTo(50);
  });

  it("soma quando a mesma peca aparece em dois itens do pedido", () => {
    const out = computeStockConsumption(
      [
        { productId: "camiseta", quantity: 60 },
        { productId: "camiseta", quantity: 40 },
      ],
      boms,
    );
    expect(out.get("malha")).toBeCloseTo(25);
  });

  it("ignora produto avulso, que nao tem ficha", () => {
    const out = computeStockConsumption(
      [
        { productId: null, quantity: 999 },
        { productId: "camiseta", quantity: 10 },
      ],
      boms,
    );
    expect(out.get("malha")).toBeCloseTo(2.5);
    expect(out.size).toBe(2);
  });

  it("ignora peca sem ficha cadastrada", () => {
    const out = computeStockConsumption([{ productId: "avental", quantity: 30 }], boms);
    expect(out.size).toBe(0);
  });

  it("ignora item com quantidade zero ou negativa", () => {
    expect(computeStockConsumption([{ productId: "camiseta", quantity: 0 }], boms).size).toBe(0);
    expect(computeStockConsumption([{ productId: "camiseta", quantity: -5 }], boms).size).toBe(0);
  });

  it("nao consome nada quando nenhuma peca tem ficha", () => {
    expect(computeStockConsumption([{ productId: "camiseta", quantity: 10 }], []).size).toBe(0);
  });
});

// Etapas fora de ordem de proposito: a funcao nao pode depender da ordem do array.
const stages: Stage[] = [
  { id: "s4", name: "Acabamento", position: 4, active: true },
  { id: "s1", name: "Corte", position: 1, active: true },
  { id: "s3", name: "Bordado", position: 3, active: false },
  { id: "s2", name: "Costura", position: 2, active: true },
  { id: "s5", name: "Pronto", position: 5, active: true },
];

describe("pickNextStage", () => {
  it("avanca para a etapa seguinte", () => {
    expect(pickNextStage(stages, 1)?.name).toBe("Costura");
  });

  it("pula etapa desativada", () => {
    // Da Costura (2) deveria ir para Bordado (3), mas ele esta desligado.
    expect(pickNextStage(stages, 2)?.name).toBe("Acabamento");
  });

  it("devolve null na ultima etapa ativa", () => {
    expect(pickNextStage(stages, 5)).toBeNull();
  });

  it("devolve null quando so restam etapas desativadas", () => {
    const so_inativas: Stage[] = [
      { id: "a", name: "Corte", position: 1, active: true },
      { id: "b", name: "Bordado", position: 2, active: false },
    ];
    expect(pickNextStage(so_inativas, 1)).toBeNull();
  });

  it("pega a primeira etapa quando o pedido ainda nao tem posicao", () => {
    expect(pickNextStage(stages, 0)?.name).toBe("Corte");
  });

  it("nao volta para tras", () => {
    expect(pickNextStage(stages, 4)?.name).toBe("Pronto");
  });
});

describe("findIncompleteCosts", () => {
  const camiseta = {
    id: "camiseta",
    bom: [
      { materialName: "Malha PV", materialPriceInCents: 2850 },
      { materialName: "Linha 120", materialPriceInCents: 0 },
    ],
  };
  const bone = {
    id: "bone",
    bom: [{ materialName: "Brim", materialPriceInCents: 1900 }],
  };

  it("aponta a peca e o material que falta precificar", () => {
    const out = findIncompleteCosts([camiseta, bone]);
    expect([...out.productIds]).toEqual(["camiseta"]);
    expect(out.materialNames).toEqual(["Linha 120"]);
  });

  it("nao acusa nada quando tudo tem preco", () => {
    const out = findIncompleteCosts([bone]);
    expect(out.productIds.size).toBe(0);
    expect(out.materialNames).toEqual([]);
  });

  it("nao repete o material usado em varias pecas", () => {
    const outra = { id: "regata", bom: [{ materialName: "Linha 120", materialPriceInCents: 0 }] };
    const out = findIncompleteCosts([camiseta, outra]);
    expect(out.materialNames).toEqual(["Linha 120"]);
    expect(out.productIds.size).toBe(2);
  });

  it("peca sem ficha nao entra: o problema dela e outro", () => {
    const out = findIncompleteCosts([{ id: "avulso", bom: [] }]);
    expect(out.productIds.size).toBe(0);
  });
});
