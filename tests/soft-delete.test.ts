import { describe, expect, it } from "vitest";
import { aplicarFiltro, eLeitura, temLixeira } from "@/lib/soft-delete";

describe("temLixeira", () => {
  it("reconhece os cadastros que vao para a lixeira", () => {
    expect(temLixeira("Client")).toBe(true);
    expect(temLixeira("Material")).toBe(true);
    expect(temLixeira("Service")).toBe(true);
  });

  it("nao mexe no que nao tem lixeira", () => {
    // Pedido, recebimento e tarefa de bancada seguem a regra antiga.
    expect(temLixeira("Order")).toBe(false);
    expect(temLixeira("Payment")).toBe(false);
    expect(temLixeira(undefined)).toBe(false);
  });
});

describe("eLeitura", () => {
  it("cobre as formas de ler que aceitam filtro livre", () => {
    for (const op of ["findFirst", "findFirstOrThrow", "findMany", "count", "aggregate", "groupBy"]) {
      expect(eLeitura(op)).toBe(true);
    }
  });

  it("findUnique fica de fora: o where dela so aceita campo unico", () => {
    // Injetar deletedAt ali quebraria em tempo de execucao. Os lugares que
    // usam findUnique (login do portal) checam na mao.
    expect(eLeitura("findUnique")).toBe(false);
    expect(eLeitura("findUniqueOrThrow")).toBe(false);
  });

  it("escrita nao entra: apagar e restaurar precisam enxergar o apagado", () => {
    for (const op of ["update", "updateMany", "create", "delete", "deleteMany", "upsert"]) {
      expect(eLeitura(op)).toBe(false);
    }
  });
});

describe("aplicarFiltro", () => {
  it("esconde o apagado quando ninguem pediu nada", () => {
    expect(aplicarFiltro(undefined)).toEqual({ where: { deletedAt: null } });
    expect(aplicarFiltro({})).toEqual({ where: { deletedAt: null } });
  });

  it("mantem o filtro de empresa, que e o que separa um cliente do outro", () => {
    expect(aplicarFiltro({ where: { companyId: "abc" } })).toEqual({
      where: { companyId: "abc", deletedAt: null },
    });
  });

  it("preserva o resto dos argumentos", () => {
    const saida = aplicarFiltro({ where: { companyId: "abc" }, orderBy: { name: "asc" }, take: 10 } as never);
    expect(saida).toEqual({ where: { companyId: "abc", deletedAt: null }, orderBy: { name: "asc" }, take: 10 });
  });

  it("quem pede deletedAt na mao manda: e assim que a lixeira se lista", () => {
    expect(aplicarFiltro({ where: { companyId: "abc", deletedAt: { not: null } } })).toEqual({
      where: { companyId: "abc", deletedAt: { not: null } },
    });
  });

  it("pedir deletedAt null explicitamente tambem passa sem duplicar", () => {
    expect(aplicarFiltro({ where: { deletedAt: null } })).toEqual({ where: { deletedAt: null } });
  });

  it("nao altera o objeto recebido", () => {
    const original = { where: { companyId: "abc" } };
    aplicarFiltro(original);
    expect(original).toEqual({ where: { companyId: "abc" } });
  });
});
