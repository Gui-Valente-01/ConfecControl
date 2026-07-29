import { describe, expect, it } from "vitest";
import { parseItems, parseServices, resolvePaymentStatus } from "@/lib/order-items";

describe("parseItems", () => {
  it("converte itens válidos com preço em número (reais) para centavos", () => {
    const items = parseItems(
      JSON.stringify([
        { productId: "p1", description: "Camiseta", size: "M", color: "Branca", quantity: 10, unitPrice: 45.5 },
      ]),
    );
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      productId: "p1",
      description: "Camiseta",
      quantity: 10,
      unitPriceInCents: 4550,
      totalPriceInCents: 45500,
    });
  });

  it("aceita preço como string no formato brasileiro", () => {
    const items = parseItems(JSON.stringify([{ description: "Calça", quantity: 2, unitPrice: "1.200,00" }]));
    expect(items[0].unitPriceInCents).toBe(120000);
    expect(items[0].totalPriceInCents).toBe(240000);
  });

  it("normaliza quantidade fracionada ou negativa", () => {
    const items = parseItems(
      JSON.stringify([
        { description: "A", quantity: 2.9, unitPrice: 10 },
        { description: "B", quantity: -3, unitPrice: 10 },
      ]),
    );
    expect(items).toHaveLength(1); // item com quantidade <= 0 é descartado
    expect(items[0].quantity).toBe(2); // 2.9 vira 2 (floor)
  });

  it("descarta itens sem produto e sem descrição", () => {
    const items = parseItems(JSON.stringify([{ description: "  ", quantity: 5, unitPrice: 10 }]));
    expect(items).toHaveLength(0);
  });

  it("retorna lista vazia para JSON inválido ou não-array", () => {
    expect(parseItems("nada a ver")).toEqual([]);
    expect(parseItems('{"a":1}')).toEqual([]);
  });
});

describe("resolvePaymentStatus", () => {
  it("sem pagamento fica pendente", () => {
    expect(resolvePaymentStatus(0, 10000)).toBe("PENDING");
    expect(resolvePaymentStatus(-5, 10000)).toBe("PENDING");
  });

  it("pagamento parcial", () => {
    expect(resolvePaymentStatus(5000, 10000)).toBe("PARTIAL");
  });

  it("pagamento total ou acima quita o pedido", () => {
    expect(resolvePaymentStatus(10000, 10000)).toBe("PAID");
    expect(resolvePaymentStatus(15000, 10000)).toBe("PAID");
  });
});

describe("parseServices", () => {
  it("le nome e valor digitados no pedido", () => {
    const out = parseServices(JSON.stringify([{ name: "Silk 3 cores", price: "400,00" }]));
    expect(out).toEqual([{ name: "Silk 3 cores", priceInCents: 40000 }]);
  });

  it("descarta linha em branco mas mantem servico de cortesia", () => {
    const out = parseServices(
      JSON.stringify([
        { name: "  ", price: "50" },
        { name: "Bordado cortesia", price: "" },
      ]),
    );
    expect(out).toEqual([{ name: "Bordado cortesia", priceInCents: 0 }]);
  });

  it("aceita numero alem de texto", () => {
    expect(parseServices(JSON.stringify([{ name: "Corte", price: 12.5 }]))).toEqual([
      { name: "Corte", priceInCents: 1250 },
    ]);
  });

  it("nao quebra com entrada invalida", () => {
    expect(parseServices("nao e json")).toEqual([]);
    expect(parseServices("{}")).toEqual([]);
  });
});
