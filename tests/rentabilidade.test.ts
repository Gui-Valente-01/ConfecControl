import { describe, expect, it } from "vitest";
import {
  agruparRentabilidade,
  lerMargem,
  noPrejuizo,
  ordenarPorLucro,
  type LinhaVendida,
} from "@/lib/rentabilidade";

// Boné: vende a 45, custa 30. Camiseta: vende a 28,50, custa 25 (margem magra).
const bone = (qtd: number): LinhaVendida => ({
  chave: "bone", rotulo: "Boné trucker", quantidade: qtd,
  receitaInCents: 4500 * qtd, custoInCents: 3000 * qtd,
});
const camiseta = (qtd: number): LinhaVendida => ({
  chave: "camiseta", rotulo: "Camiseta", quantidade: qtd,
  receitaInCents: 2850 * qtd, custoInCents: 2500 * qtd,
});

describe("agruparRentabilidade", () => {
  it("soma as linhas da mesma peca e calcula o lucro", () => {
    const [r] = agruparRentabilidade([bone(100), bone(20)]);
    expect(r.quantidade).toBe(120);
    expect(r.receitaInCents).toBe(540000);
    expect(r.custoInCents).toBe(360000);
    expect(r.lucroInCents).toBe(180000);
    expect(r.margem).toBe(33);
  });

  it("separa pecas diferentes", () => {
    const r = agruparRentabilidade([bone(10), camiseta(10)]);
    expect(r).toHaveLength(2);
    expect(r.map((x) => x.rotulo).sort()).toEqual(["Boné trucker", "Camiseta"]);
  });

  it("custo zerado marca o grupo, para a margem nao mentir 100%", () => {
    const semCusto: LinhaVendida = {
      chave: "avulso", rotulo: "Peça avulsa", quantidade: 5,
      receitaInCents: 50000, custoInCents: 0,
    };
    const [r] = agruparRentabilidade([semCusto]);
    expect(r.custoIncompleto).toBe(true);
    expect(r.margem).toBe(100); // o numero sai, mas vem com o aviso junto
  });

  it("uma linha sem custo contamina o grupo inteiro: a margem fica otimista", () => {
    const [r] = agruparRentabilidade([
      bone(10),
      { chave: "bone", rotulo: "Boné trucker", quantidade: 5, receitaInCents: 22500, custoInCents: 0 },
    ]);
    expect(r.custoIncompleto).toBe(true);
  });

  it("linha zerada dos dois lados nao acusa custo incompleto", () => {
    const [r] = agruparRentabilidade([
      { chave: "brinde", rotulo: "Brinde", quantidade: 3, receitaInCents: 0, custoInCents: 0 },
    ]);
    expect(r.custoIncompleto).toBe(false);
    expect(r.margem).toBeNull();
  });

  it("lista vazia devolve lista vazia", () => {
    expect(agruparRentabilidade([])).toEqual([]);
  });
});

describe("ordenarPorLucro", () => {
  it("ordena por lucro, e NAO por faturamento", () => {
    // A camiseta fatura mais (R$ 2.850) mas lucra menos (R$ 350) que o bone
    // (fatura R$ 900, lucra R$ 300)... entao vamos exagerar para ficar claro:
    const muitaCamiseta = camiseta(100); // receita 285.000, lucro 35.000
    const poucoBone = bone(30);          // receita 135.000, lucro 45.000
    const r = ordenarPorLucro(agruparRentabilidade([muitaCamiseta, poucoBone]));
    expect(r[0].rotulo).toBe("Boné trucker");
    expect(r[0].receitaInCents).toBeLessThan(r[1].receitaInCents);
    expect(r[0].lucroInCents).toBeGreaterThan(r[1].lucroInCents);
  });

  it("nao altera a lista recebida", () => {
    const original = agruparRentabilidade([bone(1), camiseta(1)]);
    const copia = [...original];
    ordenarPorLucro(original);
    expect(original).toEqual(copia);
  });
});

describe("noPrejuizo", () => {
  const prejuizo: LinhaVendida = {
    chave: "uniforme", rotulo: "Uniforme sob medida", quantidade: 10,
    receitaInCents: 100000, custoInCents: 130000,
  };

  it("acha o que foi vendido por menos do que custou", () => {
    const r = noPrejuizo(agruparRentabilidade([bone(10), prejuizo]));
    expect(r).toHaveLength(1);
    expect(r[0].rotulo).toBe("Uniforme sob medida");
    expect(r[0].lucroInCents).toBe(-30000);
  });

  it("custo incompleto NAO entra: nao da para acusar prejuizo sem saber o custo", () => {
    const semCusto: LinhaVendida = {
      chave: "x", rotulo: "Sem custo", quantidade: 1, receitaInCents: 1000, custoInCents: 0,
    };
    expect(noPrejuizo(agruparRentabilidade([semCusto]))).toEqual([]);
  });

  it("pior prejuizo aparece primeiro", () => {
    const pior: LinhaVendida = { chave: "y", rotulo: "Pior", quantidade: 1, receitaInCents: 1000, custoInCents: 90000 };
    const r = noPrejuizo(agruparRentabilidade([prejuizo, pior]));
    expect(r[0].rotulo).toBe("Pior");
  });

  it("tudo lucrativo devolve lista vazia", () => {
    expect(noPrejuizo(agruparRentabilidade([bone(5)]))).toEqual([]);
  });
});

describe("lerMargem", () => {
  it("traduz a porcentagem em frase", () => {
    expect(lerMargem(45, false)).toBe("margem boa");
    expect(lerMargem(25, false)).toBe("margem normal");
    expect(lerMargem(8, false)).toBe("margem apertada");
    expect(lerMargem(-12, false)).toBe("está saindo no prejuízo");
  });

  it("custo incompleto avisa antes de qualquer julgamento de margem", () => {
    expect(lerMargem(100, true)).toContain("custo incompleto");
  });

  it("sem receita nao inventa avaliacao", () => {
    expect(lerMargem(null, false)).toBe("sem receita no período");
  });
});
