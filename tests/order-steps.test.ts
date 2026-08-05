import { describe, expect, it } from "vitest";
import {
  ETAPAS_PEDIDO,
  TOTAL_ETAPAS,
  impedimentoDaEtapa,
  rotuloProgresso,
  ultimaEtapaLiberada,
  type DadosPedido,
} from "@/lib/order-steps";

function dados(partes: Partial<DadosPedido> = {}): DadosPedido {
  return {
    clientId: "cli-1",
    itens: [{ descricao: "Boné trucker", productId: "p1", quantidade: 120 }],
    prazo: "2026-08-20",
    dataPedido: "2026-08-04",
    totalInCents: 540000,
    entradaInCents: 0,
    ...partes,
  };
}

const ETAPA = Object.fromEntries(ETAPAS_PEDIDO.map((e, i) => [e.chave, i])) as Record<string, number>;

describe("estrutura das etapas", () => {
  it("sao cinco, na ordem que a pessoa preenche", () => {
    expect(TOTAL_ETAPAS).toBe(5);
    expect(ETAPAS_PEDIDO.map((e) => e.chave)).toEqual(["cliente", "itens", "prazo", "pagamento", "revisao"]);
  });

  it("cada etapa explica para que serve", () => {
    for (const e of ETAPAS_PEDIDO) {
      expect(e.titulo.length).toBeGreaterThan(0);
      expect(e.ajuda.length).toBeGreaterThan(10);
    }
  });
});

describe("etapa do cliente", () => {
  it("sem cliente nao avanca, e diz o motivo", () => {
    const imp = impedimentoDaEtapa(ETAPA.cliente, dados({ clientId: "" }));
    expect(imp?.motivo).toContain("Escolha o cliente");
    expect(imp?.campo).toBe("clientId");
  });

  it("com cliente avanca", () => {
    expect(impedimentoDaEtapa(ETAPA.cliente, dados())).toBeNull();
  });
});

describe("etapa das pecas", () => {
  it("pedido sem nenhuma peca nao avanca", () => {
    expect(impedimentoDaEtapa(ETAPA.itens, dados({ itens: [] }))?.motivo).toContain("ao menos uma peça");
  });

  it("linha totalmente vazia nao conta como peca", () => {
    const d = dados({ itens: [{ descricao: "  ", productId: "", quantidade: 0 }] });
    expect(impedimentoDaEtapa(ETAPA.itens, d)?.motivo).toContain("ao menos uma peça");
  });

  it("peca preenchida com quantidade zero e barrada, dizendo qual e", () => {
    const d = dados({ itens: [{ descricao: "Camiseta gola careca", productId: "", quantidade: 0 }] });
    const imp = impedimentoDaEtapa(ETAPA.itens, d);
    expect(imp?.motivo).toContain("Camiseta gola careca");
    expect(imp?.motivo).toContain("zerada");
  });

  it("quantidade negativa tambem e barrada", () => {
    const d = dados({ itens: [{ descricao: "Boné", productId: "", quantidade: -5 }] });
    expect(impedimentoDaEtapa(ETAPA.itens, d)).not.toBeNull();
  });

  it("peca do catalogo sem descricao digitada vale", () => {
    const d = dados({ itens: [{ descricao: "", productId: "p1", quantidade: 10 }] });
    expect(impedimentoDaEtapa(ETAPA.itens, d)).toBeNull();
  });

  it("peca avulsa, so com descricao, tambem vale", () => {
    const d = dados({ itens: [{ descricao: "Avental sob medida", productId: "", quantidade: 3 }] });
    expect(impedimentoDaEtapa(ETAPA.itens, d)).toBeNull();
  });
});

describe("etapa do prazo", () => {
  it("prazo em branco passa: confeccao fecha pedido sem data o tempo todo", () => {
    expect(impedimentoDaEtapa(ETAPA.prazo, dados({ prazo: "" }))).toBeNull();
  });

  it("prazo antes da data do pedido e barrado: quase sempre e o ano errado", () => {
    const imp = impedimentoDaEtapa(ETAPA.prazo, dados({ prazo: "2025-08-20" }));
    expect(imp?.motivo).toContain("antes da data do pedido");
    expect(imp?.campo).toBe("deliveryDate");
  });

  it("prazo no mesmo dia do pedido passa: entrega para hoje existe", () => {
    expect(impedimentoDaEtapa(ETAPA.prazo, dados({ prazo: "2026-08-04" }))).toBeNull();
  });
});

describe("etapa do pagamento", () => {
  it("sem entrada passa", () => {
    expect(impedimentoDaEtapa(ETAPA.pagamento, dados({ entradaInCents: 0 }))).toBeNull();
  });

  it("entrada parcial passa", () => {
    expect(impedimentoDaEtapa(ETAPA.pagamento, dados({ entradaInCents: 162000 }))).toBeNull();
  });

  it("entrada igual ao total passa: pedido pago na hora existe", () => {
    expect(impedimentoDaEtapa(ETAPA.pagamento, dados({ entradaInCents: 540000 }))).toBeNull();
  });

  it("entrada maior que o total e barrada", () => {
    const imp = impedimentoDaEtapa(ETAPA.pagamento, dados({ entradaInCents: 600000 }));
    expect(imp?.motivo).toContain("maior que o total");
    expect(imp?.campo).toBe("paidAmount");
  });

  it("entrada negativa e barrada", () => {
    expect(impedimentoDaEtapa(ETAPA.pagamento, dados({ entradaInCents: -100 }))).not.toBeNull();
  });
});

describe("ultimaEtapaLiberada", () => {
  it("pedido vazio trava logo na primeira", () => {
    expect(ultimaEtapaLiberada(dados({ clientId: "", itens: [] }))).toBe(ETAPA.cliente);
  });

  it("com cliente mas sem peca, trava na segunda", () => {
    expect(ultimaEtapaLiberada(dados({ itens: [] }))).toBe(ETAPA.itens);
  });

  it("pedido completo libera ate a revisao", () => {
    expect(ultimaEtapaLiberada(dados())).toBe(TOTAL_ETAPAS - 1);
  });

  it("erro no pagamento trava antes da revisao", () => {
    expect(ultimaEtapaLiberada(dados({ entradaInCents: 999999 }))).toBe(ETAPA.pagamento);
  });
});

describe("rotuloProgresso", () => {
  it("diz onde esta e quanto falta", () => {
    expect(rotuloProgresso(0)).toBe("Etapa 1 de 5");
    expect(rotuloProgresso(4)).toBe("Etapa 5 de 5");
  });

  it("nao passa do total, mesmo com indice fora da conta", () => {
    expect(rotuloProgresso(9)).toBe("Etapa 5 de 5");
  });
});
