import { describe, expect, it } from "vitest";
import {
  descreverFiltro,
  eFiltroPedido,
  filtrarPedidos,
  pedidoCasaFiltro,
  type PedidoFiltravel,
} from "@/lib/order-filters";

const HOJE = new Date(2026, 7, 4, 10, 0); // 4 de agosto de 2026

function pedido(partes: Partial<PedidoFiltravel> = {}): PedidoFiltravel {
  return {
    status: "RECEIVED",
    paymentStatus: "PENDING",
    deliveryDate: new Date(2026, 7, 20),
    totalAmountInCents: 75000,
    paidAmountInCents: 0,
    ...partes,
  };
}

describe("eFiltroPedido", () => {
  it("aceita os filtros que a tela oferece", () => {
    for (const f of ["atrasados", "hoje", "material", "producao", "prontos", "receber"]) {
      expect(eFiltroPedido(f)).toBe(true);
    }
  });

  it("recusa qualquer coisa digitada na URL", () => {
    expect(eFiltroPedido("tudo")).toBe(false);
    expect(eFiltroPedido("")).toBe(false);
    expect(eFiltroPedido(null)).toBe(false);
    expect(eFiltroPedido(undefined)).toBe(false);
  });
});

describe("atrasados", () => {
  it("pega o prazo vencido que ainda nao foi entregue", () => {
    expect(pedidoCasaFiltro(pedido({ deliveryDate: new Date(2026, 7, 1) }), "atrasados", HOJE)).toBe(true);
  });

  it("entregue nao esta atrasado, mesmo com prazo vencido", () => {
    const p = pedido({ deliveryDate: new Date(2026, 7, 1), status: "DELIVERED" });
    expect(pedidoCasaFiltro(p, "atrasados", HOJE)).toBe(false);
  });

  it("prazo no futuro nao entra", () => {
    expect(pedidoCasaFiltro(pedido(), "atrasados", HOJE)).toBe(false);
  });

  it("pedido sem prazo nao entra: nao da para atrasar o que nao foi combinado", () => {
    expect(pedidoCasaFiltro(pedido({ deliveryDate: null }), "atrasados", HOJE)).toBe(false);
  });
});

describe("hoje", () => {
  it("pega o prazo de hoje, em qualquer hora do dia", () => {
    expect(pedidoCasaFiltro(pedido({ deliveryDate: new Date(2026, 7, 4, 23, 30) }), "hoje", HOJE)).toBe(true);
    expect(pedidoCasaFiltro(pedido({ deliveryDate: new Date(2026, 7, 4, 0, 1) }), "hoje", HOJE)).toBe(true);
  });

  it("ontem e amanha ficam de fora", () => {
    expect(pedidoCasaFiltro(pedido({ deliveryDate: new Date(2026, 7, 3) }), "hoje", HOJE)).toBe(false);
    expect(pedidoCasaFiltro(pedido({ deliveryDate: new Date(2026, 7, 5) }), "hoje", HOJE)).toBe(false);
  });

  it("o que ja foi entregue sai da lista de hoje", () => {
    const p = pedido({ deliveryDate: new Date(2026, 7, 4), status: "DELIVERED" });
    expect(pedidoCasaFiltro(p, "hoje", HOJE)).toBe(false);
  });
});

describe("material, producao e prontos", () => {
  it("aguardando material", () => {
    expect(pedidoCasaFiltro(pedido({ status: "WAITING_MATERIAL" }), "material", HOJE)).toBe(true);
    expect(pedidoCasaFiltro(pedido({ status: "SEWING" }), "material", HOJE)).toBe(false);
  });

  it("em producao cobre corte, costura, bordado e acabamento", () => {
    for (const s of ["CUTTING", "SEWING", "EMBROIDERY_PRINT", "FINISHING"] as const) {
      expect(pedidoCasaFiltro(pedido({ status: s }), "producao", HOJE)).toBe(true);
    }
    expect(pedidoCasaFiltro(pedido({ status: "RECEIVED" }), "producao", HOJE)).toBe(false);
    expect(pedidoCasaFiltro(pedido({ status: "READY" }), "producao", HOJE)).toBe(false);
  });

  it("prontos so pega o que terminou e nao foi entregue", () => {
    expect(pedidoCasaFiltro(pedido({ status: "READY" }), "prontos", HOJE)).toBe(true);
    expect(pedidoCasaFiltro(pedido({ status: "DELIVERED" }), "prontos", HOJE)).toBe(false);
  });
});

describe("receber", () => {
  it("pega quem ainda tem saldo em aberto", () => {
    expect(pedidoCasaFiltro(pedido({ paidAmountInCents: 0 }), "receber", HOJE)).toBe(true);
    expect(pedidoCasaFiltro(pedido({ paidAmountInCents: 22500 }), "receber", HOJE)).toBe(true);
  });

  it("quitado sai da lista", () => {
    expect(pedidoCasaFiltro(pedido({ paidAmountInCents: 75000 }), "receber", HOJE)).toBe(false);
  });

  it("olha o saldo, e nao a etiqueta: marcado como pago mas devendo continua aparecendo", () => {
    const p = pedido({ paymentStatus: "PAID", paidAmountInCents: 50000 });
    expect(pedidoCasaFiltro(p, "receber", HOJE)).toBe(true);
  });

  it("entregue sem pagar continua na lista: esse dinheiro nao pode sumir da vista", () => {
    const p = pedido({ status: "DELIVERED", paidAmountInCents: 0 });
    expect(pedidoCasaFiltro(p, "receber", HOJE)).toBe(true);
  });
});

describe("cancelado", () => {
  it("nao aparece em lista de trabalho nenhuma", () => {
    const p = pedido({ status: "CANCELED", deliveryDate: new Date(2026, 7, 1), paidAmountInCents: 0 });
    for (const f of ["atrasados", "hoje", "material", "producao", "prontos", "receber"] as const) {
      expect(pedidoCasaFiltro(p, f, HOJE), `filtro ${f}`).toBe(false);
    }
  });
});

describe("filtrarPedidos", () => {
  const lista = [
    pedido({ status: "READY" }),
    pedido({ status: "WAITING_MATERIAL" }),
    pedido({ deliveryDate: new Date(2026, 7, 1) }),
  ];

  it("sem filtro devolve tudo", () => {
    expect(filtrarPedidos(lista, null, HOJE)).toHaveLength(3);
  });

  it("filtra pelo pedido certo", () => {
    expect(filtrarPedidos(lista, "prontos", HOJE)).toHaveLength(1);
    expect(filtrarPedidos(lista, "atrasados", HOJE)).toHaveLength(1);
  });
});

describe("descreverFiltro", () => {
  it("cada filtro explica o que mostra e o que dizer quando nao ha nada", () => {
    for (const f of ["atrasados", "hoje", "material", "producao", "prontos", "receber"] as const) {
      const d = descreverFiltro(f);
      expect(d.titulo.length).toBeGreaterThan(0);
      expect(d.explicacao.length).toBeGreaterThan(0);
      expect(d.vazio.length).toBeGreaterThan(0);
    }
  });

  it("a mensagem de lista vazia e positiva, nao um erro", () => {
    expect(descreverFiltro("atrasados").vazio).toContain("Tudo dentro do prazo");
  });
});
