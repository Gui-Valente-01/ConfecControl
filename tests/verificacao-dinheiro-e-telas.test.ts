/* eslint-disable @typescript-eslint/no-explicit-any */
// Verificação de dinheiro do pedido e coerência entre telas.
//
// Duas partes:
// (a) força bruta nas funções puras de dinheiro, com o que um brasileiro digita;
// (b) as server actions DE VERDADE (criar, editar, "Recebi", apagar recebimento)
//     rodando contra um banco falso em memória, e as telas DE VERDADE (detalhe do
//     pedido, Financeiro, ficha do cliente, CSV) renderizadas a partir dele —
//     para conferir que todas mostram o mesmo número para o mesmo pedido.
//
// Nada aqui toca o banco real: @/lib/prisma é trocado por um objeto em memória.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

// ---------------------------------------------------------------------------
// Banco falso (só o que as actions e as telas usam)
// ---------------------------------------------------------------------------

const fake = vi.hoisted(() => {
  const USUARIO = { id: "u-1", name: "Dono", role: "ADMIN", companyId: "empresa-1", features: [] as string[] };
  const s = {
    orders: [] as any[],
    payments: [] as any[],
    items: [] as any[],
    services: [] as any[],
    clients: [] as any[],
    seq: 0,
    relogio: Date.UTC(2026, 8, 1, 15, 0, 0),
  };
  const novoId = (p: string) => `${p}-${String(++s.seq).padStart(5, "0")}`;
  // createdAt estritamente crescente: a ordem de lançamento importa para a "entrada".
  const carimbo = () => new Date((s.relogio += 1000));

  function pagamentosDo(orderId: string) {
    return s.payments
      .filter((p) => p.orderId === orderId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime() || (a.id < b.id ? -1 : 1))
      .map((p) => ({ ...p }));
  }

  function visao(o: any) {
    return {
      ...o,
      client: { ...s.clients.find((c) => c.id === o.clientId) },
      currentStage: null,
      partner: null,
      attachments: [],
      history: [],
      items: s.items.filter((i) => i.orderId === o.id).map((i) => ({ ...i, product: null })),
      services: s.services.filter((x) => x.orderId === o.id).map((x) => ({ ...x })),
      payments: pagamentosDo(o.id),
    };
  }

  function criarPagamento(data: any) {
    const p = {
      id: novoId("pag"),
      status: "PAID",
      method: null,
      note: null,
      paidAt: null,
      dueDate: null,
      idempotencyKey: null,
      ...data,
      createdAt: carimbo(),
    };
    s.payments.push(p);
    return { ...p };
  }

  function aplicarRelacoes(o: any, data: any) {
    const { items, services, payments, ...escalares } = data;
    Object.assign(o, escalares);
    for (const it of items?.create ?? []) s.items.push({ id: novoId("item"), orderId: o.id, productId: null, size: null, color: null, ...it });
    for (const sv of services?.create ?? []) s.services.push({ id: novoId("srv"), orderId: o.id, createdAt: carimbo(), ...sv });
    if (payments?.create) {
      const lista = Array.isArray(payments.create) ? payments.create : [payments.create];
      for (const p of lista) criarPagamento({ orderId: o.id, ...p });
    }
  }

  const prisma: any = {
    client: {
      findFirst: async ({ where }: any) => {
        const c = s.clients.find((x) => x.id === where.id && (!where.companyId || x.companyId === where.companyId));
        if (!c) return null;
        const orders = s.orders
          .filter((o) => o.clientId === c.id)
          .map((o) => {
            const v = visao(o);
            return {
              ...v,
              items: v.items.slice(0, 1),
              payments: v.payments.sort((a: any, b: any) => (b.paidAt?.getTime() ?? 0) - (a.paidAt?.getTime() ?? 0)),
            };
          });
        return { ...c, orders };
      },
    },
    product: { findMany: async () => [] },
    productionStage: { findFirst: async () => null },
    order: {
      findFirst: async ({ where, orderBy }: any) => {
        if (orderBy?.number === "desc") {
          const ultimo = s.orders.filter((o) => o.companyId === where.companyId).sort((a, b) => b.number - a.number)[0];
          return ultimo ? { number: ultimo.number } : null;
        }
        const o = s.orders.find((x) => x.id === where.id && (!where.companyId || x.companyId === where.companyId));
        return o ? visao(o) : null;
      },
      findUniqueOrThrow: async ({ where }: any) => {
        const o = s.orders.find((x) => x.id === where.id);
        if (!o) throw new Error("pedido não existe");
        return visao(o);
      },
      findMany: async () => [...s.orders].sort((a, b) => a.number - b.number).map(visao),
      create: async ({ data }: any) => {
        const o: any = {
          id: novoId("pedido"),
          orderDate: new Date(),
          priority: "NORMAL",
          assignee: null,
          partnerId: null,
          internalNotes: null,
          paymentMethod: null,
        };
        const { items, services, payments, ...escalares } = data;
        Object.assign(o, escalares);
        s.orders.push(o);
        aplicarRelacoes(o, { items, services, payments });
        return { id: o.id };
      },
      update: async ({ where, data }: any) => {
        const o = s.orders.find((x) => x.id === where.id);
        aplicarRelacoes(o, data);
        return { ...o };
      },
    },
    payment: {
      findMany: async ({ where }: any) => pagamentosDo(where.orderId),
      findFirst: async ({ where }: any) => {
        const p = s.payments.find((x) => x.id === where.id);
        if (!p) return null;
        const o = s.orders.find((x) => x.id === p.orderId);
        if (where.order?.companyId && o.companyId !== where.order.companyId) return null;
        return { ...p, order: { number: o.number } };
      },
      create: async ({ data }: any) => criarPagamento(data),
      update: async ({ where, data }: any) => {
        const p = s.payments.find((x) => x.id === where.id);
        Object.assign(p, data);
        return { ...p };
      },
      delete: async ({ where }: any) => {
        const i = s.payments.findIndex((x) => x.id === where.id);
        return s.payments.splice(i, 1)[0];
      },
      deleteMany: async ({ where }: any) => {
        const antes = s.payments.length;
        s.payments = s.payments.filter((x) => x.id !== where.id);
        return { count: antes - s.payments.length };
      },
    },
    orderItem: {
      deleteMany: async ({ where }: any) => {
        s.items = s.items.filter((x) => x.orderId !== where.orderId);
        return { count: 0 };
      },
    },
    orderService: {
      deleteMany: async ({ where }: any) => {
        s.services = s.services.filter((x) => x.orderId !== where.orderId);
        return { count: 0 };
      },
    },
    $transaction: async (fn: any) => fn(prisma),
  };

  function reset() {
    s.orders = [];
    s.payments = [];
    s.items = [];
    s.services = [];
    s.seq = 0;
    s.relogio = Date.UTC(2026, 8, 1, 15, 0, 0);
    s.clients = [
      { id: "cliente-1", companyId: "empresa-1", name: "Maria Uniformes", phone: null, contact: null, email: null, address: null, document: null, notes: null },
      { id: "cliente-2", companyId: "empresa-1", name: "Escola Sol", phone: null, contact: null, email: null, address: null, document: null, notes: null },
    ];
  }

  return { s, prisma, reset, visao: (id: string) => visao(s.orders.find((o) => o.id === id)), USUARIO };
});

vi.mock("@/lib/prisma", () => ({ prisma: fake.prisma }));
vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`redirect:${url}`);
  },
  notFound: () => {
    throw new Error("notFound");
  },
  usePathname: () => "/",
}));
vi.mock("next/link", async () => {
  const React = await import("react");
  return {
    default: ({ href, children, className }: any) => React.createElement("a", { href: String(href), className }, children),
  };
});
vi.mock("@/lib/auth", () => ({
  companyIdWithCapability: async () => fake.USUARIO.companyId,
  requireUser: async () => fake.USUARIO,
  requireRouteUser: async () => fake.USUARIO,
  userWithCapability: async () => fake.USUARIO,
}));
vi.mock("@/app/avisos/actions", () => ({ registrarAviso: async () => undefined }));
vi.mock("@/lib/prateleira-db", () => ({ sincronizarPrateleira: async () => undefined }));
vi.mock("@/lib/storage", () => ({
  removeAttachmentByPath: async () => undefined,
  removeAttachmentFromStorage: async () => undefined,
  storageConfigured: () => false,
  uploadAttachmentToStorage: async () => null,
  signedUrlForAttachment: async () => null,
}));
vi.mock("@/lib/anexos-link", () => ({ comLinkAssinado: async (lista: unknown[]) => lista }));
vi.mock("@/components/app-shell", async () => {
  const React = await import("react");
  return { AppShell: ({ children }: any) => React.createElement("main", null, children) };
});
vi.mock("@/components/toast-form", async () => {
  const React = await import("react");
  return { ToastForm: ({ children }: any) => React.createElement("form", null, children) };
});
vi.mock("@/components/campo-idempotencia", () => ({ CampoIdempotencia: () => null }));
vi.mock("@/components/attachment-upload-form", () => ({ AttachmentUploadForm: () => null }));
vi.mock("@/components/confirm-delete-button", () => ({ ConfirmDeleteButton: () => null }));

import { createOrderAction, updateOrderAction } from "@/app/pedidos/actions";
import { deletePaymentAction, registerPaymentAction } from "@/app/financeiro/actions";
import { DbFinanceManager } from "@/components/db-finance-manager";
import OrderDetailPage from "@/app/pedidos/[id]/page";
import ClienteDetalhePage from "@/app/clientes/[id]/page";
import { GET as exportarCsv } from "@/app/relatorios/export/route";
import type { FormState } from "@/lib/form-state";
import {
  centsToCurrency,
  centsToInput,
  currencyToCents,
  dateToInputValue,
  moneyToCents,
  priceExpressionToCents,
} from "@/lib/format";
import { parseItems, parseServices, resolvePaymentStatus } from "@/lib/order-items";
import {
  computeBalance,
  planejarEdicaoDaEntrada,
  resolveReceiptAmount,
  resolveStatusFromReceipts,
  sumReceipts,
  type Receipt,
} from "@/lib/payments";
import { pedidoCasaFiltro } from "@/lib/order-filters";
import { isOrderLate } from "@/lib/status";
import { indexarCatalogo, resumirVendas } from "@/lib/relatorio";

const VAZIO: FormState = {};

// Gerador pseudoaleatório com semente: a falha, se houver, se repete igual.
function sorteador(semente: number) {
  let a = semente >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const inteiro = (r: () => number, min: number, max: number) => min + Math.floor(r() * (max - min + 1));

// ===========================================================================
// (a) FORÇA BRUTA NAS FUNÇÕES DE DINHEIRO
// ===========================================================================

describe("(a) texto digitado -> centavos", () => {
  it.each([
    ["1.234,56", 123456],
    ["1234.5", 123450],
    ["1234,5", 123450],
    ["R$ 12,9", 1290],
    ["R$12,90", 1290],
    ["0,01", 1],
    [" 45 ", 4500],
    ["45", 4500],
    ["3.25", 325],
    ["10.5", 1050],
    ["1.234", 123400],
    ["1.234.567", 123456700],
    ["1.234.567,89", 123456789],
    ["R$ 1.500,00", 150000],
    ["1.000,00", 100000],
    ["0,5", 50],
    [",5", 50],
    ["5,", 500],
    ["R$ 0,00", 0],
    ["", 0],
    ["abc", 0],
    ["R$", 0],
    [",", 0],
  ])("moneyToCents(%j) = %i centavos", (texto, esperado) => {
    expect(moneyToCents(texto)).toBe(esperado);
  });

  it("'12,345' (três casas) arredonda para o centavo mais próximo, sem virar doze mil", () => {
    expect(moneyToCents("12,345")).toBe(1235);
  });

  it("sinal de menos: currencyToCents mantém o negativo, moneyToCents zera", () => {
    expect(currencyToCents("-5")).toBe(-500);
    expect(currencyToCents("-1.234,56")).toBe(-123456);
    expect(moneyToCents("-5")).toBe(0);
    expect(moneyToCents("-0,01")).toBe(0);
  });

  it("volta sem perda: centavos -> campo de edição (centsToInput) -> centavos, de R$ 0,00 a R$ 10.000,00 centavo a centavo", () => {
    let primeiroErro: number | undefined;
    for (let c = 0; c <= 1_000_000 && primeiroErro === undefined; c++) {
      if (moneyToCents(centsToInput(c)) !== c) primeiroErro = c;
    }
    expect(primeiroErro).toBeUndefined();
  });

  it("volta sem perda também em valores grandes (até R$ 20 milhões, 50 mil sorteios)", () => {
    const r = sorteador(20260914);
    const erros: number[] = [];
    for (let i = 0; i < 50_000; i++) {
      const c = inteiro(r, 0, 2_000_000_000);
      if (moneyToCents(centsToInput(c)) !== c) erros.push(c);
      if (priceExpressionToCents(centsToInput(c)) !== c) erros.push(-c);
    }
    expect(erros).toEqual([]);
  });

  it("o que a tela mostra (centsToCurrency) lido de volta dá o mesmo valor", () => {
    // centsToCurrency cria um Intl.NumberFormat por chamada (lento): amostra menor.
    const erros: number[] = [];
    for (let c = 0; c <= 10_000; c++) {
      if (currencyToCents(centsToCurrency(c)) !== c) erros.push(c);
    }
    const r = sorteador(7);
    for (let i = 0; i < 1_000; i++) {
      const c = inteiro(r, 0, 2_000_000_000);
      if (currencyToCents(centsToCurrency(c)) !== c) erros.push(c);
    }
    expect(erros).toEqual([]);
    expect(centsToCurrency(123456789)).toBe("R$ 1.234.567,89");
  }, 30_000);
});

describe("(a) valor de serviço com conta (priceExpressionToCents)", () => {
  it.each([
    ["4x", 400],
    ["4x0", 0],
    ["4x100", 40000],
    ["4 X 100", 40000],
    ["4*100", 40000],
    ["3,50 x 60", 21000],
    ["R$ 2,25 x 40", 9000],
    ["100 x 4,50", 45000],
    ["1.234,56 x 2", 246912],
    ["400,00", 40000],
    ["abc", 0],
    ["-5", 0],
    ["-4x100", 0],
    [" 45 ", 4500],
  ])("priceExpressionToCents(%j) = %i centavos", (texto, esperado) => {
    expect(priceExpressionToCents(texto)).toBe(esperado);
  });

  // Corrigido: o lado da quantidade segue a escrita brasileira (format.ts).
  it("'4x1.000' e R$ 4 x mil pecas = R$ 4.000,00", () => {
    expect(priceExpressionToCents("4x1.000")).toBe(400000);
  });
  it("'2 x 1.500,00' = R$ 3.000,00", () => {
    expect(priceExpressionToCents("2 x 1.500,00")).toBe(300000);
  });
  it("'10x2,5' = R$ 25,00 (quantidade com virgula)", () => {
    expect(priceExpressionToCents("10x2,5")).toBe(2500);
  });
});

describe("(a) itens e serviços do pedido (parseItems / parseServices)", () => {
  it("preço enviado pelo campo numérico volta ao centavo exato (R$ 0,00 a R$ 3.000,00 centavo a centavo + valores grandes)", () => {
    // order-form.tsx:135 põe (centavos/100).toString() no campo; :271 envia Number(...).
    const r = sorteador(11);
    const valores = [
      ...Array.from({ length: 300_001 }, (_, c) => c),
      ...Array.from({ length: 20_000 }, () => inteiro(r, 0, 2_000_000_000)),
    ];
    const lote = valores.map((c) => ({ description: "x", quantity: 1, unitPrice: Number((c / 100).toString()) || 0 }));
    const lidos = parseItems(JSON.stringify(lote));
    const errado = lidos.findIndex((item, i) => item.unitPriceInCents !== valores[i]);
    expect(errado).toBe(-1);
  }, 30_000);

  it("mil linhas de R$ 0,10 x 3 somam R$ 300,00 exatos (sem erro de ponto flutuante)", () => {
    const itens = Array.from({ length: 1000 }, (_, i) => ({ description: `Peça ${i}`, quantity: 3, unitPrice: 0.1 }));
    const total = parseItems(JSON.stringify(itens)).reduce((soma, item) => soma + item.totalPriceInCents, 0);
    expect(total).toBe(30000);
  });

  it("20 mil linhas sorteadas: total do pedido = soma inteira de preço x quantidade", () => {
    const r = sorteador(42);
    const linhas = Array.from({ length: 20_000 }, () => ({ c: inteiro(r, 0, 500_000), q: inteiro(r, 1, 500) }));
    const esperado = linhas.reduce((s, l) => s + l.c * l.q, 0);
    const lidos = parseItems(JSON.stringify(linhas.map((l) => ({ description: "p", quantity: l.q, unitPrice: l.c / 100 }))));
    expect(lidos).toHaveLength(20_000);
    expect(lidos.reduce((s, i) => s + i.totalPriceInCents, 0)).toBe(esperado);
  });

  it("texto nos itens: '12,50' e '1.234,56' viram centavos; quantidade quebrada é arredondada para baixo; zero sai", () => {
    const lidos = parseItems(
      JSON.stringify([
        { description: "A", quantity: "3", unitPrice: "12,50" },
        { description: "B", quantity: 2.9, unitPrice: "1.234,56" },
        { description: "C", quantity: 0, unitPrice: 10 },
        { description: "D", quantity: 1, unitPrice: -5 },
        { description: "", quantity: 1, unitPrice: 10 },
      ]),
    );
    expect(lidos.map((i) => [i.description, i.quantity, i.unitPriceInCents, i.totalPriceInCents])).toEqual([
      ["A", 3, 1250, 3750],
      ["B", 2, 123456, 246912],
      ["D", 1, 0, 0],
    ]);
    expect(parseItems("{quebrado")).toEqual([]);
    expect(parseItems('{"a":1}')).toEqual([]);
  });

  it("serviços: conta, valor simples, cortesia e sinal errado", () => {
    const lidos = parseServices(
      JSON.stringify([
        { name: "Silk", price: "4x100" },
        { name: "Bordado", price: "3,50 x 60" },
        { name: "Corte", price: "1.234,56" },
        { name: "Cortesia", price: "abc" },
        { name: "Errado", price: "-5" },
        { name: "Numérico", price: 12.5 },
        { name: "", price: "10" },
      ]),
    );
    expect(lidos.map((s) => [s.name, s.priceInCents])).toEqual([
      ["Silk", 40000],
      ["Bordado", 21000],
      ["Corte", 123456],
      ["Cortesia", 0],
      ["Errado", 0],
      ["Numérico", 1250],
    ]);
  });
});

describe("(a) recebimentos, saldo e situação (payments.ts)", () => {
  it("dez mil recebimentos de R$ 0,01 somam R$ 100,00 exatos", () => {
    expect(sumReceipts(Array.from({ length: 10_000 }, () => ({ amountInCents: 1 })))).toBe(10_000);
  });

  it("saldo nunca negativo e situação sempre coerente com o saldo (200 mil sorteios)", () => {
    const r = sorteador(99);
    for (let i = 0; i < 200_000; i++) {
      const total = inteiro(r, 1, 5_000_000);
      const recs: Receipt[] = Array.from({ length: inteiro(r, 0, 4) }, () => ({ amountInCents: inteiro(r, 0, 3_000_000) }));
      const saldo = computeBalance(total, recs);
      const situacao = resolveStatusFromReceipts(total, recs);
      if (saldo < 0) throw new Error(`saldo negativo: ${total} ${JSON.stringify(recs)}`);
      if ((situacao === "PAID") !== (saldo === 0)) throw new Error(`situação ${situacao} com saldo ${saldo}`);
      if (situacao === "PENDING" && sumReceipts(recs) !== 0) throw new Error("pendente com dinheiro recebido");
      // A regra da criação (resolvePaymentStatus) e a do recebimento dão a mesma resposta.
      if (resolvePaymentStatus(sumReceipts(recs), total) !== situacao) throw new Error("regras de situação divergem");
    }
  });

  it("'Recebi' nunca registra acima do saldo nem valor negativo (200 mil sorteios)", () => {
    const r = sorteador(123);
    for (let i = 0; i < 200_000; i++) {
      const saldo = inteiro(r, -1000, 5_000_000);
      const pedido = r() < 0.2 ? null : inteiro(r, -1000, 6_000_000);
      const valor = resolveReceiptAmount(saldo, pedido);
      if (valor < 0 || valor > Math.max(0, saldo)) throw new Error(`saldo ${saldo}, pedido ${pedido}, registrou ${valor}`);
    }
  });

  it("parciais sorteados até quitar: soma final = total exato, e a situação só anda para frente", () => {
    const r = sorteador(5);
    for (let rodada = 0; rodada < 2_000; rodada++) {
      const total = inteiro(r, 1, 3_000_000);
      let recs: Receipt[] = [];
      let passos = 0;
      const ordem = { PENDING: 0, PARTIAL: 1, PAID: 2 } as const;
      let anterior = 0;
      while (computeBalance(total, recs) > 0) {
        const digitado = r() < 0.15 ? null : inteiro(r, 1, Math.ceil(total / 2));
        recs = [...recs, { amountInCents: resolveReceiptAmount(computeBalance(total, recs), digitado) }];
        const agora = ordem[resolveStatusFromReceipts(total, recs) as keyof typeof ordem];
        expect(agora).toBeGreaterThanOrEqual(anterior);
        anterior = agora;
        passos++;
        expect(passos).toBeLessThan(100);
      }
      expect(sumReceipts(recs)).toBe(total);
      expect(resolveStatusFromReceipts(total, recs)).toBe("PAID");
    }
  });

  it("edição da entrada: aplicar o plano deixa o total pago igual ao digitado; abaixo do que entrou depois é recusado", () => {
    const r = sorteador(77);
    const falhas: string[] = [];
    for (let i = 0; i < 50_000; i++) {
      const recs: Receipt[] = Array.from({ length: inteiro(r, 0, 5) }, () => ({ amountInCents: inteiro(r, 1, 100_000) }));
      const [entrada, ...depois] = recs;
      const recebidoDepois = sumReceipts(depois);
      const pago = inteiro(r, 0, sumReceipts(recs) + 50_000);
      const plano = planejarEdicaoDaEntrada(recs, pago);
      if (pago < recebidoDepois) {
        if (!("erro" in plano)) falhas.push(`aceitou ${pago} < ${recebidoDepois}`);
        continue;
      }
      if ("erro" in plano) {
        falhas.push(`recusou sem motivo: ${pago} ${JSON.stringify(recs)}`);
        continue;
      }
      let resultado: Receipt[];
      if (plano.acao === "manter") resultado = recs;
      else if (plano.acao === "apagar") resultado = depois;
      else if (plano.acao === "atualizar") resultado = [{ amountInCents: plano.valor }, ...depois];
      else resultado = [{ amountInCents: plano.valor }];
      if (plano.acao === "criar" && entrada) falhas.push("criou entrada tendo uma");
      if (sumReceipts(resultado) !== pago) falhas.push(`pago ${pago} virou ${sumReceipts(resultado)}`);
      // Formulário salvo sem mexer no "pago": nada muda.
      const semMexer = planejarEdicaoDaEntrada(recs, sumReceipts(recs));
      if (!("acao" in semMexer) || semMexer.acao !== "manter") falhas.push(`salvar sem mexer alterou: ${JSON.stringify(recs)}`);
    }
    expect(falhas).toEqual([]);
  }, 30_000);
});

// ===========================================================================
// (b) ACTIONS DE VERDADE + TELAS DE VERDADE, CONTRA O BANCO FALSO
// ===========================================================================

type ItemTela = { descricao: string; qtd: number; preco: number };

async function criarPedido(o: {
  itens: ItemTela[];
  servicos?: { nome: string; valor: string }[];
  entrada?: string;
  cliente?: string;
  prazo?: string;
}) {
  const fd = new FormData();
  fd.set("clientId", o.cliente ?? "cliente-1");
  fd.set("deliveryDate", o.prazo ?? "2026-09-30");
  fd.set("paymentMethod", "Pix");
  fd.set("paid", o.entrada ?? "");
  fd.set("notes", "");
  // Igual ao order-form.tsx:263-280.
  fd.set(
    "items",
    JSON.stringify(o.itens.map((i) => ({ productId: null, description: i.descricao, size: null, color: null, quantity: i.qtd, unitPrice: i.preco }))),
  );
  fd.set("services", JSON.stringify((o.servicos ?? []).map((s) => ({ name: s.nome, price: s.valor }))));
  const r = await createOrderAction(VAZIO, fd);
  expect(r.error).toBeUndefined();
  return fake.s.orders[fake.s.orders.length - 1].id as string;
}

type TelaDeEdicao = {
  id: string;
  clientId: string;
  deliveryDate: string;
  paymentMethod: string;
  paid: string;
  /** O "pago" que a tela mostrava ao abrir (campo escondido paidOriginal). */
  paidOriginal: string;
  notes: string;
  itens: { productId: string; description: string; size: string; color: string; quantity: string; unitPrice: string }[];
  servicos: { name: string; price: string }[];
};

// O que a tela de edição carrega (pedidos/[id]/editar/page.tsx:41-60 + order-form.tsx:124-187).
function abrirEdicao(id: string): TelaDeEdicao {
  const o = fake.visao(id);
  return {
    id,
    clientId: o.clientId as string,
    deliveryDate: dateToInputValue(o.deliveryDate),
    paymentMethod: (o.paymentMethod ?? "") as string,
    paid: o.paidAmountInCents ? centsToInput(o.paidAmountInCents) : "",
    paidOriginal: o.paidAmountInCents ? centsToInput(o.paidAmountInCents) : "",
    notes: (o.internalNotes ?? "") as string,
    itens: o.items.map((i: any) => ({
      productId: i.productId ?? "",
      description: i.description as string,
      size: (i.size ?? "") as string,
      color: (i.color ?? "") as string,
      quantity: String(i.quantity),
      unitPrice: (i.unitPriceInCents / 100).toString(),
    })),
    servicos: o.services.map((s: any) => ({ name: s.name as string, price: centsToInput(s.priceInCents) })),
  };
}

async function salvarEdicao(t: TelaDeEdicao) {
  const fd = new FormData();
  fd.set("id", t.id);
  fd.set("clientId", t.clientId);
  fd.set("deliveryDate", t.deliveryDate);
  fd.set("paymentMethod", t.paymentMethod);
  fd.set("paid", t.paid);
  fd.set("paidOriginal", t.paidOriginal);
  fd.set("notes", t.notes);
  fd.set(
    "items",
    JSON.stringify(
      t.itens
        .map((item) => ({
          productId: item.productId || null,
          description: item.description.trim(),
          size: item.size.trim() || null,
          color: item.color.trim() || null,
          quantity: Math.max(0, Math.floor(Number(item.quantity) || 0)),
          unitPrice: Number(item.unitPrice) || 0,
        }))
        .filter((item) => item.quantity > 0 && (item.productId || item.description)),
    ),
  );
  fd.set("services", JSON.stringify(t.servicos.map((s) => ({ name: s.name.trim(), price: s.price })).filter((s) => s.name.length > 0)));
  // Salvo com sucesso, a action redireciona para o pedido (actions.ts:438).
  try {
    return await updateOrderAction(VAZIO, fd);
  } catch (erro) {
    if (erro instanceof Error && erro.message.startsWith("redirect:")) return { success: "salvo" } as FormState;
    throw erro;
  }
}

async function receber(id: string, valor = "") {
  const fd = new FormData();
  fd.set("orderId", id);
  fd.set("amount", valor);
  return registerPaymentAction(VAZIO, fd);
}

async function apagarRecebimento(paymentId: string) {
  const fd = new FormData();
  fd.set("paymentId", paymentId);
  return deletePaymentAction(VAZIO, fd);
}

const recebimentos = (id: string) => fake.visao(id).payments as { id: string; amountInCents: number; note: string }[];
const pedido = (id: string) => fake.s.orders.find((o) => o.id === id);

// --- telas renderizadas -----------------------------------------------------

function valorNoCartao(html: string, rotulo: string): string | undefined {
  const m = html.match(new RegExp(`>${rotulo}</p>[\\s\\S]*?<p class="mt-2[^"]*">([^<]+)</p>`));
  return m?.[1];
}

async function telaDoPedido(id: string) {
  const html = renderToStaticMarkup(await OrderDetailPage({ params: Promise.resolve({ id }) }));
  const campo = (rotulo: string) => html.match(new RegExp(`>${rotulo}</p><p[^>]*>([^<]+)</p>`))?.[1];
  return { html, total: campo("Total"), pago: campo("Pago"), saldo: campo("Saldo") };
}

function telaDoFinanceiro() {
  const orders = fake.s.orders
    .filter((o) => o.status !== "CANCELED")
    .map((o) => {
      const v = fake.visao(o.id);
      return {
        id: v.id,
        number: v.number,
        totalAmountInCents: v.totalAmountInCents,
        deliveryDate: v.deliveryDate,
        client: { name: v.client.name, phone: v.client.phone },
        payments: v.payments.map((p: any) => ({ amountInCents: p.amountInCents })),
      };
    });
  const receipts = fake.s.payments.slice(-60).map((p) => {
    const o = fake.s.orders.find((x) => x.id === p.orderId);
    return { id: p.id, amountInCents: p.amountInCents, method: p.method, note: p.note, paidAt: p.paidAt, order: { id: o.id, number: o.number, client: { name: "c" } } };
  });
  const html = renderToStaticMarkup(
    createElement(DbFinanceManager, { orders, receipts, receiptsCount: fake.s.payments.length, canDelete: true }),
  );
  return {
    html,
    aReceber: valorNoCartao(html, "A receber"),
    recebido: valorNoCartao(html, "Recebido"),
    aCobrar: html.match(/>A cobrar<\/h2><\/div><span[^>]*>([^<]+)<\/span>/)?.[1],
  };
}

async function telaDoCliente(clienteId: string) {
  const html = renderToStaticMarkup(await ClienteDetalhePage({ params: Promise.resolve({ id: clienteId }) }));
  const deve = [...html.matchAll(/deve ([^<]+)</g)].map((m) => currencyToCents(m[1]));
  return { html, saldoAReceber: valorNoCartao(html, "Saldo a receber"), somaDosDeve: deve.reduce((a, b) => a + b, 0) };
}

async function planilhaCsv() {
  const url = "http://localhost/relatorios/export";
  const resposta = await exportarCsv({ nextUrl: new URL(url), url } as any);
  const texto = (await resposta.text()).replace(/^﻿/, "");
  const [, ...linhas] = texto.split("\r\n").map((l) => l.split(";").map((c) => c.replace(/^"|"$/g, "")));
  return new Map(linhas.map((l) => [Number(l[0]), { pagamento: l[5], total: currencyToCents(l[6]), pago: currencyToCents(l[7]) }]));
}

function conferirEspelho(id: string) {
  const o = fake.visao(id);
  expect(o.paidAmountInCents).toBe(sumReceipts(o.payments));
  expect(o.paymentStatus).toBe(resolveStatusFromReceipts(o.totalAmountInCents, o.payments));
  // Lista "Falta receber" e painel (order-filters.ts:114) x Financeiro (db-finance-manager.tsx:52).
  expect(pedidoCasaFiltro(o, "receber")).toBe(computeBalance(o.totalAmountInCents, o.payments) > 0);
}

beforeEach(() => {
  fake.reset();
});
afterEach(() => {
  vi.useRealTimers();
});

describe("(b) criar pedido grava total, entrada e espelho iguais ao que a tela de revisão mostra", () => {
  it("pedido com peças, serviço com conta e entrada digitada '100'", async () => {
    const id = await criarPedido({
      itens: [
        { descricao: "Camiseta", qtd: 10, preco: 45.9 },
        { descricao: "Boné", qtd: 3, preco: 29.99 },
      ],
      servicos: [{ nome: "Silk", valor: "3,50 x 10" }],
      entrada: "100",
    });
    const o = pedido(id);
    expect(o.totalAmountInCents).toBe(45900 + 8997 + 3500);
    expect(recebimentos(id).map((p) => p.amountInCents)).toEqual([10000]);
    expect(recebimentos(id)[0].note).toBe("Entrada do pedido");
    expect(o.paymentStatus).toBe("PARTIAL");
    conferirEspelho(id);

    const tela = await telaDoPedido(id);
    expect(tela.total).toBe(centsToCurrency(58397));
    expect(tela.pago).toBe(centsToCurrency(10000));
    expect(tela.saldo).toBe(centsToCurrency(48397));
  });

  it("sem entrada: nenhum recebimento, espelho zero, pendente", async () => {
    const id = await criarPedido({ itens: [{ descricao: "Uniforme", qtd: 2, preco: 150 }] });
    expect(recebimentos(id)).toEqual([]);
    expect(pedido(id).paidAmountInCents).toBe(0);
    expect(pedido(id).paymentStatus).toBe("PENDING");
    conferirEspelho(id);
  });

  it("entrada com sinal de menos ou texto vira zero (nenhum recebimento)", async () => {
    const a = await criarPedido({ itens: [{ descricao: "A", qtd: 1, preco: 10 }], entrada: "-50" });
    const b = await criarPedido({ itens: [{ descricao: "B", qtd: 1, preco: 10 }], entrada: "abc" });
    expect(recebimentos(a)).toEqual([]);
    expect(recebimentos(b)).toEqual([]);
    conferirEspelho(a);
    conferirEspelho(b);
  });

  it("entrada maior que o total grava so o total: o troco nao vira dinheiro recebido", async () => {
    const id = await criarPedido({ itens: [{ descricao: "A", qtd: 1, preco: 150 }], entrada: "200,00" });
    expect(pedido(id).paidAmountInCents).toBe(15000);
    expect(sumReceipts(recebimentos(id))).toBe(15000);
    expect(pedido(id).paymentStatus).toBe("PAID");
    conferirEspelho(id);
  });

  it("pedido de R$ 0,00 fica 'Pendente' com saldo zero (decisao: e o rascunho do portal, que ainda vai ganhar preco)", async () => {
    const id = await criarPedido({ itens: [{ descricao: "Amostra", qtd: 1, preco: 0 }] });
    expect(pedido(id).paymentStatus).toBe("PENDING");
    expect(pedido(id).totalAmountInCents - pedido(id).paidAmountInCents).toBe(0);
  });
});

describe("(b) 'Recebi' no Financeiro", () => {
  it("parciais digitados do jeito brasileiro até quitar; espelho e telas acompanham a cada passo", async () => {
    const id = await criarPedido({ itens: [{ descricao: "Jaleco", qtd: 4, preco: 87.5 }], entrada: "50" });
    // total 35000, entrada 5000, saldo 30000
    for (const [digitado, esperado] of [
      ["R$ 100,00", 10000],
      ["0,01", 1],
      ["1.000", 19999], // acima do saldo: registra só o saldo
    ] as const) {
      const r = await receber(id, digitado);
      expect(r.error).toBeUndefined();
      expect(recebimentos(id).at(-1)?.amountInCents).toBe(esperado);
      conferirEspelho(id);
      const tela = await telaDoPedido(id);
      expect(currencyToCents(tela.pago ?? "")).toBe(sumReceipts(recebimentos(id)));
      expect(currencyToCents(tela.saldo ?? "")).toBe(computeBalance(35000, recebimentos(id)));
    }
    expect(pedido(id).paymentStatus).toBe("PAID");
    expect(sumReceipts(recebimentos(id))).toBe(35000);
    const depois = await receber(id, "10");
    expect(depois.error).toMatch(/já está quitado/);
    expect(recebimentos(id)).toHaveLength(4);
  });

  it("em branco quita o saldo inteiro", async () => {
    const id = await criarPedido({ itens: [{ descricao: "Calça", qtd: 3, preco: 79.9 }], entrada: "0,90" });
    await receber(id, "");
    expect(sumReceipts(recebimentos(id))).toBe(23970);
    expect(pedido(id).paymentStatus).toBe("PAID");
    conferirEspelho(id);
  });

  it("apagar recebimento devolve o saldo e recalcula o espelho", async () => {
    const id = await criarPedido({ itens: [{ descricao: "Avental", qtd: 5, preco: 30 }], entrada: "20" });
    await receber(id, "50");
    await receber(id, "");
    expect(pedido(id).paymentStatus).toBe("PAID");
    const [, meio] = recebimentos(id);
    await apagarRecebimento(meio.id);
    expect(sumReceipts(recebimentos(id))).toBe(15000 - 5000);
    expect(pedido(id).paymentStatus).toBe("PARTIAL");
    conferirEspelho(id);
    // Apagar de novo o mesmo recebimento não mexe em nada.
    await apagarRecebimento(meio.id);
    expect(sumReceipts(recebimentos(id))).toBe(10000);
  });

  it.each(["0", "-50", "abc", "R$", ","])("'Recebi' com %j no valor recusa e nao grava nada", async (valor) => {
    const id = await criarPedido({ itens: [{ descricao: "A", qtd: 1, preco: 300 }], entrada: "50" });
    const r = await receber(id, valor);
    expect(r.error).toContain("maior que zero");
    expect(sumReceipts(recebimentos(id))).toBe(5000);
    expect(pedido(id).paymentStatus).toBe("PARTIAL");
  });

  it("'Recebi' com o campo em branco continua quitando o saldo todo", async () => {
    const id = await criarPedido({ itens: [{ descricao: "A", qtd: 1, preco: 300 }], entrada: "50" });
    const r = await receber(id, "");
    expect(r.success).toContain("R$");
    expect(sumReceipts(recebimentos(id))).toBe(30000);
  });
});

describe("(b) editar pedido", () => {
  it("salvar sem mexer no 'pago' não muda nenhum recebimento", async () => {
    const id = await criarPedido({ itens: [{ descricao: "Camisa", qtd: 10, preco: 50 }], entrada: "100" });
    await receber(id, "150");
    const antes = recebimentos(id).map((p) => [p.id, p.amountInCents]);
    const tela = abrirEdicao(id);
    tela.deliveryDate = "2026-10-10";
    expect((await salvarEdicao(tela)).error).toBeUndefined();
    expect(recebimentos(id).map((p) => [p.id, p.amountInCents])).toEqual(antes);
    conferirEspelho(id);
  });

  it("mudar o 'pago' mexe só na entrada; abaixo do que entrou depois é recusado sem mexer em nada", async () => {
    const id = await criarPedido({ itens: [{ descricao: "Camisa", qtd: 10, preco: 50 }], entrada: "100" });
    await receber(id, "150");
    const tela = abrirEdicao(id);
    tela.paid = "300,00";
    await salvarEdicao(tela);
    expect(recebimentos(id).map((p) => p.amountInCents)).toEqual([15000, 15000]);
    conferirEspelho(id);

    const recusa = abrirEdicao(id);
    recusa.paid = "100,00";
    const r = await salvarEdicao(recusa);
    expect(r.error).toMatch(/depois da entrada/);
    expect(recebimentos(id).map((p) => p.amountInCents)).toEqual([15000, 15000]);
    conferirEspelho(id);
  });

  it("zerar o 'pago' apaga a entrada; digitar 'pago' num pedido sem entrada cria uma", async () => {
    const id = await criarPedido({ itens: [{ descricao: "Camisa", qtd: 2, preco: 50 }], entrada: "30" });
    const t1 = abrirEdicao(id);
    t1.paid = "";
    await salvarEdicao(t1);
    expect(recebimentos(id)).toEqual([]);
    conferirEspelho(id);
    const t2 = abrirEdicao(id);
    t2.paid = "45,5";
    await salvarEdicao(t2);
    expect(recebimentos(id).map((p) => [p.amountInCents, p.note])).toEqual([[4550, "Entrada do pedido"]]);
    conferirEspelho(id);
  });

  it("aumentar a quantidade recalcula total e situação (pago vira parcial)", async () => {
    const id = await criarPedido({ itens: [{ descricao: "Camisa", qtd: 2, preco: 50 }], entrada: "100" });
    expect(pedido(id).paymentStatus).toBe("PAID");
    const t = abrirEdicao(id);
    t.itens[0].quantity = "5";
    await salvarEdicao(t);
    expect(pedido(id).totalAmountInCents).toBe(25000);
    expect(pedido(id).paymentStatus).toBe("PARTIAL");
    conferirEspelho(id);
  });

  it("tela de edicao aberta antes de um 'Recebi' e salva sem mexer no pago: nenhum dinheiro some", async () => {
    const id = await criarPedido({ itens: [{ descricao: "A", qtd: 3, preco: 100 }], entrada: "100" });
    const t = abrirEdicao(id);
    await receber(id, "50");
    t.deliveryDate = "2026-10-05";
    expect((await salvarEdicao(t)).error).toBeUndefined();
    expect(sumReceipts(recebimentos(id))).toBe(15000);
    expect(recebimentos(id)[0].amountInCents).toBe(10000);
    conferirEspelho(id);
  });

  it("tela de edicao velha que MUDA o pago depois de um 'Recebi' e recusada", async () => {
    const id = await criarPedido({ itens: [{ descricao: "A", qtd: 3, preco: 100 }], entrada: "100" });
    const t = abrirEdicao(id);
    await receber(id, "50");
    t.paid = "120,00";
    const r = await salvarEdicao(t);
    expect(r.error).toContain("recebimento");
    expect(sumReceipts(recebimentos(id))).toBe(15000);
  });
});

describe("(b) sequência sorteada de operações: todas as telas contam o mesmo dinheiro", () => {
  it("300 operações (Recebi, apagar, editar, edição recusada) em 3 pedidos", async () => {
    const ids = [
      await criarPedido({
        itens: [{ descricao: "Camiseta", qtd: 10, preco: 45.9 }],
        servicos: [{ nome: "Silk", valor: "3,50 x 10" }],
        entrada: "100",
      }),
      await criarPedido({ itens: [{ descricao: "Boné", qtd: 3, preco: 29.99 }], cliente: "cliente-2" }),
      await criarPedido({
        itens: [{ descricao: "Uniforme", qtd: 1, preco: 1234.56 }],
        servicos: [{ nome: "Bordado", valor: "250,00" }],
        entrada: "0,01",
      }),
    ];
    const digitaveis = ["", "10", "0,01", "25,50", "R$ 7,5", "1.000", "33.3", "99999", "1.234,56"];
    const r = sorteador(2026);

    for (let passo = 0; passo < 300; passo++) {
      const id = ids[inteiro(r, 0, ids.length - 1)];
      const o = pedido(id);
      const somaAntes = sumReceipts(recebimentos(id));
      const sorte = r();

      if (sorte < 0.45) {
        const saldoAntes = computeBalance(o.totalAmountInCents, recebimentos(id));
        const res = await receber(id, digitaveis[inteiro(r, 0, digitaveis.length - 1)]);
        const entrou = sumReceipts(recebimentos(id)) - somaAntes;
        if (saldoAntes <= 0) expect(res.error).toMatch(/quitado/);
        expect(entrou).toBeGreaterThanOrEqual(0);
        expect(entrou).toBeLessThanOrEqual(Math.max(0, saldoAntes));
      } else if (sorte < 0.65) {
        const lista = recebimentos(id);
        if (lista.length) await apagarRecebimento(lista[inteiro(r, 0, lista.length - 1)].id);
      } else if (sorte < 0.9) {
        const t = abrirEdicao(id);
        if (r() < 0.5) t.itens[0].quantity = String(inteiro(r, 1, 20));
        if (r() < 0.4) {
          const depois = sumReceipts(recebimentos(id).slice(1));
          t.paid = centsToInput(depois + inteiro(r, 0, 20000));
        }
        expect((await salvarEdicao(t)).error).toBeUndefined();
      } else {
        const lista = recebimentos(id);
        const depois = sumReceipts(lista.slice(1));
        if (depois > 0) {
          const antes = lista.map((p) => p.amountInCents);
          const t = abrirEdicao(id);
          t.paid = centsToInput(depois - 1);
          expect((await salvarEdicao(t)).error).toMatch(/depois da entrada/);
          expect(recebimentos(id).map((p) => p.amountInCents)).toEqual(antes);
        }
      }

      for (const cada of ids) conferirEspelho(cada);
      if (passo % 25 === 0) {
        const tela = await telaDoPedido(id);
        const v = fake.visao(id);
        expect(currencyToCents(tela.total ?? "")).toBe(v.totalAmountInCents);
        expect(currencyToCents(tela.pago ?? "")).toBe(sumReceipts(v.payments));
        expect(currencyToCents(tela.saldo ?? "")).toBe(computeBalance(v.totalAmountInCents, v.payments));
      }
    }

    // Fim: Financeiro (lista "A cobrar"), Relatório (pendências e resumo) e CSV.
    const visoes = ids.map((id) => fake.visao(id));
    const saldos = visoes.map((v) => computeBalance(v.totalAmountInCents, v.payments));
    const fin = telaDoFinanceiro();
    expect(currencyToCents(fin.recebido ?? "")).toBe(visoes.reduce((s, v) => s + sumReceipts(v.payments), 0));
    if (saldos.some((s) => s > 0)) expect(currencyToCents(fin.aCobrar ?? "")).toBe(saldos.reduce((a, b) => a + b, 0));

    const resumo = resumirVendas(
      visoes.map((v) => ({
        clienteId: v.clientId,
        clienteNome: v.client.name,
        totalInCents: v.totalAmountInCents,
        itens: v.items.map((i: any) => ({ productId: i.productId, descricao: i.description, quantidade: i.quantity, totalInCents: i.totalPriceInCents })),
        servicos: v.services.map((s: any) => ({ nome: s.name, precoInCents: s.priceInCents })),
        recebimentos: v.payments,
      })),
      indexarCatalogo([]),
    );
    expect(resumo.aReceberDestesPedidosInCents).toBe(saldos.reduce((a, b) => a + b, 0));
    expect(resumo.faturamentoInCents).toBe(visoes.reduce((s, v) => s + v.totalAmountInCents, 0));

    const csv = await planilhaCsv();
    for (const v of visoes) {
      expect(csv.get(v.number)?.pago).toBe(sumReceipts(v.payments));
      expect(csv.get(v.number)?.total).toBe(v.totalAmountInCents);
    }
  });
});

describe("(b) coerência entre telas em casos de canto", () => {
  it("Financeiro: cartões e lista batem quando nenhum pedido tem pago acima do total", async () => {
    await criarPedido({ itens: [{ descricao: "A", qtd: 1, preco: 150 }], entrada: "50" });
    await criarPedido({ itens: [{ descricao: "B", qtd: 1, preco: 100 }], cliente: "cliente-2" });
    const fin = telaDoFinanceiro();
    expect(fin.aReceber).toBe(centsToCurrency(20000));
    expect(fin.aCobrar).toBe(centsToCurrency(20000));
    expect(fin.recebido).toBe(centsToCurrency(5000));
  });

  it("ficha do cliente: 'Saldo a receber' = soma dos 'deve' quando nenhum pedido tem pago acima do total", async () => {
    await criarPedido({ itens: [{ descricao: "A", qtd: 1, preco: 150 }], entrada: "50" });
    await criarPedido({ itens: [{ descricao: "B", qtd: 1, preco: 100 }] });
    const ficha = await telaDoCliente("cliente-1");
    expect(ficha.saldoAReceber).toBe(centsToCurrency(20000));
    expect(ficha.somaDosDeve).toBe(20000);
  });

  it("pedido pago acima do total nao abate a divida de outro: 'A receber' = 'A cobrar' e ficha = soma dos 'deve'", async () => {
    const p1 = await criarPedido({ itens: [{ descricao: "Camiseta", qtd: 5, preco: 100 }], entrada: "500" });
    await criarPedido({ itens: [{ descricao: "Bone", qtd: 1, preco: 100 }] });
    // Tira uma peça do pedido já quitado: total R$ 400, pago R$ 500.
    const t = abrirEdicao(p1);
    t.itens[0].quantity = "4";
    expect((await salvarEdicao(t)).error).toBeUndefined();

    const fin = telaDoFinanceiro();
    expect(fin.aReceber).toBe(centsToCurrency(10000));
    expect(fin.aCobrar).toBe(centsToCurrency(10000));
    const ficha = await telaDoCliente("cliente-1");
    expect(ficha.saldoAReceber).toBe(centsToCurrency(10000));
    expect(ficha.somaDosDeve).toBe(10000);
  });

  it("detalhe do pedido nao mostra 'Atrasado' no dia do prazo, e mostra no dia seguinte", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-09-14T13:00:00-03:00"));
    const id = await criarPedido({ itens: [{ descricao: "A", qtd: 1, preco: 10 }], prazo: "2026-09-14" });
    expect((await telaDoPedido(id)).html).not.toContain("Atrasado");
    vi.setSystemTime(new Date("2026-09-15T08:00:00-03:00"));
    expect((await telaDoPedido(id)).html).toContain("Atrasado");
  });

  it("prazo no dia: filtro 'Atrasados' e isOrderLate só marcam depois que o dia termina em Brasília", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-09-14T13:00:00-03:00"));
    const id = await criarPedido({ itens: [{ descricao: "A", qtd: 1, preco: 10 }], prazo: "2026-09-14" });
    const o = pedido(id);
    expect(isOrderLate(o.deliveryDate, o.status, new Date())).toBe(false);
    expect(pedidoCasaFiltro(o, "atrasados", new Date())).toBe(false);
    expect(isOrderLate(o.deliveryDate, o.status, new Date("2026-09-15T00:00:01-03:00"))).toBe(true);
  });
});
