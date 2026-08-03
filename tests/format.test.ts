import { describe, expect, it } from "vitest";
import { centsToCurrency, centsToInput, currencyToCents, dateInputToDate, dateToInputValue, moneyToCents, priceExpressionToCents } from "@/lib/format";

describe("currencyToCents", () => {
  it("converte valores no formato brasileiro", () => {
    expect(currencyToCents("1.000,00")).toBe(100000);
    expect(currencyToCents("45,50")).toBe(4550);
    expect(currencyToCents("R$ 12,34")).toBe(1234);
  });

  it("aceita valor inteiro sem centavos", () => {
    expect(currencyToCents("12")).toBe(1200);
  });

  it("retorna 0 para entrada vazia ou inválida", () => {
    expect(currencyToCents("")).toBe(0);
    expect(currencyToCents("abc")).toBe(0);
  });
});

describe("centsToInput", () => {
  it("formata centavos para preencher inputs", () => {
    expect(centsToInput(12000)).toBe("120,00");
    expect(centsToInput(4550)).toBe("45,50");
    expect(centsToInput(0)).toBe("0,00");
  });
});

describe("datas de input", () => {
  it("converte ida e volta yyyy-mm-dd", () => {
    const date = dateInputToDate("2026-07-06");
    expect(date).not.toBeNull();
    expect(dateToInputValue(date)).toBe("2026-07-06");
  });

  it("retorna null para valor vazio ou inválido", () => {
    expect(dateInputToDate("")).toBeNull();
    expect(dateInputToDate("data-invalida")).toBeNull();
  });
});

describe("moneyToCents", () => {
  it("converte igual ao currencyToCents em valores normais", () => {
    expect(moneyToCents("45,50")).toBe(4550);
    expect(moneyToCents("R$ 1.000,00")).toBe(100000);
  });

  it("zera valor negativo em vez de contaminar totais", () => {
    expect(moneyToCents("-50")).toBe(0);
    expect(moneyToCents("-1.234,56")).toBe(0);
    expect(moneyToCents("R$ -20,00")).toBe(0);
  });

  it("mantem zero e entrada invalida em zero", () => {
    expect(moneyToCents("0")).toBe(0);
    expect(moneyToCents("")).toBe(0);
    expect(moneyToCents("abc")).toBe(0);
  });
});

describe("priceExpressionToCents", () => {
  it("resolve multiplicacao com x e com *", () => {
    expect(priceExpressionToCents("4x100")).toBe(40000);
    expect(priceExpressionToCents("4*100")).toBe(40000);
    expect(priceExpressionToCents("4 X 100")).toBe(40000);
  });

  it("aceita centavos no valor unitario", () => {
    expect(priceExpressionToCents("4,50x100")).toBe(45000);
    expect(priceExpressionToCents("R$ 2,25 x 40")).toBe(9000);
  });

  it("valor simples continua funcionando", () => {
    expect(priceExpressionToCents("400,00")).toBe(40000);
    expect(priceExpressionToCents("400")).toBe(40000);
  });

  it("campo pela metade cai para o valor simples; quantidade zero da zero", () => {
    expect(priceExpressionToCents("4x")).toBe(400);
    expect(priceExpressionToCents("4x0")).toBe(0);
  });

  it("nao aceita negativo", () => {
    expect(priceExpressionToCents("-4x100")).toBe(0);
  });
});

// CC-02: o dono digita dos dois jeitos e os dois precisam funcionar.
describe("currencyToCents - ponto e virgula", () => {
  it("virgula como decimal", () => {
    expect(currencyToCents("3,25")).toBe(325);
    expect(currencyToCents("5,50")).toBe(550);
    expect(currencyToCents("10,5")).toBe(1050);
    expect(currencyToCents("43,25")).toBe(4325);
  });

  it("ponto como decimal (era o bug de 100x)", () => {
    expect(currencyToCents("3.25")).toBe(325);
    expect(currencyToCents("5.50")).toBe(550);
    expect(currencyToCents("10.5")).toBe(1050);
    expect(currencyToCents("43.25")).toBe(4325);
  });

  it("ponto como milhar quando tem 3 digitos depois", () => {
    expect(currencyToCents("1.234")).toBe(123400);
    expect(currencyToCents("1.234.567")).toBe(123456700);
  });

  it("formato brasileiro completo", () => {
    expect(currencyToCents("1.234,56")).toBe(123456);
    expect(currencyToCents("R$ 1.234,56")).toBe(123456);
  });

  it("formato com ponto decimal e milhar junto", () => {
    expect(currencyToCents("1234.56")).toBe(123456);
  });

  it("inteiro sem separador", () => {
    expect(currencyToCents("400")).toBe(40000);
    expect(currencyToCents("R$ 40")).toBe(4000);
  });

  it("vazio e invalido dao zero", () => {
    expect(currencyToCents("")).toBe(0);
    expect(currencyToCents("abc")).toBe(0);
  });

  it("negativo mantem o sinal para quem precisa detectar", () => {
    expect(currencyToCents("-3,25")).toBe(-325);
    expect(currencyToCents("-3.25")).toBe(-325);
  });
});

// CC-01: exibicao nunca mais arredonda.
describe("centsToCurrency - centavos", () => {
  it("mostra os centavos", () => {
    expect(centsToCurrency(325)).toContain("3,25");
    expect(centsToCurrency(550)).toContain("5,50");
    expect(centsToCurrency(1050)).toContain("10,50");
    expect(centsToCurrency(4325)).toContain("43,25");
  });

  it("valor inteiro mostra duas casas", () => {
    expect(centsToCurrency(4000)).toContain("40,00");
  });
});

// CC-03: salvar -> reabrir -> salvar nao pode mudar o valor.
describe("ida e volta do valor", () => {
  it("centsToInput e currencyToCents sao inversos", () => {
    for (const cents of [325, 550, 1050, 4325, 123456, 100, 1]) {
      expect(currencyToCents(centsToInput(cents))).toBe(cents);
    }
  });

  it("dez edicoes seguidas nao alteram o valor", () => {
    let cents = 1050;
    for (let i = 0; i < 10; i++) cents = currencyToCents(centsToInput(cents));
    expect(cents).toBe(1050);
  });
});
