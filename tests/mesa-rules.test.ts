import { describe, expect, it } from "vitest";
import { explicarRecusa, mesaAceitaEtapa, mesasCompativeis, type MesaComEtapa } from "@/lib/mesa-rules";

const silk1: MesaComEtapa = { id: "m1", name: "Silk 1", stageId: "e-estampa", stageName: "Estamparia" };
const silk2: MesaComEtapa = { id: "m2", name: "Silk 2", stageId: "e-estampa", stageName: "Estamparia" };
const costura: MesaComEtapa = { id: "m3", name: "Costura 1", stageId: "e-costura", stageName: "Costura" };
const coringa: MesaComEtapa = { id: "m4", name: "Mesa livre", stageId: null, stageName: null };

describe("mesaAceitaEtapa", () => {
  it("mesa de silk aceita pedido que esta na estamparia", () => {
    expect(mesaAceitaEtapa(silk1, "e-estampa")).toBe(true);
  });

  it("mesa de silk recusa pedido que esta na costura", () => {
    expect(mesaAceitaEtapa(silk1, "e-costura")).toBe(false);
  });

  it("mesa sem etapa definida aceita tudo: e quem ainda nao configurou", () => {
    expect(mesaAceitaEtapa(coringa, "e-costura")).toBe(true);
    expect(mesaAceitaEtapa(coringa, "e-estampa")).toBe(true);
    expect(mesaAceitaEtapa(coringa, null)).toBe(true);
  });

  it("pedido sem etapa passa: barrar impediria de comecar o trabalho", () => {
    expect(mesaAceitaEtapa(silk1, null)).toBe(true);
  });
});

describe("mesasCompativeis", () => {
  const todas = [silk1, silk2, costura, coringa];

  it("mostra so as mesas que servem para a etapa do pedido", () => {
    const nomes = mesasCompativeis(todas, "e-estampa").map((m) => m.name);
    expect(nomes).toEqual(["Silk 1", "Silk 2", "Mesa livre"]);
  });

  it("outra etapa, outro conjunto", () => {
    const nomes = mesasCompativeis(todas, "e-costura").map((m) => m.name);
    expect(nomes).toEqual(["Costura 1", "Mesa livre"]);
  });

  it("pedido sem etapa pode ir para qualquer mesa", () => {
    expect(mesasCompativeis(todas, null)).toHaveLength(4);
  });

  it("empresa que nao configurou nada continua com todas as mesas", () => {
    expect(mesasCompativeis([coringa], "e-costura")).toHaveLength(1);
  });
});

describe("explicarRecusa", () => {
  it("diz onde o pedido esta, o que a mesa atende e qual mesa usar", () => {
    const texto = explicarRecusa({
      numeroPedido: 1042,
      etapaDoPedido: "Recebimento",
      mesa: silk1,
      mesasValidas: [{ name: "Corte 1" }],
    });
    expect(texto).toContain("#1042");
    expect(texto).toContain("Recebimento");
    expect(texto).toContain("Silk 1");
    expect(texto).toContain("Estamparia");
    expect(texto).toContain("a mesa Corte 1");
  });

  it("lista varias mesas em portugues, com 'e' antes da ultima", () => {
    const texto = explicarRecusa({
      numeroPedido: 7,
      etapaDoPedido: "Estamparia",
      mesa: costura,
      mesasValidas: [{ name: "Silk 1" }, { name: "Silk 2" }, { name: "Silk 3" }],
    });
    expect(texto).toContain("as mesas Silk 1, Silk 2 e Silk 3");
  });

  it("sem mesa nenhuma para a etapa, orienta o que fazer em vez de so recusar", () => {
    const texto = explicarRecusa({
      numeroPedido: 9,
      etapaDoPedido: "Acabamento",
      mesa: silk1,
      mesasValidas: [],
    });
    expect(texto).toContain("Nenhuma mesa cadastrada atende essa etapa");
    expect(texto).toContain("Configurações");
  });

  it("pedido sem etapa aparece com texto legivel, nao vazio", () => {
    const texto = explicarRecusa({
      numeroPedido: 3,
      etapaDoPedido: null,
      mesa: silk1,
      mesasValidas: [{ name: "Corte 1" }],
    });
    expect(texto).toContain("sem etapa definida");
  });
});
