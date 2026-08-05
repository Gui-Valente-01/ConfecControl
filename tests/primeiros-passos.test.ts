import { describe, expect, it } from "vitest";
import {
  deveMostrar,
  montarPassos,
  proximoPasso,
  quantosFeitos,
  rotuloProgresso,
  type ContagensIniciais,
} from "@/lib/primeiros-passos";

const zerado: ContagensIniciais = {
  pecas: 0,
  materiais: 0,
  pedidos: 0,
  pedidosMovidos: 0,
  recebimentos: 0,
};

const tudo: ContagensIniciais = {
  pecas: 3,
  materiais: 5,
  pedidos: 2,
  pedidosMovidos: 1,
  recebimentos: 4,
};

describe("montarPassos", () => {
  it("sao cinco passos, na ordem que faz sentido fazer", () => {
    const passos = montarPassos(zerado);
    expect(passos.map((p) => p.chave)).toEqual(["pecas", "materiais", "pedido", "producao", "pagamento"]);
  });

  it("empresa nova nao tem nada feito", () => {
    expect(quantosFeitos(montarPassos(zerado))).toBe(0);
  });

  it("cada passo diz o porque, nao so o que fazer", () => {
    for (const p of montarPassos(zerado)) {
      expect(p.porque.length).toBeGreaterThan(20);
      expect(p.href.startsWith("/")).toBe(true);
    }
  });

  it("marca sozinho conforme o dado aparece: nao ha 'concluir' para clicar", () => {
    const passos = montarPassos({ ...zerado, pecas: 1, materiais: 2 });
    expect(passos.find((p) => p.chave === "pecas")?.feito).toBe(true);
    expect(passos.find((p) => p.chave === "materiais")?.feito).toBe(true);
    expect(passos.find((p) => p.chave === "pedido")?.feito).toBe(false);
  });

  it("mover a producao e registrar pagamento contam separado do pedido", () => {
    const soPedido = montarPassos({ ...zerado, pedidos: 1 });
    expect(soPedido.find((p) => p.chave === "pedido")?.feito).toBe(true);
    expect(soPedido.find((p) => p.chave === "producao")?.feito).toBe(false);
    expect(soPedido.find((p) => p.chave === "pagamento")?.feito).toBe(false);
  });
});

describe("proximoPasso", () => {
  it("empresa nova comeca pelas pecas", () => {
    expect(proximoPasso(montarPassos(zerado))?.chave).toBe("pecas");
  });

  it("pula o que ja esta feito", () => {
    expect(proximoPasso(montarPassos({ ...zerado, pecas: 2, materiais: 1 }))?.chave).toBe("pedido");
  });

  it("nada pendente devolve null", () => {
    expect(proximoPasso(montarPassos(tudo))).toBeNull();
  });

  it("pega o primeiro pendente mesmo com um posterior ja feito", () => {
    // Quem cadastrou peça e já recebeu dinheiro ainda precisa do material.
    const passos = montarPassos({ ...zerado, pecas: 1, recebimentos: 3 });
    expect(proximoPasso(passos)?.chave).toBe("materiais");
  });
});

describe("deveMostrar", () => {
  it("aparece para quem ainda tem passo pendente", () => {
    expect(deveMostrar(montarPassos(zerado), false)).toBe(true);
  });

  it("some sozinha quando tudo esta feito", () => {
    expect(deveMostrar(montarPassos(tudo), false)).toBe(false);
  });

  it("some quando a pessoa mandou esconder, mesmo com passo pendente", () => {
    expect(deveMostrar(montarPassos(zerado), true)).toBe(false);
  });
});

describe("rotuloProgresso", () => {
  it("diz quanto ja foi e quanto e o total", () => {
    expect(rotuloProgresso(montarPassos(zerado))).toBe("0 de 5 concluídos");
    expect(rotuloProgresso(montarPassos({ ...zerado, pecas: 1, materiais: 1, pedidos: 1 }))).toBe("3 de 5 concluídos");
    expect(rotuloProgresso(montarPassos(tudo))).toBe("5 de 5 concluídos");
  });
});
