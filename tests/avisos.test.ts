import { describe, expect, it } from "vitest";
import {
  TIPOS_CHAMADO,
  contarNaoLidos,
  descreverTipo,
  eChamado,
  eTipoAviso,
  ordenarAvisos,
  tempoRelativo,
  textoDoAviso,
  urgenciaPadrao,
  type AvisoBasico,
  type TipoAviso,
} from "@/lib/avisos";

const aviso = (partes: Partial<AvisoBasico> = {}): AvisoBasico => ({
  tipo: "ETAPA_MUDOU",
  urgente: false,
  lido: false,
  criadoEm: new Date(2026, 7, 6, 10, 0),
  ...partes,
});

describe("eTipoAviso", () => {
  it("aceita os tipos que existem", () => {
    expect(eTipoAviso("PEDE_COR")).toBe(true);
    expect(eTipoAviso("PEDIDO_CRIADO")).toBe(true);
  });

  it("recusa o que vier torto do formulario", () => {
    expect(eTipoAviso("QUALQUER")).toBe(false);
    expect(eTipoAviso("")).toBe(false);
    expect(eTipoAviso("pede_cor")).toBe(false);
  });
});

describe("eChamado", () => {
  it("os quatro que uma pessoa dispara na bancada", () => {
    expect(TIPOS_CHAMADO).toEqual(["PEDE_COR", "PEDE_FOTO", "PEDE_AJUDA", "OBSERVACAO"]);
    for (const t of TIPOS_CHAMADO) expect(eChamado(t)).toBe(true);
  });

  it("o que o sistema gera sozinho nao e chamado", () => {
    for (const t of ["PEDIDO_CRIADO", "ETAPA_MUDOU", "PEDIDO_PRONTO", "PEDIDO_ENTREGUE"] as TipoAviso[]) {
      expect(eChamado(t)).toBe(false);
    }
  });
});

describe("descreverTipo", () => {
  it("todo tipo tem rotulo e frase padrao", () => {
    for (const t of ["PEDIDO_CRIADO", "PEDE_COR", "OBSERVACAO"] as TipoAviso[]) {
      const d = descreverTipo(t);
      expect(d.rotulo.length).toBeGreaterThan(0);
      expect(d.padrao.length).toBeGreaterThan(10);
    }
  });

  it("chamado tem verbo de botao; evento automatico nao precisa", () => {
    expect(descreverTipo("PEDE_AJUDA").acao).toBe("Pedir ajuda");
    expect(descreverTipo("ETAPA_MUDOU").acao).toBeUndefined();
  });
});

describe("urgenciaPadrao", () => {
  it("quem pede ajuda, cor ou foto esta parado: nasce urgente", () => {
    expect(urgenciaPadrao("PEDE_AJUDA")).toBe(true);
    expect(urgenciaPadrao("PEDE_COR")).toBe(true);
    expect(urgenciaPadrao("PEDE_FOTO")).toBe(true);
  });

  it("recado e evento automatico nao urgem", () => {
    expect(urgenciaPadrao("OBSERVACAO")).toBe(false);
    expect(urgenciaPadrao("ETAPA_MUDOU")).toBe(false);
    expect(urgenciaPadrao("PEDIDO_CRIADO")).toBe(false);
  });
});

describe("textoDoAviso", () => {
  it("o que a pessoa escreveu manda", () => {
    expect(textoDoAviso("PEDE_COR", "É o azul do ano passado?")).toBe("É o azul do ano passado?");
  });

  it("sem texto, usa a frase do tipo: aviso em branco nao diz nada", () => {
    expect(textoDoAviso("PEDE_AJUDA", null)).toContain("ajuda");
    expect(textoDoAviso("PEDE_FOTO", "")).toContain("foto");
    expect(textoDoAviso("PEDE_COR", "   ")).toContain("cor");
  });
});

describe("contarNaoLidos", () => {
  it("conta o total e separa os urgentes", () => {
    const r = contarNaoLidos([
      aviso({ lido: false, urgente: true }),
      aviso({ lido: false, urgente: false }),
      aviso({ lido: true, urgente: true }),
    ]);
    expect(r.total).toBe(2);
    expect(r.urgentes).toBe(1);
  });

  it("tudo lido zera os dois", () => {
    const r = contarNaoLidos([aviso({ lido: true }), aviso({ lido: true, urgente: true })]);
    expect(r).toEqual({ total: 0, urgentes: 0 });
  });

  it("lista vazia nao quebra", () => {
    expect(contarNaoLidos([])).toEqual({ total: 0, urgentes: 0 });
  });
});

describe("ordenarAvisos", () => {
  const antigo = new Date(2026, 7, 1, 8, 0);
  const recente = new Date(2026, 7, 6, 18, 0);

  it("urgente nao lido vem antes de tudo, mesmo sendo mais velho", () => {
    const r = ordenarAvisos([
      aviso({ tipo: "ETAPA_MUDOU", lido: false, urgente: false, criadoEm: recente }),
      aviso({ tipo: "PEDE_AJUDA", lido: false, urgente: true, criadoEm: antigo }),
    ]);
    expect(r[0].tipo).toBe("PEDE_AJUDA");
  });

  it("nao lido vem antes de lido", () => {
    const r = ordenarAvisos([
      aviso({ tipo: "PEDIDO_PRONTO", lido: true, criadoEm: recente }),
      aviso({ tipo: "ETAPA_MUDOU", lido: false, criadoEm: antigo }),
    ]);
    expect(r[0].tipo).toBe("ETAPA_MUDOU");
  });

  it("dentro do mesmo peso, o mais recente primeiro", () => {
    const r = ordenarAvisos([
      aviso({ tipo: "PEDIDO_CRIADO", lido: false, criadoEm: antigo }),
      aviso({ tipo: "ETAPA_MUDOU", lido: false, criadoEm: recente }),
    ]);
    expect(r[0].tipo).toBe("ETAPA_MUDOU");
  });

  it("urgente ja lido nao volta para o topo: ele ja foi visto", () => {
    const r = ordenarAvisos([
      aviso({ tipo: "ETAPA_MUDOU", lido: false, urgente: false, criadoEm: antigo }),
      aviso({ tipo: "PEDE_AJUDA", lido: true, urgente: true, criadoEm: recente }),
    ]);
    expect(r[0].tipo).toBe("ETAPA_MUDOU");
  });

  it("nao altera a lista recebida", () => {
    const original = [aviso({ tipo: "PEDE_COR" }), aviso({ tipo: "ETAPA_MUDOU" })];
    const copia = [...original];
    ordenarAvisos(original);
    expect(original).toEqual(copia);
  });
});

describe("tempoRelativo", () => {
  const agora = new Date(2026, 7, 6, 12, 0);
  const menos = (min: number) => new Date(agora.getTime() - min * 60000);

  it("minutos e horas", () => {
    expect(tempoRelativo(menos(0), agora)).toBe("agora");
    expect(tempoRelativo(menos(5), agora)).toBe("há 5 min");
    expect(tempoRelativo(menos(120), agora)).toBe("há 2 h");
  });

  it("ontem e dias", () => {
    expect(tempoRelativo(menos(60 * 25), agora)).toBe("ontem");
    expect(tempoRelativo(menos(60 * 24 * 3), agora)).toBe("há 3 dias");
  });

  it("mais de uma semana vira data curta", () => {
    expect(tempoRelativo(new Date(2026, 6, 20, 9, 0), agora)).toMatch(/^\d{2}\/\d{2}$/);
  });
});
