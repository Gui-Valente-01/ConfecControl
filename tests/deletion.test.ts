import { describe, expect, it } from "vitest";
import { describeBlockedDeletion, describeDeletion, pluralize } from "@/lib/deletion";

describe("pluralize", () => {
  it("usa o singular no 1", () => {
    expect(pluralize(1, "pedido", "pedidos")).toBe("1 pedido");
  });

  it("usa o plural no resto, inclusive no zero", () => {
    expect(pluralize(12, "pedido", "pedidos")).toBe("12 pedidos");
    expect(pluralize(0, "pedido", "pedidos")).toBe("0 pedidos");
  });
});

describe("describeDeletion", () => {
  it("diz o tipo e o nome do que vai sumir", () => {
    const texto = describeDeletion({ tipo: "a terceirizada", nome: "Costura Silva" });
    expect(texto).toContain('Excluir a terceirizada "Costura Silva"?');
    expect(texto).toContain("Não dá para desfazer.");
  });

  it("sem impacto, nao inventa lista para assustar", () => {
    const texto = describeDeletion({ tipo: "o serviço", nome: "Silk", apaga: [] });
    expect(texto).not.toContain("Isso apaga junto");
  });

  it("lista o que sai junto, com o numero certo", () => {
    const texto = describeDeletion({
      tipo: "o material",
      nome: "Malha PV preta",
      apaga: [
        { count: 3, singular: "peça usa esse material na ficha técnica", plural: "peças usam esse material na ficha técnica" },
        { count: 41, singular: "movimentação de estoque", plural: "movimentações de estoque" },
      ],
    });
    expect(texto).toContain("Isso apaga junto:");
    expect(texto).toContain("• 3 peças usam esse material na ficha técnica");
    expect(texto).toContain("• 41 movimentações de estoque");
  });

  it("esconde o que esta zerado", () => {
    const texto = describeDeletion({
      tipo: "o material",
      nome: "Linha nova",
      apaga: [
        { count: 0, singular: "peça", plural: "peças" },
        { count: 2, singular: "movimentação de estoque", plural: "movimentações de estoque" },
      ],
    });
    expect(texto).not.toContain("peça");
    expect(texto).toContain("• 2 movimentações de estoque");
  });
});

describe("describeBlockedDeletion", () => {
  it("nao bloqueia quando nada esta em uso", () => {
    expect(
      describeBlockedDeletion({
        tipo: "o cliente",
        nome: "Bar do Zé",
        bloqueios: [{ count: 0, singular: "pedido", plural: "pedidos" }],
        saida: "Apague os pedidos antes.",
      }),
    ).toBeNull();
  });

  it("explica o motivo, o numero e o proximo passo", () => {
    const texto = describeBlockedDeletion({
      tipo: "o cliente",
      nome: "Bar do Zé",
      bloqueios: [{ count: 12, singular: "pedido", plural: "pedidos" }],
      saida: "Apague os pedidos desse cliente antes, ou deixe o cadastro parado.",
    });
    expect(texto).toContain('Não dá para excluir o cliente "Bar do Zé"');
    expect(texto).toContain("há 12 pedidos");
    expect(texto).toContain("Apague os pedidos desse cliente antes");
  });

  it("junta mais de um motivo", () => {
    const texto = describeBlockedDeletion({
      tipo: "a peça",
      nome: "Boné trucker",
      bloqueios: [
        { count: 4, singular: "pedido", plural: "pedidos" },
        { count: 1, singular: "solicitação do portal", plural: "solicitações do portal" },
      ],
      saida: "Confira antes.",
    });
    expect(texto).toContain("há 4 pedidos e 1 solicitação do portal");
  });
});
