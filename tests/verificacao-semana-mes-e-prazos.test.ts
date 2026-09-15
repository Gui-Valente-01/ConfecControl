// Verificacao: contagem por semana e mes, e prazos.
//
// (a) 500 pedidos pseudoaleatorios (LCG, semente fixa) de nov/2026 a mar/2028,
//     com horario perto da meia-noite de Brasilia (21h-02h), domingos 23h,
//     virada de ano e fev/2028 bissexto. Semanas, meses e ano tem que fechar
//     entre si pelas funcoes REAIS do relatorio.
// (b) Prazos hora a hora em volta da meia-noite, nos tres formatos gravados no
//     banco: 12:00Z (antigo), 15:00Z (atual) e 23:43Z (antigo).
// (c) Telas que ainda decidem atraso/dia por conta propria.
//
// O "dia de Brasilia" esperado vem de um oraculo independente (Intl com
// America/Sao_Paulo), e nao de src/lib/datas.ts, que e o que esta sob teste.
// Rodar com TZ=UTC e TZ=America/Sao_Paulo.

import type { OrderStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { periodoAnterior } from "@/lib/comparacao";
import { diaEmBrasilia, diaIso, diasDeAtraso, periodoDoPreset, prazoVencido, type Periodo, type Preset } from "@/lib/datas";
import { dateInputToDate, dateToInputValue, formatLongDate, formatShortDate } from "@/lib/format";
import { pedidoCasaFiltro } from "@/lib/order-filters";
import { situacaoPagamento } from "@/lib/order-progress";
import { calcularPontualidade } from "@/lib/producao-analytics";
import { dentroDoPeriodo, entrouNoCaixa, indexarCatalogo, rentabilidadePorCliente, resolverPeriodo, resumirVendas } from "@/lib/relatorio";
import type { PecaDoCatalogo, PedidoDoRelatorio, RecebimentoDoCaixa, ResumoVendas } from "@/lib/relatorio";
import { isOrderLate } from "@/lib/status";

const DIA_MS = 86_400_000;
const AGORA = new Date("2026-09-14T10:00:00-03:00");

// ---------------------------------------------------------------------------
// Oraculo independente e datas escritas no relogio de Brasilia
// ---------------------------------------------------------------------------

const FMT_DIA = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" });
const FMT_SEMANA = new Intl.DateTimeFormat("en-US", { timeZone: "America/Sao_Paulo", weekday: "short" });

/** "aaaa-mm-dd" do dia em Brasilia, pelo Intl (nao usa src/lib/datas.ts). */
function diaOraculo(d: Date): string {
  const p = Object.fromEntries(FMT_DIA.formatToParts(d).map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}`;
}
const semanaOraculo = (d: Date) => FMT_SEMANA.format(d);
const numeroDoDia = (texto: string) => {
  const [a, m, d] = texto.split("-").map(Number);
  return Date.UTC(a, m - 1, d) / DIA_MS;
};
/** Instante escrito no relogio de Brasilia (UTC-3). Hora/dia fora da faixa rolam. */
const brt = (ano: number, mes: number, dia: number, h = 0, min = 0, s = 0, ms = 0) => new Date(Date.UTC(ano, mes - 1, dia, h + 3, min, s, ms));
const iso = (ano: number, mes: number, dia: number) => `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
const ultimoDia = (ano: number, mes: number) => new Date(Date.UTC(ano, mes, 0)).getUTCDate();
/** Dia civil k dias depois de 01/11/2026 (um domingo). */
function diaCivil(k: number) {
  const d = new Date(Date.UTC(2026, 10, 1 + k));
  return { ano: d.getUTCFullYear(), mes: d.getUTCMonth() + 1, dia: d.getUTCDate() };
}
const isoCivil = (k: number) => {
  const d = diaCivil(k);
  return iso(d.ano, d.mes, d.dia);
};
const TOTAL_DIAS = (Date.UTC(2028, 2, 31) - Date.UTC(2026, 10, 1)) / DIA_MS + 1; // 01/11/2026 a 31/03/2028
const ms = (p: Periodo) => [p.de.getTime(), p.ate.getTime()];
const mostrar = (p: Periodo) => `${diaOraculo(p.de)}..${diaOraculo(p.ate)}`;
const digitado = (de: string, ate: string) => resolverPeriodo({ from: de, to: ate }, AGORA);

// ---------------------------------------------------------------------------
// Gerador pseudoaleatorio deterministico (LCG, semente fixa)
// ---------------------------------------------------------------------------

function criarGerador(semente: number) {
  let estado = semente >>> 0;
  const real = () => {
    estado = (Math.imul(estado, 1664525) + 1013904223) >>> 0;
    return estado / 4_294_967_296;
  };
  const inteiro = (min: number, max: number) => min + Math.floor(real() * (max - min + 1));
  const escolher = <T>(lista: readonly T[]): T => lista[Math.floor(real() * lista.length)];
  return { real, inteiro, escolher };
}
type Gerador = ReturnType<typeof criarGerador>;

const PECAS: PecaDoCatalogo[] = [
  { id: "camiseta", nome: "Camiseta", custoInCents: 1250, tipo: "PRODUCT" },
  { id: "polo", nome: "Polo", custoInCents: 2890, tipo: "PRODUCT" },
  { id: "moletom", nome: "Moletom", custoInCents: 6100, tipo: "PRODUCT" },
  { id: "bone", nome: "Bone", custoInCents: 0, tipo: "PRODUCT" }, // sem custo cadastrado
  { id: "bordado", nome: "Bordado", custoInCents: 350, tipo: "SERVICE" },
  { id: "silk", nome: "Silk", custoInCents: 0, tipo: "SERVICE" },
];
const catalogo = indexarCatalogo(PECAS);
const PRODUTOS: (string | null)[] = [...PECAS.map((p) => p.id), null, "peca-apagada"];
// c14 tem o mesmo nome de c1: o lucro por cliente agrupa por id, nao por nome.
const CLIENTES = Array.from({ length: 14 }, (_, i) => ({ id: `c${i + 1}`, nome: `Cliente ${i === 13 ? 1 : i + 1}` }));

function pertoDaMeiaNoite(g: Gerador, ano: number, mes: number, dia: number): Date {
  const r = g.real();
  if (r < 0.5) return brt(ano, mes, dia, g.inteiro(21, 23), g.inteiro(0, 59), g.inteiro(0, 59), g.inteiro(0, 999));
  if (r < 0.9) return brt(ano, mes, dia, g.inteiro(0, 2), g.inteiro(0, 59), g.inteiro(0, 59), g.inteiro(0, 999));
  if (r < 0.95) return brt(ano, mes, dia, 0, 0, 0, 0);
  return brt(ano, mes, dia, 23, 59, 59, 999);
}

function dataDoPedido(g: Gerador): Date {
  let k = g.inteiro(0, TOTAL_DIAS - 1);
  const r = g.real();
  if (r < 0.15) {
    // Domingo, 23h: no servidor (UTC) ja e segunda.
    const d0 = diaCivil(k);
    k += (7 - new Date(Date.UTC(d0.ano, d0.mes - 1, d0.dia)).getUTCDay()) % 7;
    if (k > TOTAL_DIAS - 1) k -= 7;
    const d = diaCivil(k);
    return brt(d.ano, d.mes, d.dia, 23, g.inteiro(0, 59), g.inteiro(0, 59), g.inteiro(0, 999));
  }
  const d = diaCivil(k);
  if (r < 0.27) return pertoDaMeiaNoite(g, d.ano, d.mes, ultimoDia(d.ano, d.mes));
  if (r < 0.35) return pertoDaMeiaNoite(g, d.ano, d.mes, 1);
  return pertoDaMeiaNoite(g, d.ano, d.mes, d.dia);
}

type PedidoGerado = PedidoDoRelatorio & { numero: number; orderDate: Date; caixa: RecebimentoDoCaixa[] };

function gerarPedido(g: Gerador, numero: number, orderDate: Date): PedidoGerado {
  const cliente = g.escolher(CLIENTES);
  const itens = Array.from({ length: g.inteiro(0, 3) }, () => {
    const productId = g.escolher(PRODUTOS);
    const quantidade = g.inteiro(1, 80);
    return { productId, descricao: productId ?? "Peca livre", quantidade, totalInCents: quantidade * g.inteiro(300, 12_000) };
  });
  const servicos = Array.from({ length: itens.length === 0 ? g.inteiro(1, 2) : g.inteiro(0, 2) }, () => ({
    nome: g.escolher(["Silk", "Bordado", "Frete"]),
    precoInCents: g.inteiro(0, 60_000),
  }));
  const totalInCents = itens.reduce((s, i) => s + i.totalInCents, 0) + servicos.reduce((s, x) => s + x.precoInCents, 0);

  // Recebimentos: nunca passam do total (resolveReceiptAmount corta no saldo).
  const caixa: RecebimentoDoCaixa[] = [];
  const [a, m, d] = diaOraculo(orderDate).split("-").map(Number);
  const r = g.real();
  const quantos = r < 0.25 ? 0 : r < 0.55 ? 1 : g.inteiro(2, 3);
  let resta = totalInCents;
  for (let i = 0; i < quantos && resta > 0; i++) {
    const valor = quantos === 1 && g.real() < 0.6 ? resta : g.inteiro(1, resta);
    resta -= valor;
    const quando = pertoDaMeiaNoite(g, a, m, d + g.inteiro(0, 45));
    // Sem paidAt vale o createdAt; com paidAt, o createdAt (3 dias depois) nao pode contar.
    if (g.real() < 0.15) caixa.push({ amountInCents: valor, paidAt: null, createdAt: quando });
    else caixa.push({ amountInCents: valor, paidAt: quando, createdAt: new Date(quando.getTime() + 3 * DIA_MS) });
  }

  const recebimentos = caixa.map((x) => ({ amountInCents: x.amountInCents }));
  return { numero, orderDate, clienteId: cliente.id, clienteNome: cliente.nome, totalInCents, itens, servicos, recebimentos, caixa };
}

// Bordas fixas, alem das aleatorias: #1 ultimo ms de 2027, #2 primeiro ms de 2028,
// #3-#4 bissexto, #5 domingo fim de fev/2027, #6 segunda dia 1, #7 (no servidor ja
// e 01/12), #8-#9 primeiro e ultimo ms da faixa, #10 domingo vespera de 01/11/2027.
const SENTINELAS = [
  brt(2027, 12, 31, 23, 59, 59, 999), brt(2028, 1, 1, 0, 0, 0, 0), brt(2028, 2, 29, 23, 30), brt(2028, 3, 1, 0, 10),
  brt(2027, 2, 28, 23, 59, 59, 999), brt(2027, 3, 1, 0, 0, 0, 0), brt(2026, 11, 30, 22, 30), brt(2026, 11, 1, 0, 0, 0, 0),
  brt(2028, 3, 31, 23, 59, 59, 999), brt(2027, 10, 31, 23, 45),
];

const gerador = criarGerador(20_260_914);
const PEDIDOS: PedidoGerado[] = SENTINELAS.map((d, i) => gerarPedido(gerador, i + 1, d));
while (PEDIDOS.length < 500) PEDIDOS.push(gerarPedido(gerador, PEDIDOS.length + 1, dataDoPedido(gerador)));
const RECEBIMENTOS = PEDIDOS.flatMap((p) => p.caixa);

// Mesma regra do `gte`/`lte` das consultas ao banco.
const doPeriodo = (p: Periodo) => PEDIDOS.filter((x) => dentroDoPeriodo(x.orderDate, p));
const resumoDe = (p: Periodo) => resumirVendas(doPeriodo(p), catalogo);
const caixaDe = (p: Periodo) => entrouNoCaixa(RECEBIMENTOS, p);

/** Todos os numeros somaveis do resumo (margem e porcentagem, nao se soma). */
function numeros(r: ResumoVendas) {
  const { PRODUCT, SERVICE } = r.porTipo;
  return {
    pedidos: r.pedidos, faturamento: r.faturamentoInCents, pago: r.pagoDestesPedidosInCents, aReceber: r.aReceberDestesPedidosInCents,
    pecas: r.receitaPecasInCents, servicos: r.receitaServicosInCents, custo: r.custoInCents, lucro: r.lucroInCents, semCusto: r.vendasSemCusto,
    produtoReceita: PRODUCT.receitaInCents, produtoUn: PRODUCT.unidades, servicoReceita: SERVICE.receitaInCents, servicoUn: SERVICE.unidades,
  };
}
type Numeros = ReturnType<typeof numeros>;
function somar(lista: Numeros[]): Numeros {
  const total = numeros(resumirVendas([], catalogo));
  for (const n of lista) for (const k of Object.keys(n) as (keyof Numeros)[]) total[k] += n[k];
  return total;
}

// Semanas segunda-domingo pelo botao "Esta semana" clicado no domingo 23h30.
const SEMANAS: Periodo[] = [];
for (let k = 0; Date.UTC(2026, 10, 1 + k) <= Date.UTC(2028, 3, 2); k += 7) {
  const d = diaCivil(k);
  SEMANAS.push(periodoDoPreset("semana", brt(d.ano, d.mes, d.dia, 23, 30)));
}

type Mes = { ano: number; mes: number; periodo: Periodo };
const MESES: Mes[] = Array.from({ length: 17 }, (_, i) => {
  const ano = 2026 + Math.floor((10 + i) / 12);
  const mes = ((10 + i) % 12) + 1;
  return { ano, mes, periodo: digitado(iso(ano, mes, 1), iso(ano, mes, ultimoDia(ano, mes))) };
});
const ANO_2027 = digitado("2027-01-01", "2027-12-31");
const FAIXA = digitado("2026-11-01", "2028-03-31");

/** Semanas inteiras dentro do mes + as pontas (do dia 1 ate domingo, de segunda ate o fim). */
function partesDoMes(m: Mes): Periodo[] {
  const inteiras = SEMANAS.filter((s) => s.de >= m.periodo.de && s.ate <= m.periodo.ate);
  const partes = [...inteiras];
  const primeira = inteiras[0];
  const ultima = inteiras[inteiras.length - 1];
  if (primeira.de > m.periodo.de) partes.unshift(digitado(iso(m.ano, m.mes, 1), diaOraculo(new Date(primeira.de.getTime() - 1))));
  if (ultima.ate < m.periodo.ate) partes.push(digitado(diaOraculo(new Date(ultima.ate.getTime() + 1)), iso(m.ano, m.mes, ultimoDia(m.ano, m.mes))));
  return partes;
}

/** Todos os botoes, em todos os dias da faixa, em tres horarios. */
function periodosDosBotoes(): { preset: Preset; agora: Date; periodo: Periodo }[] {
  const lista: { preset: Preset; agora: Date; periodo: Periodo }[] = [];
  for (let k = 0; k < TOTAL_DIAS; k++) {
    const d = diaCivil(k);
    for (const agora of [brt(d.ano, d.mes, d.dia, 0, 0, 0, 0), brt(d.ano, d.mes, d.dia, 15), brt(d.ano, d.mes, d.dia, 23, 59, 59, 999)]) {
      for (const preset of ["semana", "mes", "mes-passado"] as const) lista.push({ preset, agora, periodo: periodoDoPreset(preset, agora) });
    }
  }
  return lista;
}
const BOTOES = periodosDosBotoes();
const g2 = criarGerador(7);
const DIGITADOS: Periodo[] = Array.from({ length: 400 }, () => {
  const k = g2.inteiro(0, TOTAL_DIAS - 1);
  return digitado(isoCivil(k), isoCivil(k + g2.inteiro(0, 120)));
});

// ===========================================================================
describe("(a) semana, mes e ano fecham entre si - 500 pedidos, semente fixa", () => {
  it("o gerador cobre as bordas pedidas", () => {
    expect(PEDIDOS).toHaveLength(500);
    const hora = (d: Date) => (d.getUTCHours() + 21) % 24;
    expect(PEDIDOS.every((p) => [21, 22, 23, 0, 1, 2].includes(hora(p.orderDate)))).toBe(true);
    expect(PEDIDOS.filter((p) => hora(p.orderDate) >= 21).length).toBeGreaterThan(150);
    expect(PEDIDOS.filter((p) => hora(p.orderDate) <= 2).length).toBeGreaterThan(150);
    expect(PEDIDOS.filter((p) => semanaOraculo(p.orderDate) === "Sun" && hora(p.orderDate) === 23).length).toBeGreaterThan(40);
    expect(PEDIDOS.filter((p) => diaOraculo(p.orderDate) === "2028-02-29").length).toBeGreaterThan(0);
    expect(MESES.every((m) => doPeriodo(m.periodo).length > 5)).toBe(true);
    expect(RECEBIMENTOS.some((r) => r.paidAt === null)).toBe(true);
  });

  it("cada pedido cai em exatamente uma semana (segunda a domingo) e um mes, no dia de Brasilia", () => {
    const erros: string[] = [];
    for (const p of PEDIDOS) {
      const semanas = SEMANAS.filter((s) => dentroDoPeriodo(p.orderDate, s));
      const meses = MESES.filter((m) => dentroDoPeriodo(p.orderDate, m.periodo));
      const dia = diaOraculo(p.orderDate);
      if (semanas.length !== 1 || meses.length !== 1) {
        erros.push(`#${p.numero} ${dia}: ${semanas.length} semanas, ${meses.length} meses`);
        continue;
      }
      if (dia.slice(0, 7) !== iso(meses[0].ano, meses[0].mes, 1).slice(0, 7)) erros.push(`#${p.numero} ${dia} caiu em ${meses[0].mes}/${meses[0].ano}`);
      const n = numeroDoDia(dia);
      if (n < numeroDoDia(diaOraculo(semanas[0].de)) || n > numeroDoDia(diaOraculo(semanas[0].ate))) erros.push(`#${p.numero} ${dia} caiu na semana ${mostrar(semanas[0])}`);
    }
    expect(erros).toEqual([]);
  });

  it("semanas e meses encostam um no outro: sem buraco, sem sobreposicao, segunda 00:00 a domingo 23:59:59.999", () => {
    for (const s of SEMANAS) {
      expect([semanaOraculo(s.de), semanaOraculo(s.ate)]).toEqual(["Mon", "Sun"]);
      expect(s.ate.getTime() - s.de.getTime()).toBe(7 * DIA_MS - 1);
      expect(diaOraculo(new Date(s.de.getTime() - 1))).not.toBe(diaOraculo(s.de)); // comeca na meia-noite
    }
    for (let i = 1; i < SEMANAS.length; i++) expect(SEMANAS[i].de.getTime() - SEMANAS[i - 1].ate.getTime()).toBe(1);
    for (let i = 1; i < MESES.length; i++) expect(MESES[i].periodo.de.getTime() - MESES[i - 1].periodo.ate.getTime()).toBe(1);
    for (const m of MESES) expect(m.periodo.ate.getTime() - m.periodo.de.getTime()).toBe(ultimoDia(m.ano, m.mes) * DIA_MS - 1);
  });

  it("'Mes passado' e 'Este mes' (no ultimo dia) dao exatamente o mesmo mes que as datas digitadas", () => {
    for (const m of MESES) {
      expect(ms(periodoDoPreset("mes-passado", brt(m.ano, m.mes + 1, 1, 0, 0, 0, 0)))).toEqual(ms(m.periodo));
      expect(ms(periodoDoPreset("mes-passado", brt(m.ano, m.mes + 2, 0, 23, 59, 59, 999)))).toEqual(ms(m.periodo));
      expect(ms(periodoDoPreset("mes", brt(m.ano, m.mes, ultimoDia(m.ano, m.mes), 23, 59, 59, 999)))).toEqual(ms(m.periodo));
    }
  });

  it("semanas inteiras do mes + as pontas = o mes, em todos os numeros do relatorio", () => {
    for (const m of MESES) {
      const partes = partesDoMes(m);
      expect(partes[0].de.getTime()).toBe(m.periodo.de.getTime());
      expect(partes[partes.length - 1].ate.getTime()).toBe(m.periodo.ate.getTime());
      for (let i = 1; i < partes.length; i++) expect(partes[i].de.getTime() - partes[i - 1].ate.getTime()).toBe(1);
      expect(somar(partes.map((p) => numeros(resumoDe(p))))).toEqual(numeros(resumoDe(m.periodo)));
    }
    // Fevereiro/2027 comeca numa segunda e tem 28 dias: 4 semanas, sem ponta.
    expect(partesDoMes(MESES[3]).map(mostrar)).toEqual(["2027-02-01..2027-02-07", "2027-02-08..2027-02-14", "2027-02-15..2027-02-21", "2027-02-22..2027-02-28"]);
  });

  it("faturamento de cada mes = soma dos pedidos cujo dia (Brasilia) cai no mes", () => {
    for (const m of MESES) {
      const prefixo = iso(m.ano, m.mes, 1).slice(0, 7);
      const esperado = PEDIDOS.filter((p) => diaOraculo(p.orderDate).startsWith(prefixo)).reduce((s, p) => s + p.totalInCents, 0);
      expect(resumoDe(m.periodo).faturamentoInCents).toBe(esperado);
    }
  });

  it("12 meses de 2027 = o ano de 2027; 17 meses = a faixa toda = os 500 pedidos", () => {
    expect(somar(MESES.filter((m) => m.ano === 2027).map((m) => numeros(resumoDe(m.periodo))))).toEqual(numeros(resumoDe(ANO_2027)));
    expect(somar(MESES.map((m) => numeros(resumoDe(m.periodo))))).toEqual(numeros(resumoDe(FAIXA)));
    expect(resumoDe(FAIXA).pedidos).toBe(500);
    expect(resumoDe(FAIXA).faturamentoInCents).toBe(PEDIDOS.reduce((s, p) => s + p.totalInCents, 0));
    // 31/12/2027 23:59:59.999 e de 2027; 01/01/2028 00:00 ja e de 2028.
    expect(doPeriodo(ANO_2027).map((p) => p.numero)).toContain(1);
    expect(doPeriodo(ANO_2027).map((p) => p.numero)).not.toContain(2);
  });

  it("caixa: semanas + pontas = caixa do mes; 12 meses = ano; e bate com a data (paidAt ou createdAt) em Brasilia", () => {
    for (const m of MESES) {
      const partes = partesDoMes(m).map(caixaDe);
      const mes = caixaDe(m.periodo);
      expect(partes.reduce((s, c) => s + c.totalInCents, 0)).toBe(mes.totalInCents);
      expect(partes.reduce((s, c) => s + c.recebimentos, 0)).toBe(mes.recebimentos);
      const prefixo = iso(m.ano, m.mes, 1).slice(0, 7);
      const esperado = RECEBIMENTOS.filter((r) => diaOraculo(r.paidAt ?? r.createdAt).startsWith(prefixo)).reduce((s, r) => s + r.amountInCents, 0);
      expect(mes.totalInCents).toBe(esperado);
    }
    const meses2027 = MESES.filter((m) => m.ano === 2027).map((m) => caixaDe(m.periodo).totalInCents);
    expect(meses2027.reduce((s, v) => s + v, 0)).toBe(caixaDe(ANO_2027).totalInCents);
  });

  it("faturamento = pago + a receber, e soma do lucro por cliente = lucro estimado, em todo periodo", () => {
    const todos = [...SEMANAS, ...MESES.flatMap((m) => [m.periodo, ...partesDoMes(m)]), ANO_2027, FAIXA, ...DIGITADOS];
    const erros: string[] = [];
    for (const p of todos) {
      const pedidos = doPeriodo(p);
      const r = resumirVendas(pedidos, catalogo);
      const clientes = rentabilidadePorCliente(pedidos, catalogo);
      const soma = (campo: "lucroInCents" | "receitaInCents" | "custoInCents") => clientes.reduce((s, c) => s + c[campo], 0);
      if (r.pagoDestesPedidosInCents + r.aReceberDestesPedidosInCents !== r.faturamentoInCents) erros.push(`${mostrar(p)} pago+receber`);
      if (soma("lucroInCents") !== r.lucroInCents) erros.push(`${mostrar(p)} lucro por cliente`);
      if (soma("receitaInCents") !== r.receitaPecasInCents + r.receitaServicosInCents) erros.push(`${mostrar(p)} receita por cliente`);
      if (soma("custoInCents") !== r.custoInCents) erros.push(`${mostrar(p)} custo por cliente`);
    }
    expect(erros).toEqual([]);
    // Homonimos ficam em linhas separadas (agrupa por id).
    expect(rentabilidadePorCliente(PEDIDOS, catalogo).filter((c) => c.rotulo === "Cliente 1")).toHaveLength(2);
  });

  it("periodoAnterior nunca sobrepoe o atual (e cabe na consulta unica de recebimentos da tela)", () => {
    const todos = [...SEMANAS, ...MESES.flatMap((m) => [m.periodo, ...partesDoMes(m)]), ANO_2027, FAIXA, ...DIGITADOS, ...BOTOES.map((b) => b.periodo)];
    const erros = todos
      .map((p) => ({ p, a: periodoAnterior(p) }))
      .filter(({ p, a }) => !(a.ate.getTime() < p.de.getTime() && a.de.getTime() <= a.ate.getTime()))
      .map(({ p, a }) => `${mostrar(p)} -> ${mostrar(a)}`);
    expect(erros).toEqual([]);
  });

  it("mes inteiro compara com o mes anterior inteiro (fev/2028 com 29 dias, jan/2028 com dez/2027); ano e trimestre idem", () => {
    for (let i = 1; i < MESES.length; i++) expect(ms(periodoAnterior(MESES[i].periodo))).toEqual(ms(MESES[i - 1].periodo));
    expect(mostrar(periodoAnterior(ANO_2027))).toBe("2026-01-01..2026-12-31");
    expect(mostrar(periodoAnterior(digitado("2027-11-01", "2028-01-31")))).toBe("2027-08-01..2027-10-31");
  });

  it("'Este mes' compara com os mesmos dias do mes anterior, cortando no fim dele", () => {
    const erros: string[] = [];
    for (const { preset, agora, periodo } of BOTOES) {
      if (preset !== "mes") continue;
      const [a, m, d] = diaOraculo(agora).split("-").map(Number);
      const antAno = m === 1 ? a - 1 : a;
      const antMes = m === 1 ? 12 : m - 1;
      const fim = d === ultimoDia(a, m) ? ultimoDia(antAno, antMes) : Math.min(d, ultimoDia(antAno, antMes));
      const esperado = digitado(iso(antAno, antMes, 1), iso(antAno, antMes, fim));
      if (ms(periodoAnterior(periodo)).join() !== ms(esperado).join()) erros.push(`${diaOraculo(agora)}: ${mostrar(periodoAnterior(periodo))}`);
    }
    expect(erros).toEqual([]);
  });

  it("'Esta semana' compara com os mesmos dias da semana passada (semanas que nao comecam no dia 1)", () => {
    const erros: string[] = [];
    for (const { preset, agora, periodo } of BOTOES) {
      if (preset !== "semana" || diaOraculo(periodo.de).endsWith("-01")) continue;
      const a = periodoAnterior(periodo);
      if (a.de.getTime() !== periodo.de.getTime() - 7 * DIA_MS || a.ate.getTime() !== periodo.ate.getTime() - 7 * DIA_MS) erros.push(`${diaOraculo(agora)}: ${mostrar(a)}`);
    }
    expect(erros).toEqual([]);
  });

  // Confirmado falhando (TZ=UTC e America/Sao_Paulo) em 21 dias da faixa:
  // 01-07/02/2027 -> 01-07/01/2027; 01-07/03/2027 -> 01-07/02/2027; 01-07/11/2027 -> 01-07/10/2027.
  it("'Esta semana' que comeca numa segunda dia 1 compara com a semana passada, e nao com o mes anterior", () => {
    // Corrigido: a tela passa o botão de origem para periodoAnterior.
    for (const hoje of ["2027-02-03T15:00:00-03:00", "2027-03-03T15:00:00-03:00", "2027-11-03T15:00:00-03:00"]) {
      const agora = new Date(hoje);
      const semana = resolverPeriodo({ preset: "semana" }, agora);
      const anterior = periodoAnterior(semana, semana.preset);
      expect(anterior.de.getTime()).toBe(semana.de.getTime() - 7 * 86_400_000);
      expect(anterior.ate.getTime()).toBe(semana.ate.getTime() - 7 * 86_400_000);
    }
    // O mesmo intervalo vindo de "Este mês" continua comparando com o mês anterior.
    const mes = resolverPeriodo({ preset: "mes" }, new Date("2027-11-03T15:00:00-03:00"));
    expect(diaIso(diaEmBrasilia(periodoAnterior(mes, mes.preset).de))).toBe("2027-10-01");
  });

  it("o link 'Exportar CSV' leva exatamente o mesmo periodo da tela, mesmo clicado dias depois", () => {
    // Copia de toInputDate em src/app/relatorios/page.tsx:46-48.
    const toInputDate = (d: Date) => diaIso(diaEmBrasilia(d));
    const erros: string[] = [];
    for (const p of [...BOTOES.map((b) => b.periodo), ...DIGITADOS, ...MESES.map((m) => m.periodo)]) {
      const exportado = resolverPeriodo({ from: toInputDate(p.de), to: toInputDate(p.ate) }, new Date(p.ate.getTime() + 5 * DIA_MS));
      if (ms(exportado).join() !== ms(p).join()) erros.push(`${mostrar(p)} -> ${mostrar(exportado)}`);
    }
    expect(erros).toEqual([]);
  });

  it("a data do pedido perto da meia-noite aparece no dia de Brasilia (tela e planilha)", () => {
    // Mesma chamada de formatDate em src/app/relatorios/export/route.ts:18.
    const noCsv = (d: Date) => d.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
    const erros = PEDIDOS.filter((p) => {
      const [a, m, d] = diaOraculo(p.orderDate).split("-");
      return formatLongDate(p.orderDate) !== `${d}/${m}/${a}` || noCsv(p.orderDate) !== `${d}/${m}/${a}` || dateToInputValue(p.orderDate) !== `${a}-${m}-${d}`;
    }).map((p) => `#${p.numero}`);
    expect(erros).toEqual([]);
  });
});

// ===========================================================================
describe("(b) prazos hora a hora em volta da meia-noite de Brasilia", () => {
  const FORMATOS = [
    { nome: "12:00Z", gravar: (dia: string) => new Date(`${dia}T12:00:00Z`) },
    { nome: "15:00Z", gravar: (dia: string) => new Date(`${dia}T15:00:00Z`) },
    { nome: "23:43Z", gravar: (dia: string) => new Date(`${dia}T23:43:00Z`) },
  ];
  const DIAS = ["2026-09-14", "2026-09-30", "2026-11-01", "2026-12-31", "2027-02-28", "2027-03-01", "2027-10-31", "2027-12-31", "2028-02-29", "2028-03-31"];
  const STATUS: OrderStatus[] = ["RECEIVED", "WAITING_MATERIAL", "CUTTING", "SEWING", "EMBROIDERY_PRINT", "FINISHING", "READY", "DELIVERED", "CANCELED"];

  /** De D-1 18h a D+2 06h (Brasilia), em cada hora cheia e no ultimo ms dela. */
  function instantes(dia: string): Date[] {
    const [a, m, d] = dia.split("-").map(Number);
    const lista: Date[] = [];
    for (let h = -6; h <= 54; h++) lista.push(brt(a, m, d, h, 0, 0, 0), brt(a, m, d, h, 59, 59, 999));
    return lista;
  }

  type Caso = { dia: string; formato: string; prazo: Date; agora: Date; dias: number };
  const CASOS: Caso[] = DIAS.flatMap((dia) =>
    FORMATOS.flatMap((f) => instantes(dia).map((agora) => ({ dia, formato: f.nome, prazo: f.gravar(dia), agora, dias: numeroDoDia(diaOraculo(agora)) - numeroDoDia(dia) }))),
  );
  const rotulo = (c: Caso) => `${c.formato} prazo ${c.dia} agora ${diaOraculo(c.agora)} ${(c.agora.getUTCHours() + 21) % 24}h`;

  it("os tres formatos gravados caem no dia do prazo em Brasilia", () => {
    for (const c of CASOS) expect(diaOraculo(c.prazo)).toBe(c.dia);
    expect(CASOS.length).toBe(DIAS.length * 3 * 122);
  });

  it("nunca 'atrasado' e 'hoje' ao mesmo tempo; 'hoje' so no dia; 'atrasado' so a partir de 00:00 do dia seguinte", () => {
    const erros: string[] = [];
    for (const c of CASOS) {
      for (const status of STATUS) {
        const pedido = { status, paymentStatus: "PARTIAL" as const, deliveryDate: c.prazo, totalAmountInCents: 10_000, paidAmountInCents: 3_000 };
        const atrasado = pedidoCasaFiltro(pedido, "atrasados", c.agora);
        const hoje = pedidoCasaFiltro(pedido, "hoje", c.agora);
        const ativo = status !== "DELIVERED" && status !== "CANCELED";
        if (atrasado && hoje) erros.push(`${rotulo(c)} ${status}: atrasado E hoje`);
        if (atrasado !== (ativo && c.dias >= 1)) erros.push(`${rotulo(c)} ${status}: atrasado=${atrasado}`);
        if (hoje !== (ativo && c.dias === 0)) erros.push(`${rotulo(c)} ${status}: hoje=${hoje}`);
      }
    }
    expect(erros).toEqual([]);
  });

  it("isOrderLate, prazoVencido e situacaoPagamento nunca dizem atrasado no dia do prazo", () => {
    const erros: string[] = [];
    for (const c of CASOS) {
      if (prazoVencido(c.prazo, c.agora) !== c.dias >= 1) erros.push(`${rotulo(c)} prazoVencido`);
      for (const status of STATUS) {
        const ativo = status !== "DELIVERED" && status !== "CANCELED";
        if (isOrderLate(c.prazo, status, c.agora) !== (ativo && c.dias >= 1)) erros.push(`${rotulo(c)} ${status} isOrderLate`);
        const venceu = c.dias >= 1 && status !== "CANCELED";
        const parcial = situacaoPagamento({ status, totalAmountInCents: 10_000, paidAmountInCents: 3_000 }, c.prazo, c.agora).rotulo;
        const nada = situacaoPagamento({ status, totalAmountInCents: 10_000, paidAmountInCents: 0 }, c.prazo, c.agora).rotulo;
        const pago = situacaoPagamento({ status, totalAmountInCents: 10_000, paidAmountInCents: 10_000 }, c.prazo, c.agora).rotulo;
        if (parcial !== (venceu ? "Atrasado" : "Parcialmente pago")) erros.push(`${rotulo(c)} ${status} parcial=${parcial}`);
        if (nada !== (venceu ? "Atrasado" : "Não pago")) erros.push(`${rotulo(c)} ${status} nada=${nada}`);
        if (pago !== "Pago") erros.push(`${rotulo(c)} ${status} pago=${pago}`);
      }
    }
    expect(erros).toEqual([]);
  });

  it("dias de atraso do Financeiro contam dias de calendario de Brasilia, e 'Atrasado' do Financeiro = selo do pagamento", () => {
    const erros: string[] = [];
    for (const c of CASOS) {
      const dias = diasDeAtraso(c.prazo, c.agora);
      if (dias !== Math.max(0, c.dias)) erros.push(`${rotulo(c)}: ${dias} dias`);
      // db-finance-manager.tsx:56 soma em "Atrasado" quando late > 0.
      const selo = situacaoPagamento({ status: "SEWING", totalAmountInCents: 10_000, paidAmountInCents: 0 }, c.prazo, c.agora).rotulo;
      if (dias > 0 !== (selo === "Atrasado")) erros.push(`${rotulo(c)}: financeiro ${dias} x selo ${selo}`);
    }
    expect(erros).toEqual([]);
    // Pontas: 23:59:59.999 do dia seguinte ainda e 1; 00:00 de dois dias depois e 2.
    const prazo = new Date("2027-12-31T15:00:00Z");
    expect(diasDeAtraso(prazo, brt(2027, 12, 31, 23, 59, 59, 999))).toBe(0);
    expect(diasDeAtraso(prazo, brt(2028, 1, 1, 0, 0, 0, 0))).toBe(1);
    expect(diasDeAtraso(prazo, brt(2028, 1, 1, 23, 59, 59, 999))).toBe(1);
    expect(diasDeAtraso(prazo, brt(2028, 1, 2, 0, 0, 0, 0))).toBe(2);
  });

  it("pontualidade: entregar ate 23:59:59.999 do dia do prazo e no prazo; 00:00 do dia seguinte e 1 dia de atraso", () => {
    for (const dia of DIAS) {
      const [a, m, d] = dia.split("-").map(Number);
      for (const f of FORMATOS) {
        const prazo = f.gravar(dia);
        const r = calcularPontualidade([
          { numero: 1, prazo, entregueEm: brt(a, m, d - 1, 23, 59) },
          { numero: 2, prazo, entregueEm: brt(a, m, d, 0, 0, 0, 0) },
          { numero: 3, prazo, entregueEm: brt(a, m, d, 23, 59, 59, 999) },
          { numero: 4, prazo, entregueEm: brt(a, m, d + 1, 0, 0, 0, 0) },
          { numero: 5, prazo, entregueEm: brt(a, m, d + 2, 0, 30) },
        ]);
        expect([r.noPrazo, r.atrasados, r.piorAtraso?.dias]).toEqual([3, 2, 2]);
      }
    }
  });

  it("o prazo aparece no dia certo nos tres formatos (lista, ficha, campo de edicao)", () => {
    for (const dia of DIAS) {
      const [a, m, d] = dia.split("-");
      expect(dateInputToDate(dia)?.toISOString()).toBe(`${dia}T15:00:00.000Z`);
      for (const f of FORMATOS) {
        const prazo = f.gravar(dia);
        expect(dateToInputValue(prazo)).toBe(dia);
        expect(formatLongDate(prazo)).toBe(`${d}/${m}/${a}`);
        expect(formatShortDate(prazo)).toBe(formatShortDate(dateInputToDate(dia)));
      }
    }
  });
});

// ===========================================================================
// Cada item abaixo foi escrito como teste, confirmado falhando e trocado por
// it.todo. Reproducao completa no relatorio da verificacao.
// Corrigidos depois da verificação: a ficha do pedido, a lista de pedidos e o
// "Acompanhamento geral" do Início passaram a usar isOrderLate (a ficha tem
// teste em verificacao-dinheiro-e-telas.test.ts). "Faturamento previsto" com
// pedido CANCELADO foi refutado: nenhuma tela leva um pedido a CANCELED.
describe("(c) lixeira conta dias no calendario de Brasilia", () => {
  it("apagado as 20h e visto as 22h do mesmo dia: 0 dias, e nao 'ontem'", async () => {
    const { diasNaLixeira } = await import("@/lib/lixeira");
    expect(diasNaLixeira(new Date("2026-09-14T20:00:00-03:00"), new Date("2026-09-14T22:00:00-03:00"))).toBe(0);
    expect(diasNaLixeira(new Date("2026-09-14T20:00:00-03:00"), new Date("2026-09-15T00:10:00-03:00"))).toBe(1);
  });
});
