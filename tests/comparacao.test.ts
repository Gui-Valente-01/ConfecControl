import { describe, expect, it } from "vitest";
import {
  compararValores,
  periodoAnterior,
  textoVariacao,
  tomDaVariacao,
} from "@/lib/comparacao";

const reais = (centavos: number) => `R$ ${(centavos / 100).toFixed(2).replace(".", ",")}`;

describe("periodoAnterior", () => {
  it("agosto inteiro devolve julho inteiro, do mesmo tamanho", () => {
    const atual = { de: new Date(2026, 7, 1, 0, 0, 0), ate: new Date(2026, 7, 31, 23, 59, 59) };
    const anterior = periodoAnterior(atual);
    expect(anterior.ate.getTime()).toBe(atual.de.getTime() - 1);
    // Mesma duracao, com folga de 1ms pela borda.
    const dur = (p: { de: Date; ate: Date }) => p.ate.getTime() - p.de.getTime();
    expect(Math.abs(dur(anterior) - dur(atual))).toBeLessThanOrEqual(1);
  });

  it("uma semana compara com a semana anterior, e nao com um mes", () => {
    const atual = { de: new Date(2026, 7, 10), ate: new Date(2026, 7, 16, 23, 59, 59) };
    const anterior = periodoAnterior(atual);
    const dias = (anterior.ate.getTime() - anterior.de.getTime()) / 86400000;
    expect(Math.round(dias)).toBe(7);
    expect(anterior.ate < atual.de).toBe(true);
  });

  it("um dia so compara com o dia anterior", () => {
    const atual = { de: new Date(2026, 7, 5, 0, 0, 0), ate: new Date(2026, 7, 5, 23, 59, 59) };
    const anterior = periodoAnterior(atual);
    expect(anterior.de.getDate()).toBe(4);
    expect(anterior.ate.getDate()).toBe(4);
  });
});

describe("compararValores", () => {
  it("subiu", () => {
    const v = compararValores(2300000, 1800000);
    expect(v.direcao).toBe("subiu");
    expect(v.diferenca).toBe(500000);
    expect(v.percentual).toBe(28);
    expect(v.temBase).toBe(true);
  });

  it("caiu", () => {
    const v = compararValores(900000, 1200000);
    expect(v.direcao).toBe("caiu");
    expect(v.diferenca).toBe(-300000);
    expect(v.percentual).toBe(-25);
  });

  it("igual", () => {
    const v = compararValores(500000, 500000);
    expect(v.direcao).toBe("igual");
    expect(v.diferenca).toBe(0);
  });

  it("sem base nao inventa porcentagem: nao subiu 100%, nao havia nada antes", () => {
    const v = compararValores(450000, 0);
    expect(v.temBase).toBe(false);
    expect(v.percentual).toBeNull();
    expect(v.direcao).toBe("subiu");
  });

  it("zero contra zero e igual, e continua sem base", () => {
    const v = compararValores(0, 0);
    expect(v.direcao).toBe("igual");
    expect(v.temBase).toBe(false);
  });

  it("cair de um numero para zero conta como queda de 100%", () => {
    const v = compararValores(0, 800000);
    expect(v.percentual).toBe(-100);
    expect(v.direcao).toBe("caiu");
  });
});

describe("textoVariacao", () => {
  it("diz quanto e quantos por cento", () => {
    const texto = textoVariacao(compararValores(2300000, 1800000), reais);
    expect(texto).toContain("+R$ 5000,00");
    expect(texto).toContain("+28%");
    expect(texto).toContain("período anterior");
  });

  it("queda aparece com sinal de menos", () => {
    const texto = textoVariacao(compararValores(900000, 1200000), reais);
    expect(texto.startsWith("−")).toBe(true);
    expect(texto).toContain("25%");
  });

  it("primeiro periodo de uso avisa em vez de mostrar numero sem sentido", () => {
    expect(textoVariacao(compararValores(450000, 0), reais)).toContain("primeiro período");
    expect(textoVariacao(compararValores(0, 0), reais)).toContain("sem período anterior");
  });

  it("igual diz igual, sem porcentagem de zero", () => {
    expect(textoVariacao(compararValores(100, 100), reais)).toBe("igual ao período anterior");
  });

  it("serve para contagem, e nao so para dinheiro", () => {
    const texto = textoVariacao(compararValores(12, 8), (n) => `${n} pedidos`);
    expect(texto).toContain("+4 pedidos");
  });
});

describe("tomDaVariacao", () => {
  it("faturamento subindo e bom", () => {
    expect(tomDaVariacao(compararValores(200, 100), "subir")).toBe("bom");
  });

  it("faturamento caindo e ruim", () => {
    expect(tomDaVariacao(compararValores(100, 200), "subir")).toBe("ruim");
  });

  it("atraso subindo e RUIM, ainda que o numero suba", () => {
    expect(tomDaVariacao(compararValores(9, 3), "cair")).toBe("ruim");
  });

  it("atraso caindo e bom", () => {
    expect(tomDaVariacao(compararValores(3, 9), "cair")).toBe("bom");
  });

  it("sem base ou sem mudanca fica neutro: nao pinta de verde nem de vermelho", () => {
    expect(tomDaVariacao(compararValores(100, 0), "subir")).toBe("neutro");
    expect(tomDaVariacao(compararValores(100, 100), "subir")).toBe("neutro");
  });
});
