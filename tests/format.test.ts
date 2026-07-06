import { describe, expect, it } from "vitest";
import { centsToInput, currencyToCents, dateInputToDate, dateToInputValue } from "@/lib/format";

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
