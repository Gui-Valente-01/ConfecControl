import { describe, expect, it } from "vitest";
import { centsToInput, currencyToCents, dateInputToDate, dateToInputValue, moneyToCents } from "@/lib/format";

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
