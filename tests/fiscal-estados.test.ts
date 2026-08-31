import { describe, expect, it } from "vitest";
import type { FiscalStatus } from "@prisma/client";
import {
  SITUACOES_EM_ANDAMENTO,
  SITUACOES_FINAIS,
  TransicaoInvalida,
  estaFinalizado,
  garantirTransicao,
  podeCancelar,
  podeReemitir,
  podeTransicionar,
  proximosEstados,
  rotuloDoStatus,
} from "@/lib/fiscal/estados";

const TODOS: FiscalStatus[] = [
  "DRAFT",
  "VALIDATING",
  "PROCESSING",
  "AUTHORIZED",
  "REJECTED",
  "CANCELLATION_PENDING",
  "CANCELLED",
  "ERROR",
];

describe("caminho feliz", () => {
  it("rascunho ate autorizada", () => {
    expect(podeTransicionar("DRAFT", "VALIDATING")).toBe(true);
    expect(podeTransicionar("VALIDATING", "PROCESSING")).toBe(true);
    expect(podeTransicionar("PROCESSING", "AUTHORIZED")).toBe(true);
  });

  it("autorizada ate cancelada passa pelo pedido de cancelamento", () => {
    expect(podeTransicionar("AUTHORIZED", "CANCELLATION_PENDING")).toBe(true);
    expect(podeTransicionar("CANCELLATION_PENDING", "CANCELLED")).toBe(true);
  });
});

describe("transicoes proibidas", () => {
  it("nota autorizada NAO volta a rascunho", () => {
    // Ela ja existe para o fisco: voltar seria o sistema fingir que a nota
    // nunca foi emitida, criando divergencia com a SEFAZ.
    expect(podeTransicionar("AUTHORIZED", "DRAFT")).toBe(false);
    expect(podeTransicionar("AUTHORIZED", "VALIDATING")).toBe(false);
    expect(podeTransicionar("AUTHORIZED", "PROCESSING")).toBe(false);
  });

  it("nota cancelada nao volta de jeito nenhum", () => {
    for (const destino of TODOS) {
      expect(podeTransicionar("CANCELLED", destino), `CANCELLED -> ${destino}`).toBe(false);
    }
  });

  it("nao da para pular direto de rascunho para autorizada", () => {
    expect(podeTransicionar("DRAFT", "AUTHORIZED")).toBe(false);
    expect(podeTransicionar("DRAFT", "CANCELLED")).toBe(false);
  });

  it("rejeitada nao vira autorizada sem passar pelo envio de novo", () => {
    expect(podeTransicionar("REJECTED", "AUTHORIZED")).toBe(false);
  });

  it("nenhuma situacao transiciona para si mesma", () => {
    for (const s of TODOS) {
      expect(podeTransicionar(s, s), s).toBe(false);
    }
  });
});

describe("garantirTransicao", () => {
  it("deixa passar a transicao valida", () => {
    expect(() => garantirTransicao("DRAFT", "VALIDATING")).not.toThrow();
  });

  it("estoura na invalida, em vez de gravar situacao impossivel", () => {
    expect(() => garantirTransicao("CANCELLED", "AUTHORIZED")).toThrow(TransicaoInvalida);
  });

  it("o erro diz de onde para onde, para o log ser util", () => {
    try {
      garantirTransicao("AUTHORIZED", "DRAFT");
      expect.unreachable("deveria ter estourado");
    } catch (erro) {
      expect(erro).toBeInstanceOf(TransicaoInvalida);
      expect((erro as TransicaoInvalida).de).toBe("AUTHORIZED");
      expect((erro as TransicaoInvalida).para).toBe("DRAFT");
    }
  });
});

describe("retomada", () => {
  it("da para tentar de novo depois de rejeicao ou falha", () => {
    expect(podeReemitir("REJECTED")).toBe(true);
    expect(podeReemitir("ERROR")).toBe(true);
    expect(podeReemitir("DRAFT")).toBe(true);
  });

  it("nao da para reemitir o que ja valeu", () => {
    expect(podeReemitir("AUTHORIZED")).toBe(false);
    expect(podeReemitir("CANCELLED")).toBe(false);
    expect(podeReemitir("PROCESSING")).toBe(false);
  });

  it("so cancela o que esta autorizado", () => {
    for (const s of TODOS) {
      expect(podeCancelar(s), s).toBe(s === "AUTHORIZED");
    }
  });
});

describe("classificacao", () => {
  it("so cancelada e ponto final", () => {
    expect(SITUACOES_FINAIS).toEqual(["CANCELLED"]);
    expect(estaFinalizado("CANCELLED")).toBe(true);
    expect(estaFinalizado("AUTHORIZED")).toBe(false);
  });

  it("situacao final nao tem para onde ir", () => {
    for (const s of SITUACOES_FINAIS) {
      expect(proximosEstados(s), s).toEqual([]);
    }
  });

  it("situacao em andamento sempre tem saida", () => {
    for (const s of SITUACOES_EM_ANDAMENTO) {
      expect(proximosEstados(s).length, s).toBeGreaterThan(0);
    }
  });

  it("toda situacao tem rotulo em portugues", () => {
    for (const s of TODOS) {
      const rotulo = rotuloDoStatus(s);
      expect(rotulo, s).toBeTruthy();
      expect(rotulo, s).not.toBe(s);
    }
  });
});
