import { describe, expect, it } from "vitest";
import { montarTarefas, ordenarPorUrgencia, type ContagensDoDia } from "@/components/tarefas-do-dia";

const zerado: ContagensDoDia = {
  atrasados: 0,
  hoje: 0,
  aguardandoMaterial: 0,
  prontos: 0,
  aReceber: 0,
  estoqueBaixo: 0,
  custoIncompleto: 0,
};

describe("montarTarefas", () => {
  it("dia sem pendencia nao gera cartao nenhum", () => {
    expect(montarTarefas(zerado, true, true)).toEqual([]);
  });

  it("so mostra o que tem numero: zero vira ruido e ninguem le", () => {
    const tarefas = montarTarefas({ ...zerado, atrasados: 3 }, true, true);
    expect(tarefas).toHaveLength(1);
    expect(tarefas[0].chave).toBe("atrasados");
    expect(tarefas[0].quantidade).toBe(3);
  });

  it("cada cartao leva para a lista ja filtrada", () => {
    const tarefas = montarTarefas(
      { ...zerado, atrasados: 1, hoje: 2, aguardandoMaterial: 1, prontos: 4 },
      true,
      true,
    );
    const destinos = Object.fromEntries(tarefas.map((t) => [t.chave, t.href]));
    expect(destinos.atrasados).toBe("/pedidos?filtro=atrasados");
    expect(destinos.hoje).toBe("/pedidos?filtro=hoje");
    expect(destinos.material).toBe("/pedidos?filtro=material");
    expect(destinos.prontos).toBe("/pedidos?filtro=prontos");
  });

  it("atrasado e o mais urgente", () => {
    const [tarefa] = montarTarefas({ ...zerado, atrasados: 2 }, true, true);
    expect(tarefa.urgencia).toBe("urgente");
  });

  it("quem nao ve financeiro nao recebe cartao de cobranca", () => {
    const tarefas = montarTarefas({ ...zerado, aReceber: 5 }, false, true);
    expect(tarefas.map((t) => t.chave)).not.toContain("receber");
  });

  it("empresa sem modulo de estoque nao recebe cartao de material acabando", () => {
    const tarefas = montarTarefas({ ...zerado, estoqueBaixo: 4 }, true, false);
    expect(tarefas.map((t) => t.chave)).not.toContain("estoque");
  });

  it("singular e plural certos, para nao sair '1 pedidos'", () => {
    const [um] = montarTarefas({ ...zerado, atrasados: 1 }, true, true);
    expect(um.titulo).toBe("pedido atrasado");
    const [varios] = montarTarefas({ ...zerado, atrasados: 2 }, true, true);
    expect(varios.titulo).toBe("pedidos atrasados");
  });

  it("todo cartao explica o que fazer, e nao so o que aconteceu", () => {
    const tarefas = montarTarefas(
      {
        atrasados: 1,
        hoje: 1,
        aguardandoMaterial: 1,
        prontos: 1,
        aReceber: 1,
        estoqueBaixo: 1,
        custoIncompleto: 1,
      },
      true,
      true,
    );
    expect(tarefas).toHaveLength(7);
    for (const t of tarefas) {
      expect(t.acao.length, `cartao ${t.chave} sem acao`).toBeGreaterThan(10);
      expect(t.href.startsWith("/"), `cartao ${t.chave} sem destino`).toBe(true);
    }
  });

  it("todo aviso tem versao curta, que e a que aparece na faixa compacta", () => {
    const tarefas = montarTarefas(
      {
        atrasados: 1,
        hoje: 1,
        aguardandoMaterial: 1,
        prontos: 1,
        aReceber: 1,
        estoqueBaixo: 1,
        custoIncompleto: 1,
      },
      true,
      true,
    );
    for (const t of tarefas) {
      expect(t.curto.length, `aviso ${t.chave} sem versao curta`).toBeGreaterThan(0);
      // Curto de verdade: na faixa cabem varios lado a lado, e um rotulo longo
      // empurra os outros para a linha de baixo.
      expect(t.curto.length, `versao curta de ${t.chave} esta comprida`).toBeLessThanOrEqual(20);
      expect(t.curto.length, `versao curta de ${t.chave} nao encurtou nada`).toBeLessThanOrEqual(
        t.titulo.length,
      );
    }
  });

  it("a versao curta concorda com o numero: nada de '1 materiais acabando'", () => {
    const um: ContagensDoDia = {
      atrasados: 1,
      hoje: 1,
      aguardandoMaterial: 1,
      prontos: 1,
      aReceber: 1,
      estoqueBaixo: 1,
      custoIncompleto: 1,
    };
    const singular = Object.fromEntries(montarTarefas(um, true, true).map((t) => [t.chave, t.curto]));
    expect(singular.atrasados).toBe("atrasado");
    expect(singular.prontos).toBe("pronto para entrega");
    expect(singular.estoque).toBe("material acabando");
    expect(singular.custo).toBe("peça sem custo");

    const dois = Object.fromEntries(
      montarTarefas(
        { atrasados: 2, hoje: 2, aguardandoMaterial: 2, prontos: 2, aReceber: 2, estoqueBaixo: 2, custoIncompleto: 2 },
        true,
        true,
      ).map((t) => [t.chave, t.curto]),
    );
    expect(dois.atrasados).toBe("atrasados");
    expect(dois.prontos).toBe("prontos para entrega");
    expect(dois.estoque).toBe("materiais acabando");
    expect(dois.custo).toBe("peças sem custo");
  });
});

describe("ordenarPorUrgencia", () => {
  it("o mais grave vai para a frente, porque e ele que ganha a linha de comece por aqui", () => {
    const tarefas = ordenarPorUrgencia(
      montarTarefas({ ...zerado, prontos: 4, aReceber: 2, atrasados: 1 }, true, true),
    );
    expect(tarefas.map((t) => t.chave)).toEqual(["atrasados", "receber", "prontos"]);
  });

  it("sem nada urgente, quem manda e a atencao", () => {
    const [primeira] = ordenarPorUrgencia(
      montarTarefas({ ...zerado, prontos: 3, estoqueBaixo: 1 }, true, true),
    );
    expect(primeira.chave).toBe("estoque");
  });

  it("empate mantem a ordem original: chao de fabrica antes do escritorio", () => {
    const tarefas = ordenarPorUrgencia(
      montarTarefas({ ...zerado, hoje: 1, aguardandoMaterial: 1, aReceber: 1 }, true, true),
    );
    expect(tarefas.map((t) => t.chave)).toEqual(["hoje", "material", "receber"]);
  });

  it("nao mexe na lista que recebeu", () => {
    const original = montarTarefas({ ...zerado, prontos: 1, atrasados: 1 }, true, true);
    const antes = original.map((t) => t.chave);
    ordenarPorUrgencia(original);
    expect(original.map((t) => t.chave)).toEqual(antes);
  });
});
