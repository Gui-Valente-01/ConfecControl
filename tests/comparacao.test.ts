import { describe, expect, it } from "vitest";
import {
  compararValores,
  periodoAnterior,
  textoVariacao,
  tomDaVariacao,
} from "@/lib/comparacao";

const reais = (centavos: number) => `R$ ${(centavos / 100).toFixed(2).replace(".", ",")}`;

// Instantes escritos no horário de Brasília, para o teste não depender do fuso
// da máquina (a Vercel roda em UTC; o computador do dono, em Brasília).
const brt = (texto: string) => new Date(`${texto}-03:00`);
const iso = (d: Date) => d.toISOString();

describe("periodoAnterior", () => {
  it("agosto inteiro compara com julho inteiro", () => {
    const anterior = periodoAnterior({ de: brt("2026-08-01T00:00:00"), ate: brt("2026-08-31T23:59:59.999") });
    expect(iso(anterior.de)).toBe(iso(brt("2026-07-01T00:00:00")));
    expect(iso(anterior.ate)).toBe(iso(brt("2026-07-31T23:59:59.999")));
  });

  it("setembro inteiro (30 dias) compara com agosto inteiro (31), e nao com 2 a 31 de agosto", () => {
    const anterior = periodoAnterior({ de: brt("2026-09-01T00:00:00"), ate: brt("2026-09-30T23:59:59.999") });
    expect(iso(anterior.de)).toBe(iso(brt("2026-08-01T00:00:00")));
    expect(iso(anterior.ate)).toBe(iso(brt("2026-08-31T23:59:59.999")));
  });

  it("mes ate hoje (1 a 14/09) compara com os mesmos dias do mes anterior (1 a 14/08)", () => {
    const anterior = periodoAnterior({ de: brt("2026-09-01T00:00:00"), ate: brt("2026-09-14T23:59:59.999") });
    expect(iso(anterior.de)).toBe(iso(brt("2026-08-01T00:00:00")));
    expect(iso(anterior.ate)).toBe(iso(brt("2026-08-14T23:59:59.999")));
  });

  it("mes ate hoje no dia 30 de marco corta no fim de fevereiro", () => {
    const anterior = periodoAnterior({ de: brt("2026-03-01T00:00:00"), ate: brt("2026-03-30T23:59:59.999") });
    expect(iso(anterior.de)).toBe(iso(brt("2026-02-01T00:00:00")));
    expect(iso(anterior.ate)).toBe(iso(brt("2026-02-28T23:59:59.999")));
  });

  it("janeiro compara com dezembro do ano anterior", () => {
    const anterior = periodoAnterior({ de: brt("2027-01-01T00:00:00"), ate: brt("2027-01-10T23:59:59.999") });
    expect(iso(anterior.de)).toBe(iso(brt("2026-12-01T00:00:00")));
    expect(iso(anterior.ate)).toBe(iso(brt("2026-12-10T23:59:59.999")));
  });

  it("trimestre inteiro compara com o trimestre anterior", () => {
    const anterior = periodoAnterior({ de: brt("2026-07-01T00:00:00"), ate: brt("2026-09-30T23:59:59.999") });
    expect(iso(anterior.de)).toBe(iso(brt("2026-04-01T00:00:00")));
    expect(iso(anterior.ate)).toBe(iso(brt("2026-06-30T23:59:59.999")));
  });

  it("semana inteira (segunda a domingo) compara com a semana anterior", () => {
    const anterior = periodoAnterior({ de: brt("2026-09-07T00:00:00"), ate: brt("2026-09-13T23:59:59.999") });
    expect(iso(anterior.de)).toBe(iso(brt("2026-08-31T00:00:00")));
    expect(iso(anterior.ate)).toBe(iso(brt("2026-09-06T23:59:59.999")));
  });

  it("semana ate quarta compara com segunda a quarta da semana passada, e nao com quinta a domingo", () => {
    const anterior = periodoAnterior({ de: brt("2026-09-14T00:00:00"), ate: brt("2026-09-16T23:59:59.999") });
    expect(iso(anterior.de)).toBe(iso(brt("2026-09-07T00:00:00")));
    expect(iso(anterior.ate)).toBe(iso(brt("2026-09-09T23:59:59.999")));
  });

  it("um dia so compara com o dia anterior", () => {
    const anterior = periodoAnterior({ de: brt("2026-08-05T00:00:00"), ate: brt("2026-08-05T23:59:59.999") });
    expect(iso(anterior.de)).toBe(iso(brt("2026-08-04T00:00:00")));
    expect(iso(anterior.ate)).toBe(iso(brt("2026-08-04T23:59:59.999")));
  });

  it("intervalo qualquer compara com o mesmo tamanho logo antes, sem sobrepor", () => {
    const atual = { de: brt("2026-08-10T00:00:00"), ate: brt("2026-08-20T23:59:59.999") };
    const anterior = periodoAnterior(atual);
    expect(iso(anterior.ate)).toBe(iso(new Date(atual.de.getTime() - 1)));
    expect(anterior.ate.getTime() - anterior.de.getTime()).toBe(atual.ate.getTime() - atual.de.getTime());
  });

  it("o periodo anterior nunca encosta no atual", () => {
    const casos = [
      { de: brt("2026-09-01T00:00:00"), ate: brt("2026-09-14T23:59:59.999") },
      { de: brt("2026-09-14T00:00:00"), ate: brt("2026-09-16T23:59:59.999") },
      { de: brt("2026-02-01T00:00:00"), ate: brt("2026-02-28T23:59:59.999") },
      { de: brt("2026-05-13T00:00:00"), ate: brt("2026-06-02T23:59:59.999") },
    ];
    for (const atual of casos) {
      const anterior = periodoAnterior(atual);
      expect(anterior.ate.getTime()).toBeLessThan(atual.de.getTime());
      expect(anterior.de.getTime()).toBeLessThan(anterior.ate.getTime());
    }
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
