import { describe, expect, it } from "vitest";
import { montarTarefas, type ContagensDoDia } from "@/components/tarefas-do-dia";

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
});
