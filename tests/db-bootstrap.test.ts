import { describe, expect, it, vi } from "vitest";

// O cliente real não é usado: o banco falso abaixo entra no lugar da transação.
vi.mock("@/lib/prisma", () => ({ prisma: {} }));

import { prepararContaNova } from "@/lib/db-bootstrap";

// O que este arquivo protege
// ---------------------------------------------------------------------------
// A ligação entre o segmento do convite e o que é gravado na conta nova. Os
// modelos em si são testados em modelos-de-conta.test.ts; aqui é o caminho até
// o banco: o segmento certo, as linhas certas, e nenhuma chamada a mais.

function bancoFalso() {
  const gravado = { etapas: [] as { name: string }[][], servicos: [] as { name: string }[][] };
  const db = {
    productionStage: {
      createMany: vi.fn(async ({ data }: { data: { name: string }[] }) => {
        gravado.etapas.push(data);
        return { count: data.length };
      }),
    },
    service: {
      createMany: vi.fn(async ({ data }: { data: { name: string }[] }) => {
        gravado.servicos.push(data);
        return { count: data.length };
      }),
    },
  };
  // O tipo do parâmetro é o do Prisma; o falso implementa só o que é chamado.
  return { db: db as unknown as Parameters<typeof prepararContaNova>[2], gravado, chamadas: db };
}

describe("prepararContaNova", () => {
  it("convite de fábrica de boné: etapas e serviços do ramo, na empresa certa", async () => {
    const { db, gravado } = bancoFalso();
    await prepararContaNova("empresa-1", "bones", db);

    expect(gravado.etapas).toHaveLength(1);
    expect(gravado.etapas[0].map((e) => e.name)).toContain("Costura e montagem");
    expect(gravado.servicos).toHaveLength(1);
    expect(gravado.servicos[0].map((s) => s.name)).toContain("Bordado frontal");
    for (const linha of [...gravado.etapas[0], ...gravado.servicos[0]]) {
      expect(linha).toMatchObject({ companyId: "empresa-1" });
    }
  });

  it("convite sem segmento abre a conta de sempre, sem serviço nenhum", async () => {
    const { db, gravado, chamadas } = bancoFalso();
    await prepararContaNova("empresa-1", null, db);

    expect(gravado.etapas[0].map((e) => e.name)).toEqual([
      "Recebido",
      "Aguardando material",
      "Corte",
      "Costura",
      "Bordado/estampa",
      "Acabamento",
      "Pronto",
      "Entregue",
    ]);
    // createMany com lista vazia é uma ida ao banco à toa dentro da transação.
    expect(chamadas.service.createMany).not.toHaveBeenCalled();
  });

  it("segmento com catálogo vazio não chama o banco para serviço", async () => {
    const { db, chamadas } = bancoFalso();
    await prepararContaNova("empresa-1", "moda", db);
    expect(chamadas.service.createMany).not.toHaveBeenCalled();
  });
});
