import { describe, expect, it } from "vitest";
import {
  MODELO_PADRAO,
  MODELOS_DE_CONTA,
  SEGMENTOS_COM_MODELO,
  etapasParaCriar,
  modeloDaConta,
  segmentoValido,
  servicosParaCriar,
  type ModeloDeConta,
} from "@/lib/modelos-de-conta";
import { segmentos } from "@/lib/segmentos";
import { stageNameToOrderStatus } from "@/lib/status";

// O que este arquivo protege
// ---------------------------------------------------------------------------
// O status do pedido é deduzido do NOME da etapa. Um modelo com a etapa
// errada não dá erro nenhum na hora: dá erro semanas depois, na conta de um
// cliente pagante, quando os pedidos dele nunca aparecem como entregues e a
// tela inteira acusa atraso. É barato demais reprovar isso aqui para deixar
// escapar para lá.

const PRODUCAO = new Set(["CUTTING", "SEWING", "EMBROIDERY_PRINT", "FINISHING"]);

const todos: [string, ModeloDeConta][] = [["padrao", MODELO_PADRAO], ...Object.entries(MODELOS_DE_CONTA)];

describe("site e conta andam juntos", () => {
  it("todo segmento anunciado em /para/* tem modelo de conta", () => {
    for (const s of segmentos) {
      expect(SEGMENTOS_COM_MODELO, `/para/${s.slug} sem modelo de conta`).toContain(s.slug);
    }
  });

  it("e todo modelo corresponde a uma página de segmento", () => {
    const slugs = segmentos.map((s) => s.slug);
    for (const chave of SEGMENTOS_COM_MODELO) {
      expect(slugs, `modelo ${chave} sem página`).toContain(chave);
    }
  });
});

describe.each(todos)("modelo %s", (_chave, modelo) => {
  const status = modelo.etapas.map(stageNameToOrderStatus);

  it("a primeira etapa é onde o pedido novo cai, e significa recebido", () => {
    expect(status[0]).toBe("RECEIVED");
  });

  it("termina em pronto e depois entregue — sem isso o pedido nunca sai de atrasado", () => {
    expect(status.at(-2)).toBe("READY");
    expect(status.at(-1)).toBe("DELIVERED");
  });

  it("pronto e entregue não aparecem antes da hora", () => {
    // "Pronto para corte" no meio do fluxo marcaria o pedido como pronto.
    expect(status.slice(0, -2)).not.toContain("READY");
    expect(status.slice(0, -2)).not.toContain("DELIVERED");
  });

  it("depois que a produção começa, nenhuma etapa volta a contar como recebido", () => {
    // É o caso da etapa "Montagem": nome sem palavra reconhecida cai em
    // recebido, e o pedido some da lista de produção no meio do caminho.
    const inicio = status.findIndex((s) => PRODUCAO.has(s));
    expect(inicio, "modelo sem nenhuma etapa de produção").toBeGreaterThan(0);
    expect(status.slice(inicio)).not.toContain("RECEIVED");
  });

  it("tem uma etapa de aguardando material, que é o que alimenta esse filtro de pedidos", () => {
    expect(status).toContain("WAITING_MATERIAL");
  });

  it("não repete nome de etapa nem de serviço: o banco recusa e a conta não é criada", () => {
    expect(new Set(modelo.etapas).size).toBe(modelo.etapas.length);
    expect(new Set(modelo.servicos).size).toBe(modelo.servicos.length);
  });
});

describe("modeloDaConta", () => {
  it("sem segmento, a conta nasce exatamente como sempre nasceu", () => {
    expect(modeloDaConta(null)).toBe(MODELO_PADRAO);
    expect(modeloDaConta(undefined)).toBe(MODELO_PADRAO);
    expect(modeloDaConta("")).toBe(MODELO_PADRAO);
  });

  it("segmento que saiu da lista não trava o cadastro: cai no padrão", () => {
    expect(modeloDaConta("padarias")).toBe(MODELO_PADRAO);
  });

  it("chave herdada de objeto não passa por segmento", () => {
    // Sem a checagem de chave própria, "constructor" devolveria a função
    // Object no lugar do modelo e o cadastro quebraria dentro da transação.
    for (const chave of ["constructor", "toString", "__proto__", "hasOwnProperty"]) {
      expect(segmentoValido(chave), chave).toBe(false);
      expect(modeloDaConta(chave), chave).toBe(MODELO_PADRAO);
    }
  });

  it("devolve o modelo do segmento", () => {
    expect(modeloDaConta("bones").nome).toBe("Bonés e chapéus");
  });
});

describe("linhas criadas no banco", () => {
  it("o padrão gera as mesmas oito etapas, nas mesmas cores, que a conta sempre recebeu", () => {
    // Fotografia de src/lib/db-bootstrap.ts antes dos modelos. Convite antigo,
    // sem segmento, tem de abrir a mesma conta de antes.
    expect(etapasParaCriar(MODELO_PADRAO, "c1")).toEqual([
      { companyId: "c1", name: "Recebido", position: 1, color: "#5b68d8" },
      { companyId: "c1", name: "Aguardando material", position: 2, color: "#8a6fdb" },
      { companyId: "c1", name: "Corte", position: 3, color: "#087f7d" },
      { companyId: "c1", name: "Costura", position: 4, color: "#c88a2b" },
      { companyId: "c1", name: "Bordado/estampa", position: 5, color: "#c87941" },
      { companyId: "c1", name: "Acabamento", position: 6, color: "#c43f54" },
      { companyId: "c1", name: "Pronto", position: 7, color: "#111a16" },
      { companyId: "c1", name: "Entregue", position: 8, color: "#66756d" },
    ]);
  });

  it("posição começa em 1 e não pula", () => {
    const etapas = etapasParaCriar(MODELOS_DE_CONTA.bones, "c1");
    expect(etapas.map((e) => e.position)).toEqual(etapas.map((_, i) => i + 1));
  });

  it("serviços entram sem preço: preço inventado viraria lucro errado no relatório", () => {
    const servicos = servicosParaCriar(MODELOS_DE_CONTA.estamparias, "c1");
    expect(servicos.length).toBeGreaterThan(0);
    for (const s of servicos) {
      expect(s).not.toHaveProperty("defaultPriceInCents");
      expect(s.companyId).toBe("c1");
    }
  });
});
