import { describe, expect, it } from "vitest";
import {
  computeBalance,
  resolveReceiptAmount,
  resolveStatusFromReceipts,
  sumReceipts,
} from "@/lib/payments";

// Cenário do pedido #1009: R$ 750, entrada de R$ 225, saldo de R$ 525.
const entrada = { amountInCents: 22500 };
const saldo = { amountInCents: 52500 };
const TOTAL = 75000;

describe("sumReceipts", () => {
  it("soma os recebimentos", () => {
    expect(sumReceipts([entrada, saldo])).toBe(75000);
  });

  it("pedido sem recebimento soma zero", () => {
    expect(sumReceipts([])).toBe(0);
  });

  it("ignora valor negativo, que seria dado corrompido", () => {
    expect(sumReceipts([entrada, { amountInCents: -1000 }])).toBe(22500);
  });
});

describe("computeBalance", () => {
  it("so a entrada deixa saldo", () => {
    expect(computeBalance(TOTAL, [entrada])).toBe(52500);
  });

  it("entrada mais saldo quita", () => {
    expect(computeBalance(TOTAL, [entrada, saldo])).toBe(0);
  });

  it("varios recebimentos no mesmo pedido", () => {
    const parcelas = [{ amountInCents: 25000 }, { amountInCents: 25000 }, { amountInCents: 25000 }];
    expect(computeBalance(TOTAL, parcelas)).toBe(0);
    expect(computeBalance(TOTAL, parcelas.slice(0, 2))).toBe(25000);
  });

  it("pagar a mais nao vira divida negativa", () => {
    expect(computeBalance(TOTAL, [{ amountInCents: 90000 }])).toBe(0);
  });

  it("sem recebimento, o saldo e o total", () => {
    expect(computeBalance(TOTAL, [])).toBe(75000);
  });
});

describe("resolveStatusFromReceipts", () => {
  it("sem recebimento fica pendente", () => {
    expect(resolveStatusFromReceipts(TOTAL, [])).toBe("PENDING");
  });

  it("so a entrada fica parcial", () => {
    expect(resolveStatusFromReceipts(TOTAL, [entrada])).toBe("PARTIAL");
  });

  it("soma igual ao total quita", () => {
    expect(resolveStatusFromReceipts(TOTAL, [entrada, saldo])).toBe("PAID");
  });

  it("recebido a mais tambem quita", () => {
    expect(resolveStatusFromReceipts(TOTAL, [{ amountInCents: 90000 }])).toBe("PAID");
  });
});

describe("resolveReceiptAmount", () => {
  it("sem valor digitado, recebe o saldo inteiro", () => {
    expect(resolveReceiptAmount(52500, null)).toBe(52500);
    expect(resolveReceiptAmount(52500, 0)).toBe(52500);
  });

  it("aceita recebimento parcial", () => {
    expect(resolveReceiptAmount(52500, 20000)).toBe(20000);
  });

  it("nao registra acima do saldo", () => {
    expect(resolveReceiptAmount(52500, 90000)).toBe(52500);
  });

  it("pedido quitado nao aceita mais nada", () => {
    expect(resolveReceiptAmount(0, 10000)).toBe(0);
  });
});
