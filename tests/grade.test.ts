import { describe, expect, it } from "vitest";
import {
  celulasPreenchidas,
  chaveCelula,
  separarLista,
  totalDaGrade,
  GRADES_SUGERIDAS,
} from "@/lib/grade";

describe("separarLista", () => {
  it("aceita virgula, espaco e quebra de linha, porque cada um digita de um jeito", () => {
    expect(separarLista("P, M, G")).toEqual(["P", "M", "G"]);
    expect(separarLista("P M G")).toEqual(["P", "M", "G"]);
    expect(separarLista("P;M\nG")).toEqual(["P", "M", "G"]);
    expect(separarLista("  P ,,  M  ")).toEqual(["P", "M"]);
  });

  it("tira repetido: duas colunas iguais virariam duas linhas iguais no pedido", () => {
    expect(separarLista("P, M, P")).toEqual(["P", "M"]);
    expect(separarLista("P, p")).toEqual(["P"]);
  });

  it("mantem o que a pessoa escreveu, e nao uma versao normalizada", () => {
    expect(separarLista("GG")).toEqual(["GG"]);
    expect(separarLista("Azul, AZUL")).toEqual(["Azul"]);
  });

  it("cor de nome composto continua uma cor so quando ha virgula", () => {
    // Sem esta regra, "Azul Marinho" viraria duas cores e a grade sairia com o
    // dobro de faixas -- e nomes assim sao a maioria numa confeccao.
    expect(separarLista("Azul Marinho, Verde Bandeira")).toEqual([
      "Azul Marinho",
      "Verde Bandeira",
    ]);
    expect(separarLista("Branco, Preto, Cinza Mescla")).toEqual([
      "Branco",
      "Preto",
      "Cinza Mescla",
    ]);
  });

  it("sem virgula, o espaco separa: e assim que os tamanhos sao digitados", () => {
    expect(separarLista("P M G GG")).toEqual(["P", "M", "G", "GG"]);
    expect(separarLista("2 4 6 8")).toEqual(["2", "4", "6", "8"]);
  });

  it("texto vazio nao vira lista com um item em branco", () => {
    expect(separarLista("")).toEqual([]);
    expect(separarLista("   ")).toEqual([]);
    expect(separarLista(",,,")).toEqual([]);
  });
});

describe("celulasPreenchidas", () => {
  it("gera uma celula por combinacao preenchida", () => {
    const quantidades = {
      [chaveCelula("Azul", "P")]: 10,
      [chaveCelula("Azul", "M")]: 20,
      [chaveCelula("Preta", "M")]: 5,
    };
    const celulas = celulasPreenchidas(["Azul", "Preta"], ["P", "M"], quantidades);

    expect(celulas).toEqual([
      { cor: "Azul", tamanho: "P", quantidade: 10 },
      { cor: "Azul", tamanho: "M", quantidade: 20 },
      { cor: "Preta", tamanho: "M", quantidade: 5 },
    ]);
  });

  it("celula vazia ou zerada nao vira item", () => {
    const quantidades = {
      [chaveCelula("", "P")]: 0,
      [chaveCelula("", "M")]: "",
      [chaveCelula("", "G")]: 3,
    };
    const celulas = celulasPreenchidas([], ["P", "M", "G"], quantidades);
    expect(celulas).toEqual([{ cor: "", tamanho: "G", quantidade: 3 }]);
  });

  it("sem cor informada a grade tem uma faixa so", () => {
    const celulas = celulasPreenchidas([], ["P"], { [chaveCelula("", "P")]: 4 });
    expect(celulas).toHaveLength(1);
    expect(celulas[0].cor).toBe("");
  });

  it("quantidade quebrada vira inteiro: nao existe meia camiseta", () => {
    const celulas = celulasPreenchidas([], ["P"], { [chaveCelula("", "P")]: 2.7 });
    expect(celulas[0].quantidade).toBe(2);
  });

  it("valor negativo ou sujo e descartado em vez de virar item errado", () => {
    const quantidades = {
      [chaveCelula("", "P")]: -5,
      [chaveCelula("", "M")]: "abc",
    };
    expect(celulasPreenchidas([], ["P", "M"], quantidades)).toEqual([]);
  });

  it("cor com o mesmo nome de tamanho nao embaralha as celulas", () => {
    // A chave leva os dois valores, entao "M" cor e "M" tamanho nao colidem.
    const quantidades = {
      [chaveCelula("M", "P")]: 1,
      [chaveCelula("P", "M")]: 2,
    };
    const celulas = celulasPreenchidas(["M", "P"], ["P", "M"], quantidades);
    expect(celulas).toEqual([
      { cor: "M", tamanho: "P", quantidade: 1 },
      { cor: "P", tamanho: "M", quantidade: 2 },
    ]);
  });
});

describe("totalDaGrade", () => {
  it("soma as pecas, que e o numero conferido com o cliente", () => {
    expect(
      totalDaGrade([
        { cor: "Azul", tamanho: "P", quantidade: 10 },
        { cor: "Azul", tamanho: "M", quantidade: 20 },
      ]),
    ).toBe(30);
  });

  it("grade vazia soma zero", () => {
    expect(totalDaGrade([])).toBe(0);
  });
});

describe("GRADES_SUGERIDAS", () => {
  it("todo atalho gera uma lista utilizavel", () => {
    for (const sugestao of GRADES_SUGERIDAS) {
      const tamanhos = separarLista(sugestao.tamanhos);
      expect(tamanhos.length, sugestao.rotulo).toBeGreaterThan(1);
      // Sem repetidos: o atalho nao pode criar coluna duplicada.
      expect(new Set(tamanhos).size, sugestao.rotulo).toBe(tamanhos.length);
    }
  });
});
