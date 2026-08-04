import { describe, expect, it } from "vitest";
import { MARCOS, posicaoNoFluxo, proximaAcao, situacaoPagamento } from "@/lib/order-progress";

const pedido = (partes: Partial<Parameters<typeof proximaAcao>[0]> = {}) => ({
  status: "RECEIVED" as const,
  totalAmountInCents: 75000,
  paidAmountInCents: 0,
  ...partes,
});

describe("posicaoNoFluxo", () => {
  it("as nove situacoes internas cabem em cinco marcos", () => {
    expect(MARCOS).toHaveLength(5);
    expect(posicaoNoFluxo("RECEIVED")).toBe(0);
    expect(posicaoNoFluxo("WAITING_MATERIAL")).toBe(1);
    expect(posicaoNoFluxo("READY")).toBe(3);
    expect(posicaoNoFluxo("DELIVERED")).toBe(4);
  });

  it("corte, costura, bordado e acabamento sao tudo 'em producao' para quem olha", () => {
    for (const s of ["CUTTING", "SEWING", "EMBROIDERY_PRINT", "FINISHING"] as const) {
      expect(posicaoNoFluxo(s)).toBe(2);
    }
  });

  it("cancelado fica fora do fluxo", () => {
    expect(posicaoNoFluxo("CANCELED")).toBe(-1);
  });

  it("o fluxo so anda para frente", () => {
    const ordem = ["RECEIVED", "WAITING_MATERIAL", "SEWING", "READY", "DELIVERED"] as const;
    const posicoes = ordem.map(posicaoNoFluxo);
    expect(posicoes).toEqual([...posicoes].sort((a, b) => a - b));
  });
});

describe("proximaAcao", () => {
  it("pedido novo manda comecar a producao", () => {
    expect(proximaAcao(pedido()).rotulo).toBe("Começar a produção");
  });

  it("parado por material diz o que destrava", () => {
    const acao = proximaAcao(pedido({ status: "WAITING_MATERIAL" }));
    expect(acao.rotulo).toContain("Separar o material");
    expect(acao.explicacao).toContain("parada");
  });

  it("em producao manda avancar", () => {
    expect(proximaAcao(pedido({ status: "SEWING" })).rotulo).toContain("Avançar");
  });

  it("pronto manda avisar o cliente", () => {
    expect(proximaAcao(pedido({ status: "READY" })).rotulo).toContain("Avisar o cliente");
  });

  it("entregue com saldo em aberto vira cobranca, e nao 'concluido'", () => {
    const acao = proximaAcao(pedido({ status: "DELIVERED", paidAmountInCents: 20000 }));
    expect(acao.rotulo).toBe("Receber o saldo");
    expect(acao.destino).toBe("financeiro");
  });

  it("entregue e pago nao pede acao nenhuma", () => {
    const acao = proximaAcao(pedido({ status: "DELIVERED", paidAmountInCents: 75000 }));
    expect(acao.destino).toBe("nenhum");
  });

  it("cancelado nao oferece acao", () => {
    expect(proximaAcao(pedido({ status: "CANCELED" })).destino).toBe("nenhum");
  });

  it("toda acao comeca com verbo e explica o porque", () => {
    for (const s of ["RECEIVED", "WAITING_MATERIAL", "SEWING", "READY"] as const) {
      const acao = proximaAcao(pedido({ status: s }));
      expect(acao.rotulo.length).toBeGreaterThan(3);
      expect(acao.explicacao.length).toBeGreaterThan(10);
    }
  });
});

describe("situacaoPagamento", () => {
  const HOJE = new Date(2026, 7, 4);

  it("quitado e pago", () => {
    expect(situacaoPagamento(pedido({ paidAmountInCents: 75000 }), null, HOJE).rotulo).toBe("Pago");
  });

  it("nada recebido e nao pago", () => {
    expect(situacaoPagamento(pedido(), null, HOJE).rotulo).toBe("Não pago");
  });

  it("entrada paga e parcialmente pago", () => {
    expect(situacaoPagamento(pedido({ paidAmountInCents: 22500 }), null, HOJE).rotulo).toBe("Parcialmente pago");
  });

  it("prazo vencido com saldo vira atrasado", () => {
    const s = situacaoPagamento(pedido(), new Date(2026, 7, 1), HOJE);
    expect(s.rotulo).toBe("Atrasado");
    expect(s.tom).toBe("ruim");
  });

  it("prazo vencido mas quitado continua pago", () => {
    const s = situacaoPagamento(pedido({ paidAmountInCents: 75000 }), new Date(2026, 7, 1), HOJE);
    expect(s.rotulo).toBe("Pago");
  });
});
