import { describe, expect, it } from "vitest";
import {
  computeProductConsumption,
  isStageOutdated,
  isTaskStageOutdated,
  pickNextStage,
  type Stage,
} from "@/lib/production";

describe("computeProductConsumption", () => {
  it("baixa a quantidade vendida de cada peca", () => {
    const c = computeProductConsumption([
      { productId: "polo", quantity: 10 },
      { productId: "boné", quantity: 4 },
    ]);
    expect(c.get("polo")).toBe(10);
    expect(c.get("boné")).toBe(4);
  });

  it("mesma peca em duas linhas soma, nao substitui", () => {
    // Acontece sempre que o pedido separa tamanhos em linhas diferentes.
    const c = computeProductConsumption([
      { productId: "polo", quantity: 10 },
      { productId: "polo", quantity: 6 },
    ]);
    expect(c.get("polo")).toBe(16);
  });

  it("item avulso, sem peca do catalogo, nao baixa nada", () => {
    const c = computeProductConsumption([{ productId: null, quantity: 50 }]);
    expect(c.size).toBe(0);
  });

  it("quantidade zero ou negativa e ignorada", () => {
    const c = computeProductConsumption([
      { productId: "polo", quantity: 0 },
      { productId: "boné", quantity: -3 },
    ]);
    expect(c.size).toBe(0);
  });

  it("pedido vazio devolve mapa vazio", () => {
    expect(computeProductConsumption([]).size).toBe(0);
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

describe("isStageOutdated", () => {
  it("tela em dia com o pedido: pode avancar", () => {
    expect(isStageOutdated("costura", "costura")).toBe(false);
  });

  it("outra pessoa moveu o pedido: a tela esta velha", () => {
    // A tela viu "corte", mas o pedido ja esta na "costura". Avancar a partir
    // de "corte" mandaria o pedido para o "silk", ou seja, para tras.
    expect(isStageOutdated("corte", "costura")).toBe(true);
  });

  it("pedido perdeu a etapa enquanto a tela estava aberta", () => {
    expect(isStageOutdated("corte", null)).toBe(true);
    expect(isStageOutdated(null, "corte")).toBe(true);
  });

  it("os dois sem etapa contam como iguais", () => {
    expect(isStageOutdated(null, null)).toBe(false);
    expect(isStageOutdated(undefined, null)).toBe(false);
  });
});

describe("isTaskStageOutdated", () => {
  it("pedido parado na mesma etapa: pode concluir", () => {
    expect(isTaskStageOutdated("Silk", "Silk")).toBe(false);
  });

  it("pedido andou enquanto a pessoa trabalhava: concluir pularia uma etapa", () => {
    expect(isTaskStageOutdated("Silk", "Costura")).toBe(true);
  });

  it("pedido ficou sem etapa no meio do trabalho", () => {
    expect(isTaskStageOutdated("Silk", null)).toBe(true);
  });

  it("tarefa sem etapa registrada nao trava: nao ha o que comparar", () => {
    expect(isTaskStageOutdated(null, "Costura")).toBe(false);
    expect(isTaskStageOutdated(null, null)).toBe(false);
    expect(isTaskStageOutdated("", "Costura")).toBe(false);
  });
});
