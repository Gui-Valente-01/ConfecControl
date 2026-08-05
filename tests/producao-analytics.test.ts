import { describe, expect, it } from "vitest";
import {
  calcularPontualidade,
  calcularProdutividade,
  calcularTempoPorEtapa,
  calcularTempoTotal,
  gargalo,
  lerDias,
  lerPontualidade,
  resumirProblemas,
  type MovimentoEtapa,
} from "@/lib/producao-analytics";

const dia = (d: number, h = 8) => new Date(2026, 7, d, h, 0, 0);

describe("calcularPontualidade", () => {
  it("conta no prazo e atrasado", () => {
    const r = calcularPontualidade([
      { numero: 1, prazo: dia(10), entregueEm: dia(9) },
      { numero: 2, prazo: dia(10), entregueEm: dia(14) },
      { numero: 3, prazo: dia(20), entregueEm: dia(20) },
    ]);
    expect(r.entregues).toBe(3);
    expect(r.noPrazo).toBe(2);
    expect(r.atrasados).toBe(1);
    expect(r.percentualNoPrazo).toBe(67);
  });

  it("entregar no fim do dia prometido e no prazo, e nao atraso de horas", () => {
    const r = calcularPontualidade([{ numero: 1, prazo: dia(10, 8), entregueEm: dia(10, 18) }]);
    expect(r.noPrazo).toBe(1);
    expect(r.atrasados).toBe(0);
  });

  it("pedido sem prazo combinado fica de fora: nao da para atrasar o que nao foi prometido", () => {
    const r = calcularPontualidade([
      { numero: 1, prazo: null, entregueEm: dia(30) },
      { numero: 2, prazo: dia(10), entregueEm: dia(9) },
    ]);
    expect(r.entregues).toBe(1);
    expect(r.percentualNoPrazo).toBe(100);
  });

  it("atraso medio conta so quem atrasou, senao o numero fica diluido", () => {
    const r = calcularPontualidade([
      { numero: 1, prazo: dia(10), entregueEm: dia(9) },
      { numero: 2, prazo: dia(10), entregueEm: dia(13) },
      { numero: 3, prazo: dia(10), entregueEm: dia(15) },
    ]);
    // 3 e 5 dias de atraso -> media 4, e nao (0+3+5)/3
    expect(r.atrasoMedioDias).toBe(4);
  });

  it("mostra o pior atraso: a media esconde o caso extremo", () => {
    const r = calcularPontualidade([
      { numero: 7, prazo: dia(10), entregueEm: dia(11) },
      { numero: 9, prazo: dia(10), entregueEm: dia(40) },
    ]);
    expect(r.piorAtraso?.numero).toBe(9);
    expect(r.piorAtraso?.dias).toBe(30);
  });

  it("periodo sem entrega nao inventa porcentagem", () => {
    const r = calcularPontualidade([]);
    expect(r.percentualNoPrazo).toBeNull();
    expect(r.atrasoMedioDias).toBeNull();
  });
});

describe("calcularTempoPorEtapa", () => {
  // Pedido A: Corte (2 dias) -> Silk (5 dias) -> Acabamento (ainda la)
  const movimentos: MovimentoEtapa[] = [
    { orderId: "A", de: null, para: "Corte", quando: dia(1) },
    { orderId: "A", de: "Corte", para: "Silk", quando: dia(3) },
    { orderId: "A", de: "Silk", para: "Acabamento", quando: dia(8) },
    { orderId: "B", de: null, para: "Corte", quando: dia(1) },
    { orderId: "B", de: "Corte", para: "Silk", quando: dia(2) },
    { orderId: "B", de: "Silk", para: "Acabamento", quando: dia(11) },
  ];

  it("mede quanto o pedido fica em cada etapa", () => {
    const r = calcularTempoPorEtapa(movimentos);
    const corte = r.find((x) => x.etapa === "Corte");
    const silk = r.find((x) => x.etapa === "Silk");
    expect(corte?.passagens).toBe(2);
    expect(corte?.mediaDias).toBe(1.5); // 2 e 1
    expect(silk?.mediaDias).toBe(7); // 5 e 9
  });

  it("a etapa atual nao conta: o pedido ainda esta la", () => {
    const r = calcularTempoPorEtapa(movimentos);
    expect(r.find((x) => x.etapa === "Acabamento")).toBeUndefined();
  });

  it("gargalo e onde mais tempo se acumula, e nao onde a media e maior", () => {
    const r = calcularTempoPorEtapa(movimentos);
    expect(gargalo(r)?.etapa).toBe("Silk");
    expect(gargalo(r)?.totalDias).toBe(14);
  });

  it("movimento fora de ordem nao gera duracao negativa", () => {
    const bagunca: MovimentoEtapa[] = [
      { orderId: "C", de: "Silk", para: "Acabamento", quando: dia(8) },
      { orderId: "C", de: null, para: "Corte", quando: dia(1) },
      { orderId: "C", de: "Corte", para: "Silk", quando: dia(3) },
    ];
    const r = calcularTempoPorEtapa(bagunca);
    for (const etapa of r) expect(etapa.mediaDias).toBeGreaterThanOrEqual(0);
  });

  it("sem movimentacao devolve lista vazia e gargalo nulo", () => {
    expect(calcularTempoPorEtapa([])).toEqual([]);
    expect(gargalo([])).toBeNull();
  });
});

describe("calcularTempoTotal", () => {
  it("media, mediana, mais rapido e mais lento", () => {
    const r = calcularTempoTotal([
      { inicio: dia(1), fim: dia(11) },
      { inicio: dia(1), fim: dia(6) },
      { inicio: dia(1), fim: dia(31) },
    ]);
    expect(r.medianaDias).toBe(10);
    expect(r.maisRapido).toBe(5);
    expect(r.maisLento).toBe(30);
    expect(r.mediaDias).toBe(15);
  });

  it("a mediana protege do pedido esquecido meses no sistema", () => {
    const r = calcularTempoTotal([
      { inicio: dia(1), fim: dia(6) },
      { inicio: dia(1), fim: dia(7) },
      { inicio: dia(1), fim: dia(8) },
      { inicio: new Date(2026, 0, 1), fim: new Date(2026, 11, 1) },
    ]);
    expect(r.medianaDias).toBeLessThan(20);
    expect(r.mediaDias).toBeGreaterThan(80);
  });

  it("sem pedido entregue nao inventa numero", () => {
    const r = calcularTempoTotal([]);
    expect(r.mediaDias).toBeNull();
    expect(r.maisRapido).toBeNull();
  });
});

describe("calcularProdutividade", () => {
  it("conta tarefas e tempo medio por pessoa", () => {
    const r = calcularProdutividade([
      { pessoa: "Maria", etapa: "Silk", pegouEm: dia(1, 8), concluiuEm: dia(1, 12) },
      { pessoa: "Maria", etapa: "Silk", pegouEm: dia(2, 8), concluiuEm: dia(2, 10) },
      { pessoa: "João", etapa: "Corte", pegouEm: dia(1, 8), concluiuEm: dia(1, 9) },
    ]);
    expect(r[0].pessoa).toBe("Maria");
    expect(r[0].concluidas).toBe(2);
    expect(r[0].horasMedias).toBe(3);
    expect(r[1].concluidas).toBe(1);
  });

  it("ordena por quantidade concluida", () => {
    const r = calcularProdutividade([
      { pessoa: "A", etapa: null, pegouEm: dia(1, 8), concluiuEm: dia(1, 9) },
      { pessoa: "B", etapa: null, pegouEm: dia(1, 8), concluiuEm: dia(1, 9) },
      { pessoa: "B", etapa: null, pegouEm: dia(2, 8), concluiuEm: dia(2, 9) },
    ]);
    expect(r[0].pessoa).toBe("B");
  });

  it("tempo negativo por dado torto e ignorado", () => {
    const r = calcularProdutividade([
      { pessoa: "X", etapa: null, pegouEm: dia(5, 10), concluiuEm: dia(5, 8) },
    ]);
    expect(r).toEqual([]);
  });
});

describe("resumirProblemas", () => {
  it("separa falta de sobra e acha a etapa critica", () => {
    const r = resumirProblemas([
      { tipo: "SHORTAGE", etapa: "Silk", pessoa: "Maria", quando: dia(1), nota: "faltou tinta" },
      { tipo: "SHORTAGE", etapa: "Silk", pessoa: "João", quando: dia(2), nota: null },
      { tipo: "SURPLUS", etapa: "Corte", pessoa: "Ana", quando: dia(3), nota: null },
    ]);
    expect(r.total).toBe(3);
    expect(r.faltas).toBe(2);
    expect(r.sobras).toBe(1);
    expect(r.etapaCritica?.etapa).toBe("Silk");
    expect(r.etapaCritica?.ocorrencias).toBe(2);
  });

  it("periodo sem problema devolve tudo zerado, sem etapa critica", () => {
    const r = resumirProblemas([]);
    expect(r.total).toBe(0);
    expect(r.etapaCritica).toBeNull();
  });

  it("problema sem etapa nao quebra a conta", () => {
    const r = resumirProblemas([{ tipo: "INFO", etapa: null, pessoa: "X", quando: dia(1), nota: null }]);
    expect(r.etapaCritica?.etapa).toBe("Sem etapa");
  });
});

describe("lerDias", () => {
  it("traduz para linguagem de oficina", () => {
    expect(lerDias(3)).toBe("3 dias");
    expect(lerDias(1)).toBe("1 dia");
    expect(lerDias(2.5)).toBe("2 dias e 12 h");
    expect(lerDias(0.25)).toBe("6 horas");
    expect(lerDias(0.02)).toBe("menos de 1 hora");
  });

  it("sem dado avisa em vez de mostrar zero", () => {
    expect(lerDias(null)).toBe("sem dados");
  });
});

describe("lerPontualidade", () => {
  it("traduz a porcentagem em avaliacao honesta", () => {
    expect(lerPontualidade(98)).toContain("praticamente tudo");
    expect(lerPontualidade(85)).toContain("maioria");
    expect(lerPontualidade(70)).toContain("frequente");
    expect(lerPontualidade(30)).toContain("regra");
  });

  it("sem entrega nao julga nada", () => {
    expect(lerPontualidade(null)).toContain("nenhuma entrega");
  });
});
