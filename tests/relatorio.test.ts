import { describe, expect, it } from "vitest";
import { periodoAnterior } from "@/lib/comparacao";
import { periodoDoPreset, type Periodo } from "@/lib/datas";
import {
  dentroDoPeriodo,
  entrouNoCaixa,
  faturamentoPorServico,
  indexarCatalogo,
  maisVendidas,
  quemMaisCompra,
  rentabilidadePorCliente,
  rentabilidadePorPeca,
  resolverPeriodo,
  resumirVendas,
  type PedidoDoRelatorio,
} from "@/lib/relatorio";

// ---------------------------------------------------------------------------
// Uma confecção de mentira, com pedidos colocados de propósito nas bordas:
// virada do mês às 22h30, domingo às 23h50, segunda às 00h05. São os horários
// em que o relógio do servidor (UTC) já está no dia seguinte.
//
// "Hoje" é quarta-feira, 16/09/2026, às 15h de Brasília.
// Todos os valores esperados foram calculados à mão e estão escritos ao lado.
// ---------------------------------------------------------------------------

const brt = (texto: string) => new Date(`${texto}-03:00`);
const AGORA = brt("2026-09-16T15:00:00");

const catalogo = indexarCatalogo([
  { id: "polo", nome: "Polo branca", custoInCents: 1800, tipo: "PRODUCT" },
  { id: "bone", nome: "Boné trucker", custoInCents: 0, tipo: "PRODUCT" }, // custo não cadastrado
  { id: "camisa-cliente", nome: "Camisa do cliente", custoInCents: 0, tipo: "SERVICE" },
]);

type PedidoDatado = PedidoDoRelatorio & { numero: number; data: Date; pagamentos: { amountInCents: number; paidAt: Date }[] };

function pedido(p: Omit<PedidoDatado, "recebimentos" | "totalInCents">): PedidoDatado {
  const total = p.itens.reduce((s, i) => s + i.totalInCents, 0) + p.servicos.reduce((s, x) => s + x.precoInCents, 0);
  return { ...p, totalInCents: total, recebimentos: p.pagamentos.map((x) => ({ amountInCents: x.amountInCents })) };
}

const horizonte = { clienteId: "c1", clienteNome: "Colégio Horizonte" };
const forte = { clienteId: "c2", clienteNome: "Academia Forte" };
const sol = { clienteId: "c3", clienteNome: "Serigrafia Sol" };

const PEDIDOS: PedidoDatado[] = [
  // A — agosto, 22h30 do dia 31 (em UTC já é 1º de setembro). Total 1.490,00
  pedido({
    numero: 1001, data: brt("2026-08-31T22:30:00"), ...horizonte,
    itens: [{ productId: "polo", descricao: "Polo", quantidade: 40, totalInCents: 128000 }],
    servicos: [{ nome: "Bordado", precoInCents: 21000 }],
    pagamentos: [
      { amountInCents: 50000, paidAt: brt("2026-08-31T22:30:00") }, // entrada: caixa de agosto
      { amountInCents: 99000, paidAt: brt("2026-09-02T10:00:00") }, // saldo: caixa de setembro
    ],
  }),
  // B — setembro, 00h10 do dia 1. Total 250,00, nada pago
  pedido({
    numero: 1002, data: brt("2026-09-01T00:10:00"), ...forte,
    itens: [{ productId: "bone", descricao: "Boné", quantidade: 10, totalInCents: 25000 }],
    servicos: [],
    pagamentos: [],
  }),
  // C — segunda 07/09. Total 640,00, pago à vista
  pedido({
    numero: 1003, data: brt("2026-09-07T09:00:00"), ...horizonte,
    itens: [{ productId: "polo", descricao: "Polo", quantidade: 20, totalInCents: 64000 }],
    servicos: [],
    pagamentos: [{ amountInCents: 64000, paidAt: brt("2026-09-07T09:00:00") }],
  }),
  // D — domingo 13/09, 23h50 (em UTC já é segunda). Só serviço: 400,00
  pedido({
    numero: 1004, data: brt("2026-09-13T23:50:00"), ...sol,
    itens: [{ productId: "camisa-cliente", descricao: "Camisa do cliente", quantidade: 100, totalInCents: 0 }],
    servicos: [{ nome: "Silk 1 cor", precoInCents: 40000 }],
    pagamentos: [{ amountInCents: 20000, paidAt: brt("2026-09-14T00:30:00") }], // caixa desta semana
  }),
  // E — segunda 14/09, 00h05. Total 150,00, pago
  pedido({
    numero: 1005, data: brt("2026-09-14T00:05:00"), ...forte,
    itens: [{ productId: "polo", descricao: "Polo", quantidade: 5, totalInCents: 15000 }],
    servicos: [],
    pagamentos: [{ amountInCents: 15000, paidAt: brt("2026-09-14T00:05:00") }],
  }),
  // F — hoje, 14h. Total 690,00, nada pago
  pedido({
    numero: 1006, data: brt("2026-09-16T14:00:00"), ...horizonte,
    itens: [{ productId: "bone", descricao: "Boné", quantidade: 30, totalInCents: 60000 }],
    servicos: [{ nome: "Bordado", precoInCents: 9000 }],
    pagamentos: [],
  }),
  // G — 10/08. Total 320,00, pago
  pedido({
    numero: 1007, data: brt("2026-08-10T10:00:00"), ...sol,
    itens: [{ productId: "polo", descricao: "Polo", quantidade: 10, totalInCents: 32000 }],
    servicos: [],
    pagamentos: [{ amountInCents: 32000, paidAt: brt("2026-08-10T10:00:00") }],
  }),
];

/** O que a consulta ao banco faz: orderDate entre de e até, bordas incluídas. */
function noPeriodo(periodo: Periodo) {
  return PEDIDOS.filter((p) => dentroDoPeriodo(p.data, periodo));
}
const numeros = (lista: PedidoDatado[]) => lista.map((p) => p.numero).sort();
const todosPagamentos = PEDIDOS.flatMap((p) => p.pagamentos.map((x) => ({ ...x, createdAt: x.paidAt })));

describe("contagem de pedidos por semana e por mes", () => {
  const semana = periodoDoPreset("semana", AGORA);
  const mes = periodoDoPreset("mes", AGORA);
  const mesPassado = periodoDoPreset("mes-passado", AGORA);

  it("esta semana (seg 14 a qua 16): so os pedidos E e F", () => {
    expect(numeros(noPeriodo(semana))).toEqual([1005, 1006]);
  });

  it("o pedido de domingo 23h50 fica na semana dele, e nao na seguinte", () => {
    const semanaPassadaInteira = { de: brt("2026-09-07T00:00:00"), ate: brt("2026-09-13T23:59:59.999") };
    expect(numeros(noPeriodo(semanaPassadaInteira))).toEqual([1003, 1004]);
  });

  it("este mes (1 a 16/09): B, C, D, E e F — o pedido das 22h30 do dia 31 fica em agosto", () => {
    expect(numeros(noPeriodo(mes))).toEqual([1002, 1003, 1004, 1005, 1006]);
  });

  it("mes passado (agosto inteiro): A e G", () => {
    expect(numeros(noPeriodo(mesPassado))).toEqual([1001, 1007]);
  });

  it("nenhum pedido some e nenhum conta duas vezes entre agosto e setembro", () => {
    const setembroInteiro = { de: brt("2026-09-01T00:00:00"), ate: brt("2026-09-30T23:59:59.999") };
    const somados = noPeriodo(mesPassado).length + noPeriodo(setembroInteiro).length;
    expect(somados).toBe(PEDIDOS.length);
  });

  it("a comparacao da semana usa seg a qua da semana passada: so o pedido C", () => {
    expect(numeros(noPeriodo(periodoAnterior(semana)))).toEqual([1003]);
  });

  it("a comparacao do mes usa 1 a 16 de agosto: so o pedido G", () => {
    expect(numeros(noPeriodo(periodoAnterior(mes)))).toEqual([1007]);
  });
});

describe("valores do mes (1 a 16/09)", () => {
  const mes = periodoDoPreset("mes", AGORA);
  const r = resumirVendas(noPeriodo(mes), catalogo);

  it("faturamento = 250 + 640 + 400 + 150 + 690 = R$ 2.130,00", () => {
    expect(r.pedidos).toBe(5);
    expect(r.faturamentoInCents).toBe(213000);
  });

  it("receita das pecas R$ 1.640,00 + servicos R$ 490,00 = faturamento", () => {
    expect(r.receitaPecasInCents).toBe(164000);
    expect(r.receitaServicosInCents).toBe(49000);
    expect(r.receitaPecasInCents + r.receitaServicosInCents).toBe(r.faturamentoInCents);
  });

  it("custo = 20 polos (C) + 5 polos (E) a R$ 18 = R$ 450,00", () => {
    expect(r.custoInCents).toBe(45000);
  });

  it("lucro estimado = 2.130 - 450 = R$ 1.680,00, margem 79%", () => {
    expect(r.lucroInCents).toBe(168000);
    expect(r.margem).toBe(79); // 1680 / 2130 = 78,87%
  });

  it("3 vendas sem custo: bone (B), camisa do cliente (D) e bone (F)", () => {
    expect(r.vendasSemCusto).toBe(3);
  });

  it("destes pedidos ja entrou R$ 990,00 e faltam R$ 1.140,00", () => {
    expect(r.pagoDestesPedidosInCents).toBe(99000);
    expect(r.aReceberDestesPedidosInCents).toBe(114000);
    expect(r.pagoDestesPedidosInCents + r.aReceberDestesPedidosInCents).toBe(r.faturamentoInCents);
  });

  it("peca propria x servico na peca do cliente", () => {
    expect(r.porTipo.PRODUCT).toEqual({ receitaInCents: 164000, unidades: 65 });
    expect(r.porTipo.SERVICE).toEqual({ receitaInCents: 0, unidades: 100 });
  });
});

describe("valores da semana e do mes passado", () => {
  it("esta semana: R$ 840,00 faturados, lucro R$ 750,00", () => {
    const r = resumirVendas(noPeriodo(periodoDoPreset("semana", AGORA)), catalogo);
    expect(r.pedidos).toBe(2);
    expect(r.faturamentoInCents).toBe(84000); // 150 + 690
    expect(r.custoInCents).toBe(9000); // 5 polos
    expect(r.lucroInCents).toBe(75000);
  });

  it("agosto: R$ 1.810,00 faturados", () => {
    const r = resumirVendas(noPeriodo(periodoDoPreset("mes-passado", AGORA)), catalogo);
    expect(r.pedidos).toBe(2);
    expect(r.faturamentoInCents).toBe(181000); // 1.490 + 320
    expect(r.custoInCents).toBe(90000); // 50 polos
    expect(r.lucroInCents).toBe(91000);
  });

  it("periodo sem pedido da zero, sem dividir por zero", () => {
    const r = resumirVendas([], catalogo);
    expect(r.faturamentoInCents).toBe(0);
    expect(r.margem).toBe(0);
  });
});

describe("entrou no caixa (pela data do recebimento)", () => {
  it("setembro: saldo do pedido de agosto + C + D + E = R$ 1.980,00", () => {
    const c = entrouNoCaixa(todosPagamentos, periodoDoPreset("mes", AGORA));
    expect(c.totalInCents).toBe(198000); // 990 + 640 + 200 + 150
    expect(c.recebimentos).toBe(4);
  });

  it("a entrada das 22h30 do dia 31 e caixa de agosto", () => {
    const c = entrouNoCaixa(todosPagamentos, periodoDoPreset("mes-passado", AGORA));
    expect(c.totalInCents).toBe(82000); // 500 da entrada de A + 320 de G
  });

  it("esta semana: R$ 350,00 (D pagou 200 na segunda 00h30, E pagou 150)", () => {
    const c = entrouNoCaixa(todosPagamentos, periodoDoPreset("semana", AGORA));
    expect(c.totalInCents).toBe(35000);
  });

  it("faturamento e caixa sao coisas diferentes, e as duas somas fecham", () => {
    // Tudo que foi pago = tudo que entrou no caixa, somando todos os períodos.
    const tudo = { de: brt("2020-01-01T00:00:00"), ate: brt("2030-01-01T00:00:00") };
    const pago = resumirVendas(PEDIDOS, catalogo).pagoDestesPedidosInCents;
    expect(entrouNoCaixa(todosPagamentos, tudo).totalInCents).toBe(pago);
  });

  it("recebimento sem data de pagamento usa a data em que foi lancado", () => {
    const c = entrouNoCaixa(
      [{ amountInCents: 1000, paidAt: null, createdAt: brt("2026-09-15T10:00:00") }],
      periodoDoPreset("semana", AGORA),
    );
    expect(c.totalInCents).toBe(1000);
  });
});

describe("rankings do mes", () => {
  const doMes = noPeriodo(periodoDoPreset("mes", AGORA));

  it("lucro por cliente inclui servico: a Serigrafia Sol aparece com R$ 400, e nao com zero", () => {
    const lista = rentabilidadePorCliente(doMes, catalogo);
    expect(lista.map((l) => [l.rotulo, l.lucroInCents])).toEqual([
      ["Colégio Horizonte", 97000], // 640 + 600 + 90 de bordado - 360 de custo
      ["Serigrafia Sol", 40000],
      ["Academia Forte", 31000], // 250 + 150 - 90
    ]);
    const sol = lista.find((l) => l.rotulo === "Serigrafia Sol")!;
    expect(sol.custoIncompleto).toBe(false); // serviço sem custo não é esquecimento
  });

  it("a soma do lucro por cliente e exatamente o lucro estimado", () => {
    const soma = rentabilidadePorCliente(doMes, catalogo).reduce((s, l) => s + l.lucroInCents, 0);
    expect(soma).toBe(resumirVendas(doMes, catalogo).lucroInCents);
  });

  it("lucro por peca + receita de servicos = lucro estimado", () => {
    const pecas = rentabilidadePorPeca(doMes, catalogo).reduce((s, l) => s + l.lucroInCents, 0);
    const r = resumirVendas(doMes, catalogo);
    expect(pecas + r.receitaServicosInCents).toBe(r.lucroInCents);
  });

  it("cliente com bone sem custo fica marcado como margem otimista", () => {
    const forteLinha = rentabilidadePorCliente(doMes, catalogo).find((l) => l.rotulo === "Academia Forte")!;
    expect(forteLinha.custoIncompleto).toBe(true);
  });

  it("pecas mais vendidas por unidade", () => {
    expect(maisVendidas(doMes, catalogo).map((p) => [p.rotulo, p.quantidade])).toEqual([
      ["Camisa do cliente", 100],
      ["Boné trucker", 40],
      ["Polo branca", 25],
    ]);
  });

  it("quem mais compra, pelo total (empate mantem a ordem de chegada)", () => {
    expect(quemMaisCompra(doMes).map((c) => [c.nome, c.pedidos, c.totalInCents])).toEqual([
      ["Colégio Horizonte", 2, 133000],
      ["Academia Forte", 2, 40000],
      ["Serigrafia Sol", 1, 40000],
    ]);
  });

  it("dois clientes com o mesmo nome nao se misturam", () => {
    const homonimos: PedidoDoRelatorio[] = [
      { clienteId: "x1", clienteNome: "Maria", totalInCents: 100, itens: [], servicos: [{ nome: "Silk", precoInCents: 100 }], recebimentos: [] },
      { clienteId: "x2", clienteNome: "Maria", totalInCents: 200, itens: [], servicos: [{ nome: "Silk", precoInCents: 200 }], recebimentos: [] },
    ];
    expect(quemMaisCompra(homonimos)).toHaveLength(2);
    expect(rentabilidadePorCliente(homonimos, catalogo)).toHaveLength(2);
  });

  it("servicos do mes: silk R$ 400 (1x), bordado R$ 90 (1x)", () => {
    expect(faturamentoPorServico(doMes).map((s) => [s.nome, s.receitaInCents, s.vezes])).toEqual([
      ["Silk 1 cor", 40000, 1],
      ["Bordado", 9000, 1],
    ]);
  });
});

describe("resolverPeriodo (o que vem na URL)", () => {
  it("sem nada, e o mes atual", () => {
    const p = resolverPeriodo({}, AGORA);
    expect(p.preset).toBe("mes");
    expect(p.de.toISOString()).toBe(brt("2026-09-01T00:00:00").toISOString());
  });

  it("botao rapido ganha das datas", () => {
    const p = resolverPeriodo({ preset: "semana", from: "2020-01-01", to: "2020-01-31" }, AGORA);
    expect(p.preset).toBe("semana");
    expect(p.de.toISOString()).toBe(brt("2026-09-14T00:00:00").toISOString());
  });

  it("datas digitadas valem o dia inteiro em Brasilia", () => {
    const p = resolverPeriodo({ from: "2026-09-07", to: "2026-09-13" }, AGORA);
    expect(p.preset).toBeNull();
    expect(p.de.toISOString()).toBe(brt("2026-09-07T00:00:00").toISOString());
    expect(p.ate.toISOString()).toBe(brt("2026-09-13T23:59:59.999").toISOString());
  });

  it("ate antes de de: troca, em vez de mostrar um relatorio vazio", () => {
    const p = resolverPeriodo({ from: "2026-09-13", to: "2026-09-07" }, AGORA);
    expect(p.de.toISOString()).toBe(brt("2026-09-07T00:00:00").toISOString());
    expect(p.ate.toISOString()).toBe(brt("2026-09-13T23:59:59.999").toISOString());
  });

  it("data invalida cai no mes atual", () => {
    const p = resolverPeriodo({ from: "2026-02-31", to: "abc" }, AGORA);
    expect(p.preset).toBe("mes");
  });

  it("preset desconhecido e ignorado", () => {
    const p = resolverPeriodo({ preset: "ano", from: "2026-09-07", to: "2026-09-07" }, AGORA);
    expect(p.preset).toBeNull();
    expect(p.de.toISOString()).toBe(brt("2026-09-07T00:00:00").toISOString());
  });
});
