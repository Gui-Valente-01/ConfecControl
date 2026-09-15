// Verificação do estoque de LOJA (prateleira) antes de apresentar a clientes.
//
// Roda o sincronizarPrateleira DE VERDADE (src/lib/prateleira-db.ts) sobre um
// banco em memória que imita o que o Postgres faz com as consultas dele:
// GREATEST(0, x) na saída, increment na entrada, filtro da lixeira nas leituras
// de peça (src/lib/prisma.ts) e SET NULL no orderId do movimento quando o pedido
// é excluído. As ações (criar, mover etapa, editar, excluir, entrada/saída/acerto
// manual) repetem o que as server actions fazem dentro da transação.

import type { OrderStatus } from "@prisma/client";
import type { ReactNode } from "react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { DbStockManager } from "@/components/db-stock-manager";
import { centsToCurrency } from "@/lib/format";
import { etapasParaCriar, MODELO_PADRAO, MODELOS_DE_CONTA, type ModeloDeConta } from "@/lib/modelos-de-conta";
import type { AjustePrateleira } from "@/lib/prateleira";
import { sincronizarPrateleira } from "@/lib/prateleira-db";
import type { TransactionClient } from "@/lib/prisma";
import { pickNextStage } from "@/lib/production";
import { stageNameToOrderStatus } from "@/lib/status";

// A tela de estoque importa as server actions (que abrem o Prisma). Aqui só
// interessa a conta que ela mostra.
vi.mock("@/app/estoque/actions", () => ({
  registerStockMovementAction: async () => ({}),
  setProductMinimumAction: async () => ({}),
}));
vi.mock("@/components/toast-form", async () => {
  const React = await import("react");
  return { ToastForm: ({ children }: { children?: ReactNode }) => React.createElement("form", null, children) };
});
vi.mock("next/link", async () => {
  const React = await import("react");
  return {
    default: ({ href, children }: { href: string; children?: ReactNode }) => React.createElement("a", { href }, children),
  };
});

const EMPRESA = "empresa-a";
const OUTRA = "empresa-b";
const HOJE = new Date("2026-09-14T10:00:00-03:00");

type Tipo = "PRODUCT" | "SERVICE";
type TipoMov = "IN" | "OUT" | "ADJUSTMENT";
type Produto = {
  id: string;
  companyId: string;
  kind: Tipo;
  currentQuantity: number;
  minimumQuantity: number;
  costInCents: number;
  deletedAt: Date | null;
};
type Item = { productId: string | null; quantity: number };
type Pedido = { id: string; number: number; companyId: string; status: OrderStatus; stageId: string | null; items: Item[] };
type Movimento = { productId: string | null; orderId: string | null; type: TipoMov; quantity: number; note: string | null };
type Etapa = { id: string; name: string; position: number; active: boolean };

// ---------------------------------------------------------------------------
// Banco em memória + tx falso com as mesmas operações que prateleira-db.ts usa
// ---------------------------------------------------------------------------

class Banco {
  produtos = new Map<string, Produto>();
  pedidos = new Map<string, Pedido>();
  movimentos: Movimento[] = [];
  /** Ordem das chamadas: a trava FOR UPDATE tem de vir antes da leitura. */
  chamadas: string[] = [];
  /** Etapas da empresa, lidas na hora (a Loja pode desativar e reordenar). */
  etapasDe: () => Etapa[] = () => [];

  tx(): TransactionClient {
    return txFalso(this);
  }
}

/** tx falso: só as operações que sincronizarPrateleira usa, com a semântica do Postgres. */
function txFalso(db: Banco): TransactionClient {
  {
    // bloco só para manter a indentação do objeto
    const fake = {
      async $queryRaw(partes: TemplateStringsArray, ...valores: unknown[]) {
        const sql = partes.join("?").replace(/\s+/g, " ");
        if (!sql.includes('SELECT "id" FROM "pedidos" WHERE "id" = ? FOR UPDATE')) {
          throw new Error(`consulta inesperada: ${sql}`);
        }
        db.chamadas.push(`trava:${String(valores[0])}`);
        return [];
      },
      async $executeRaw(partes: TemplateStringsArray, ...valores: unknown[]) {
        const sql = partes.join("?").replace(/\s+/g, " ");
        if (!sql.includes('SET "currentQuantity" = GREATEST(0, "currentQuantity" - ?) WHERE "id" = ? AND "companyId" = ?')) {
          throw new Error(`SQL inesperado: ${sql}`);
        }
        const [qtd, id, empresa] = valores as [number, string, string];
        const p = db.produtos.get(id);
        if (!p || p.companyId !== empresa) return 0;
        p.currentQuantity = Math.max(0, p.currentQuantity - qtd);
        return 1;
      },
      order: {
        async findUnique(args: { where: { id: string } }) {
          db.chamadas.push(`le:${args.where.id}`);
          const o = db.pedidos.get(args.where.id);
          if (!o) return null;
          return {
            number: o.number,
            status: o.status,
            companyId: o.companyId,
            currentStage: (() => {
              const e = db.etapasDe().find((x) => x.id === o.stageId);
              return e ? { position: e.position } : null;
            })(),
            items: o.items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
            // Decimal(12,2) no banco: chega como algo que Number() converte.
            stockMovements: db.movimentos
              .filter((m) => m.orderId === o.id && m.productId !== null)
              .map((m) => ({ productId: m.productId, type: m.type, quantity: m.quantity.toFixed(2), note: m.note })),
          };
        },
      },
      productionStage: {
        async findMany(args: { where: { companyId?: string; active?: boolean } }) {
          return db
            .etapasDe()
            .filter((e) => args.where.active === undefined || e.active === args.where.active)
            .map((e) => ({ name: e.name, position: e.position }));
        },
      },
      product: {
        async findMany(args: { where: { id?: { in: string[] }; companyId?: string; kind?: string } }) {
          const w = args.where;
          return [...db.produtos.values()]
            .filter((p) => p.deletedAt === null) // extensão da lixeira (src/lib/prisma.ts)
            .filter((p) => !w.id || w.id.in.includes(p.id))
            .filter((p) => w.companyId === undefined || p.companyId === w.companyId)
            .filter((p) => w.kind === undefined || p.kind === w.kind)
            .map((p) => ({ id: p.id }));
        },
        async updateMany(args: { where: { id: string; companyId?: string }; data: { currentQuantity: { increment: number } } }) {
          const p = db.produtos.get(args.where.id);
          if (!p || (args.where.companyId !== undefined && p.companyId !== args.where.companyId)) return { count: 0 };
          p.currentQuantity += args.data.currentQuantity.increment;
          return { count: 1 };
        },
      },
      stockMovement: {
        async create(args: { data: { productId: string; orderId: string; type: TipoMov; quantity: number; note: string } }) {
          const d = args.data;
          db.movimentos.push({ productId: d.productId, orderId: d.orderId, type: d.type, quantity: d.quantity, note: d.note });
          return {};
        },
      },
    };
    return fake as unknown as TransactionClient;
  }
}

// ---------------------------------------------------------------------------
// A loja: o que cada server action faz dentro da transação
// ---------------------------------------------------------------------------

class Loja {
  db = new Banco();
  etapas: Etapa[];
  private ultimoNumero = 1000;

  constructor(nomesEtapas: string[]) {
    this.etapas = nomesEtapas.map((name, i) => ({ id: `etapa-${i + 1}`, name, position: i + 1, active: true }));
    this.db.etapasDe = () => this.etapas;
  }

  peca(id: string, kind: Tipo, quantidade: number, opcoes: { companyId?: string; custo?: number; minimo?: number } = {}) {
    this.db.produtos.set(id, {
      id,
      companyId: opcoes.companyId ?? EMPRESA,
      kind,
      currentQuantity: quantidade,
      minimumQuantity: opcoes.minimo ?? 0,
      costInCents: opcoes.custo ?? 0,
      deletedAt: null,
    });
  }

  qtd(id: string): number {
    return this.db.produtos.get(id)!.currentQuantity;
  }

  fotografia(): Record<string, number> {
    return Object.fromEntries([...this.db.produtos.values()].map((p) => [p.id, p.currentQuantity]));
  }

  pedido(id: string): Pedido {
    return this.db.pedidos.get(id)!;
  }

  /** createOrderAction: status da 1ª etapa ativa + sincronizar (pedidos/actions.ts:188-258). */
  async criar(itens: Item[]): Promise<string> {
    const primeira = this.etapas.filter((e) => e.active).sort((a, b) => a.position - b.position)[0];
    const number = ++this.ultimoNumero;
    const id = `pedido-${number}`;
    this.db.pedidos.set(id, {
      id,
      number,
      companyId: EMPRESA,
      status: primeira ? stageNameToOrderStatus(primeira.name) : "RECEIVED",
      stageId: primeira?.id ?? null,
      items: itens.map((i) => ({ ...i })),
    });
    await sincronizarPrateleira(this.db.tx(), id, "etapa");
    return id;
  }

  /** moveOrderStageAction / bancada: próxima etapa ativa + sincronizar (producao/actions.ts:52-81). */
  async avancar(id: string): Promise<AjustePrateleira[] | null> {
    const o = this.pedido(id);
    const atual = this.etapas.find((e) => e.id === o.stageId);
    if (!atual) return null;
    const proxima = pickNextStage(this.etapas, atual.position);
    if (!proxima) return null;
    o.stageId = proxima.id;
    o.status = stageNameToOrderStatus(proxima.name);
    return sincronizarPrateleira(this.db.tx(), id, "etapa");
  }

  async avancarAte(id: string, nomeEtapa: string) {
    for (let i = 0; i < 50; i++) {
      const atual = this.etapas.find((e) => e.id === this.pedido(id).stageId);
      if (atual?.name === nomeEtapa) return;
      if ((await this.avancar(id)) === null) break;
    }
    throw new Error(`não chegou em ${nomeEtapa}`);
  }

  /** updateOrderAction: troca os itens + sincronizar "edicao" (pedidos/actions.ts:355-420). */
  async editar(id: string, itens: Item[]) {
    this.pedido(id).items = itens.map((i) => ({ ...i }));
    return sincronizarPrateleira(this.db.tx(), id, "edicao");
  }

  /** deleteOrderAction: sincronizar com remover + apagar; FK do movimento é SET NULL. */
  async excluir(id: string) {
    await sincronizarPrateleira(this.db.tx(), id, "exclusao", { remover: true });
    this.db.pedidos.delete(id);
    for (const m of this.db.movimentos) if (m.orderId === id) m.orderId = null;
  }

  /** registerStockMovementAction (estoque/actions.ts:160-171): sem orderId. */
  manual(productId: string, type: TipoMov, quantidade: number) {
    const p = this.db.produtos.get(productId)!;
    if (type === "IN") p.currentQuantity += quantidade;
    else if (type === "OUT") p.currentQuantity = Math.max(0, p.currentQuantity - quantidade);
    else p.currentQuantity = quantidade;
    this.db.movimentos.push({ productId, orderId: null, type, quantity: quantidade, note: null });
  }

  ressincronizar(id: string) {
    return sincronizarPrateleira(this.db.tx(), id, "edicao");
  }

  /** Pedidos que ainda têm etapa pela frente. */
  andando(): string[] {
    return [...this.db.pedidos.values()]
      .filter((o) => {
        const atual = this.etapas.find((e) => e.id === o.stageId);
        return atual !== undefined && pickNextStage(this.etapas, atual.position) !== null;
      })
      .map((o) => o.id);
  }
}

// ---------------------------------------------------------------------------
// Oráculo independente (não usa as funções de src/lib/prateleira.ts)
// ---------------------------------------------------------------------------

/** Entradas menos saídas de cada pedido, sem cortar negativo. */
function saldosBrutos(db: Banco): Map<string, Map<string, number>> {
  const porPedido = new Map<string, Map<string, number>>();
  for (const m of db.movimentos) {
    if (!m.orderId || !m.productId || m.type === "ADJUSTMENT") continue;
    const mapa = porPedido.get(m.orderId) ?? new Map<string, number>();
    mapa.set(m.productId, (mapa.get(m.productId) ?? 0) + (m.type === "IN" ? m.quantity : -m.quantity));
    porPedido.set(m.orderId, mapa);
  }
  for (const mapa of porPedido.values()) for (const [k, v] of mapa) if (v === 0) mapa.delete(k);
  return porPedido;
}

/**
 * O pedido está na prateleira? Do Pronto até a entrega: status READY, ou uma
 * etapa ativa posicionada DEPOIS da primeira etapa "Pronto" (Embalagem etc.),
 * sem ter sido entregue.
 */
function estaNaPrateleira(db: Banco, o: Pedido): boolean {
  if (o.status === "DELIVERED" || o.status === "CANCELED") return false;
  if (o.status === "READY") return true;
  const ativas = db.etapasDe().filter((e) => e.active);
  const prontos = ativas.filter((e) => stageNameToOrderStatus(e.name) === "READY").map((e) => e.position);
  const atual = db.etapasDe().find((e) => e.id === o.stageId);
  return prontos.length > 0 && atual !== undefined && atual.position > Math.min(...prontos);
}

/** O que o pedido deveria ter na prateleira: só se está na prateleira, só peça própria da empresa. */
function pecasEsperadas(db: Banco, o: Pedido): Map<string, number> {
  const mapa = new Map<string, number>();
  if (!estaNaPrateleira(db, o)) return mapa;
  for (const it of o.items) {
    const p = it.productId ? db.produtos.get(it.productId) : undefined;
    if (!p || p.companyId !== o.companyId || p.kind !== "PRODUCT" || p.deletedAt || it.quantity <= 0) continue;
    mapa.set(p.id, (mapa.get(p.id) ?? 0) + it.quantity);
  }
  return mapa;
}

const ordenado = (m: Map<string, number> | undefined) => [...(m ?? new Map<string, number>())].sort(([a], [b]) => a.localeCompare(b));

function mulberry32(semente: number) {
  let s = semente;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const CATALOGO = ["polo", "bone", "avental", "bordado-cliente", "peca-outra-empresa", null] as const;

function itensAleatorios(rnd: () => number): Item[] {
  const n = 1 + Math.floor(rnd() * 3);
  return Array.from({ length: n }, () => ({
    productId: CATALOGO[Math.floor(rnd() * CATALOGO.length)],
    quantity: rnd() < 0.05 ? 0 : 1 + Math.floor(rnd() * 40),
  }));
}

function montarLoja(nomes: string[]): Loja {
  const loja = new Loja(nomes);
  loja.peca("polo", "PRODUCT", 20, { custo: 2500, minimo: 10 });
  loja.peca("bone", "PRODUCT", 0, { custo: 1200 });
  loja.peca("avental", "PRODUCT", 5, { custo: 1400 });
  loja.peca("bordado-cliente", "SERVICE", 3); // valor inicial ≠ 0 para enxergar qualquer mexida
  loja.peca("peca-outra-empresa", "PRODUCT", 7, { companyId: OUTRA });
  return loja;
}

const escolher = <T>(rnd: () => number, lista: T[]): T => lista[Math.floor(rnd() * lista.length)];

// ---------------------------------------------------------------------------
// (a) Vidas inteiras de pedidos
// ---------------------------------------------------------------------------

const MODELOS: [string, ModeloDeConta][] = [
  [MODELO_PADRAO.nome, MODELO_PADRAO],
  ...Object.values(MODELOS_DE_CONTA).map((m): [string, ModeloDeConta] => [m.nome, m]),
];

/**
 * Sem mexida manual: o estoque de cada peça tem de ser exatamente o inicial
 * mais as peças dos pedidos que estão em Pronto agora.
 */
async function simularExato(nomes: string[], semente: number, passos: number, mexerEtapas: boolean) {
  const loja = montarLoja(nomes);
  const inicial = loja.fotografia();
  const rnd = mulberry32(semente);
  const nomeOriginal = new Map(loja.etapas.map((e) => [e.id, e.name]));

  for (let passo = 0; passo < passos; passo++) {
    const ctx = `semente ${semente}, passo ${passo}`;
    const ids = [...loja.db.pedidos.keys()];
    const andando = loja.andando();
    const r = rnd();
    let alvo: string | null = null;

    if (andando.length === 0 || (r < 0.25 && andando.length < 5)) {
      alvo = await loja.criar(itensAleatorios(rnd));
    } else if (r < 0.65) {
      alvo = escolher(rnd, andando);
      await loja.avancar(alvo);
    } else if (r < 0.75) {
      alvo = escolher(rnd, ids);
      await loja.editar(alvo, itensAleatorios(rnd));
    } else if (r < 0.85) {
      const antes = loja.fotografia();
      await loja.excluir(escolher(rnd, ids));
      for (const [id, q] of Object.entries(loja.fotografia())) expect(q, `${ctx}: excluir aumentou ${id}`).toBeLessThanOrEqual(antes[id]);
    } else if (mexerEtapas && r < 0.95) {
      // Configurações: desativar/ativar, trocar a ordem ou renomear etapa.
      const e = escolher(rnd, loja.etapas);
      const tipo = rnd();
      if (tipo < 0.4) {
        if (!e.active || loja.etapas.filter((x) => x.active).length > 1) e.active = !e.active;
      } else if (tipo < 0.8) {
        const outra = escolher(rnd, loja.etapas);
        [e.position, outra.position] = [outra.position, e.position];
      } else {
        e.name = e.name === nomeOriginal.get(e.id) ? "Aguardando retirada" : nomeOriginal.get(e.id)!;
      }
      // Mexer nas etapas não mexe no estoque na hora: a prateleira de cada
      // pedido se acerta na próxima vez que ele for tocado. Aqui, todos são.
      for (const id of ids) await loja.ressincronizar(id);
    } else {
      alvo = escolher(rnd, ids);
    }

    // Sincronizar de novo o mesmo pedido não pode lançar nada.
    if (alvo) {
      const antes = loja.fotografia();
      expect(await loja.ressincronizar(alvo), `${ctx}: 2ª sincronização lançou movimento`).toEqual([]);
      expect(loja.fotografia(), ctx).toEqual(antes);
    }

    // Conferência completa.
    const saldos = saldosBrutos(loja.db);
    const esperadoPorPeca = new Map<string, number>();
    for (const o of loja.db.pedidos.values()) {
      const esperado = pecasEsperadas(loja.db, o);
      expect(ordenado(saldos.get(o.id)), `${ctx}: saldo do pedido #${o.number} (${o.status})`).toEqual(ordenado(esperado));
      for (const [p, q] of esperado) esperadoPorPeca.set(p, (esperadoPorPeca.get(p) ?? 0) + q);
    }
    for (const p of loja.db.produtos.values()) {
      expect(p.currentQuantity, `${ctx}: ${p.id} negativo`).toBeGreaterThanOrEqual(0);
      expect(p.currentQuantity, `${ctx}: estoque de ${p.id}`).toBe(inicial[p.id] + (esperadoPorPeca.get(p.id) ?? 0));
    }
    for (const mapa of saldos.values()) for (const [, q] of mapa) expect(q, `${ctx}: saldo negativo`).toBeGreaterThan(0);
    // Pedido excluído: o que ele pôs saiu junto (saldo dos órfãos zerado).
    const orfaos = loja.db.movimentos.filter((m) => m.orderId === null && m.productId);
    const somaOrfaos = new Map<string, number>();
    for (const m of orfaos) somaOrfaos.set(m.productId!, (somaOrfaos.get(m.productId!) ?? 0) + (m.type === "IN" ? m.quantity : -m.quantity));
    for (const [p, q] of somaOrfaos) expect(q, `${ctx}: pedido excluído deixou ${p} na prateleira`).toBe(0);
  }

  // Serviço, item avulso e peça de outra empresa nunca geraram movimento.
  expect(loja.db.movimentos.every((m) => m.productId === "polo" || m.productId === "bone" || m.productId === "avental")).toBe(true);
  // Toda sincronização travou o pedido antes de ler.
  const chamadas = loja.db.chamadas;
  chamadas.forEach((c, i) => {
    if (c.startsWith("le:")) expect(chamadas[i - 1]).toBe(`trava:${c.slice(3)}`);
  });
  return loja;
}

describe("vidas inteiras de pedidos, sem mexida manual (conta exata)", () => {
  it.each(MODELOS)("modelo %s: 3 sementes x 250 passos", async (_nome, modelo) => {
    for (const semente of [1, 2, 3]) {
      const loja = await simularExato(modelo.etapas, semente, 250, false);
      // A simulação andou de verdade: houve pedido pronto e entregue.
      const statuses = loja.db.movimentos.map((m) => m.note ?? "");
      expect(statuses.some((n) => n.includes("ficou pronto"))).toBe(true);
      expect(statuses.some((n) => n.includes("entregue"))).toBe(true);
    }
  }, 120_000);

  it("etapas mexidas no meio (desativar, reordenar, renomear Pronto): 6 sementes x 400 passos", async () => {
    for (const semente of [11, 12, 13, 14, 15, 16]) await simularExato(MODELO_PADRAO.etapas, semente, 400, true);
  }, 120_000);

  it("conta só com Pronto e Entregue ativas: o pedido já nasce na prateleira", async () => {
    const loja = montarLoja(MODELO_PADRAO.etapas);
    for (const e of loja.etapas) if (e.name !== "Pronto" && e.name !== "Entregue") e.active = false;
    const id = await loja.criar([{ productId: "polo", quantity: 12 }]);
    expect(loja.pedido(id).status).toBe("READY");
    expect(loja.qtd("polo")).toBe(32);
    await loja.avancar(id);
    expect(loja.qtd("polo")).toBe(20);
  });

  it("Pronto desativado: o pedido pula direto para Entregue sem mexer no estoque", async () => {
    const loja = montarLoja(MODELO_PADRAO.etapas);
    loja.etapas.find((e) => e.name === "Pronto")!.active = false;
    const id = await loja.criar([{ productId: "polo", quantity: 12 }]);
    await loja.avancarAte(id, "Entregue");
    expect(loja.qtd("polo")).toBe(20);
    expect(loja.db.movimentos).toHaveLength(0);
  });
});

describe("vidas inteiras com entrada/saída/acerto manual, troca de tipo e lixeira", () => {
  it("8 sementes x 400 passos: nunca negativo, idempotente, entregue zerado, excluir não soma", async () => {
    for (const semente of [101, 102, 103, 104, 105, 106, 107, 108]) {
      const loja = montarLoja(MODELO_PADRAO.etapas);
      const rnd = mulberry32(semente);
      for (let passo = 0; passo < 400; passo++) {
        const ctx = `semente ${semente}, passo ${passo}`;
        const ids = [...loja.db.pedidos.keys()];
        const andando = loja.andando();
        const r = rnd();
        let alvo: string | null = null;
        if (andando.length === 0 || (r < 0.2 && andando.length < 5)) alvo = await loja.criar(itensAleatorios(rnd));
        else if (r < 0.45) {
          alvo = escolher(rnd, andando);
          await loja.avancar(alvo);
        } else if (r < 0.55) {
          alvo = escolher(rnd, ids);
          await loja.editar(alvo, itensAleatorios(rnd));
        } else if (r < 0.62) {
          const antes = loja.fotografia();
          await loja.excluir(escolher(rnd, ids));
          for (const [id, q] of Object.entries(loja.fotografia())) expect(q, `${ctx}: excluir aumentou ${id}`).toBeLessThanOrEqual(antes[id]);
        } else if (r < 0.85) {
          const tipo = escolher<TipoMov>(rnd, ["IN", "OUT", "ADJUSTMENT"]);
          loja.manual(escolher(rnd, ["polo", "bone", "avental"]), tipo, Math.floor(rnd() * 30));
        } else if (r < 0.92) {
          const avental = loja.db.produtos.get("avental")!;
          avental.kind = avental.kind === "PRODUCT" ? "SERVICE" : "PRODUCT"; // produtos/actions.ts:70
        } else {
          const bone = loja.db.produtos.get("bone")!;
          bone.deletedAt = bone.deletedAt ? null : HOJE; // lixeira e restaurar
        }

        if (alvo) {
          // Logo depois de sincronizar, o pedido tem na prateleira exatamente o que deveria.
          const o = loja.pedido(alvo);
          expect(ordenado(saldosBrutos(loja.db).get(alvo)), `${ctx}: saldo do #${o.number}`).toEqual(ordenado(pecasEsperadas(loja.db, o)));
          const antes = loja.fotografia();
          expect(await loja.ressincronizar(alvo), `${ctx}: 2ª sincronização`).toEqual([]);
          expect(loja.fotografia()).toEqual(antes);
        }

        const saldos = saldosBrutos(loja.db);
        for (const p of loja.db.produtos.values()) expect(p.currentQuantity, `${ctx}: ${p.id} negativo`).toBeGreaterThanOrEqual(0);
        for (const o of loja.db.pedidos.values()) {
          const s = saldos.get(o.id);
          for (const [, q] of s ?? []) expect(q, `${ctx}: saldo negativo no #${o.number}`).toBeGreaterThan(0);
          if (!estaNaPrateleira(loja.db, o)) expect(ordenado(s), `${ctx}: #${o.number} (${o.status}) com peça na prateleira`).toEqual([]);
        }
        expect(loja.qtd("bordado-cliente"), ctx).toBe(3);
        expect(loja.qtd("peca-outra-empresa"), ctx).toBe(7);
      }
      const notas = loja.db.movimentos.map((m) => m.note ?? "");
      expect(notas.some((n) => n.includes("ficou pronto")) && notas.some((n) => n.includes("entregue"))).toBe(true);
    }
  }, 120_000);
});

// ---------------------------------------------------------------------------
// Cada modelo de conta, etapa por etapa
// ---------------------------------------------------------------------------

describe.each(MODELOS)("modelo %s", (_nome, modelo) => {
  it("tem uma etapa Pronto, logo seguida da única etapa de entrega, que é a última", () => {
    const status = etapasParaCriar(modelo, EMPRESA).map((e) => stageNameToOrderStatus(e.name));
    const pronto = status.indexOf("READY");
    expect(status.filter((s) => s === "READY")).toHaveLength(1);
    expect(status.filter((s) => s === "DELIVERED")).toHaveLength(1);
    expect(status[pronto + 1]).toBe("DELIVERED");
    expect(status.at(-1)).toBe("DELIVERED");
  });

  it("pedido anda da primeira à última etapa: entra em Pronto, sai na entrega", async () => {
    const loja = montarLoja(etapasParaCriar(modelo, EMPRESA).map((e) => e.name));
    const id = await loja.criar([
      { productId: "polo", quantity: 10 },
      { productId: "polo", quantity: 5 },
      { productId: "bordado-cliente", quantity: 7 },
      { productId: null, quantity: 3 },
      { productId: "peca-outra-empresa", quantity: 4 },
    ]);
    expect(loja.qtd("polo")).toBe(20);
    while ((await loja.avancar(id)) !== null) {
      const status = loja.pedido(id).status;
      expect(loja.qtd("polo"), status).toBe(status === "READY" ? 35 : 20);
      expect(loja.qtd("bordado-cliente")).toBe(3);
      expect(loja.qtd("peca-outra-empresa")).toBe(7);
    }
    expect(loja.pedido(id).status).toBe("DELIVERED");
    expect(loja.db.movimentos.map((m) => [m.type, m.quantity, m.note])).toEqual([
      ["IN", 15, "Pedido #1001 ficou pronto — entrou na prateleira"],
      ["OUT", 15, "Pedido #1001 entregue — saiu da prateleira"],
    ]);
  });
});

// ---------------------------------------------------------------------------
// Casos pontuais
// ---------------------------------------------------------------------------

describe("casos pontuais", () => {
  it("pronto editado: a prateleira acompanha pela diferença, e entregar tira o que ficou", async () => {
    const loja = montarLoja(MODELO_PADRAO.etapas);
    const id = await loja.criar([{ productId: "polo", quantity: 60 }]);
    await loja.avancarAte(id, "Pronto");
    expect(loja.qtd("polo")).toBe(80);
    await loja.editar(id, [{ productId: "polo", quantity: 50 }, { productId: "bone", quantity: 8 }]);
    expect([loja.qtd("polo"), loja.qtd("bone")]).toEqual([70, 8]);
    await loja.avancar(id);
    expect([loja.qtd("polo"), loja.qtd("bone")]).toEqual([20, 0]);
  });

  it("entrada, saída e acerto manual não entram na conta do pedido", async () => {
    const loja = montarLoja(MODELO_PADRAO.etapas);
    const id = await loja.criar([{ productId: "polo", quantity: 10 }]);
    await loja.avancarAte(id, "Pronto"); // 30
    loja.manual("polo", "IN", 5); // 35
    loja.manual("polo", "OUT", 2); // 33
    expect(await loja.ressincronizar(id)).toEqual([]);
    loja.manual("polo", "ADJUSTMENT", 31); // contou 31
    await loja.avancar(id); // entregue: sai 10
    expect(loja.qtd("polo")).toBe(21);
  });

  it("acerto menor no meio do caminho: a entrega para no zero", async () => {
    const loja = montarLoja(MODELO_PADRAO.etapas);
    const id = await loja.criar([{ productId: "bone", quantity: 10 }]);
    await loja.avancarAte(id, "Pronto");
    loja.manual("bone", "ADJUSTMENT", 4);
    await loja.avancar(id);
    expect(loja.qtd("bone")).toBe(0);
  });

  it("peça vira serviço com o pedido pronto: na entrega sai o que tinha entrado", async () => {
    const loja = montarLoja(MODELO_PADRAO.etapas);
    const id = await loja.criar([{ productId: "avental", quantity: 6 }]);
    await loja.avancarAte(id, "Pronto");
    expect(loja.qtd("avental")).toBe(11);
    loja.db.produtos.get("avental")!.kind = "SERVICE";
    await loja.avancar(id);
    expect(loja.qtd("avental")).toBe(5);
  });

  it("excluir pedido pronto tira as peças dele da prateleira e nunca devolve nada", async () => {
    const loja = montarLoja(MODELO_PADRAO.etapas);
    const a = await loja.criar([{ productId: "polo", quantity: 10 }]);
    const b = await loja.criar([{ productId: "polo", quantity: 7 }]);
    await loja.avancarAte(a, "Pronto");
    expect(loja.qtd("polo")).toBe(30);
    await loja.excluir(b); // não estava pronto: nada
    expect(loja.qtd("polo")).toBe(30);
    await loja.excluir(a);
    expect(loja.qtd("polo")).toBe(20);
    expect(loja.db.movimentos.at(-1)).toMatchObject({ type: "OUT", quantity: 10, orderId: null, note: "Pedido #1001 excluído — saiu da prateleira" });
  });

  it("aceitar solicitação do portal cria item sem peça do catálogo: sem sincronizar, nada a mexer", async () => {
    // solicitacoes/actions.ts:53-75 cria o pedido sem chamar sincronizarPrateleira.
    // Mesmo com a 1ª etapa ativa sendo Pronto, o item não tem productId.
    const loja = montarLoja(MODELO_PADRAO.etapas);
    for (const e of loja.etapas) if (e.name !== "Pronto" && e.name !== "Entregue") e.active = false;
    const id = await loja.criar([{ productId: null, quantity: 30 }]);
    expect(loja.db.movimentos).toHaveLength(0);
    await loja.avancar(id);
    expect(loja.db.movimentos).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Defeitos encontrados (reprodução completa no relatório)
// ---------------------------------------------------------------------------

describe("defeitos encontrados na verificacao (agora corrigidos)", () => {
  const ETAPAS = ["Recebido", "Corte", "Costura", "Pronto", "Entregue"];

  /** Pedido criado pela versão anterior: a criação já tinha baixado as peças. */
  async function pedidoDaVersaoAntiga(loja: Loja) {
    const id = await loja.criar([{ productId: "polo", quantity: 10 }]);
    const numero = loja.pedido(id).number;
    loja.db.movimentos.push({ productId: "polo", orderId: id, type: "OUT", quantity: 10, note: `Baixa automática do pedido #${numero}` });
    return id;
  }

  it("pedido da versao anterior nao ganha entrada nova a cada sincronizacao enquanto esta Pronto", async () => {
    const loja = new Loja(ETAPAS);
    loja.peca("polo", "PRODUCT", 0);
    const id = await pedidoDaVersaoAntiga(loja);
    await loja.avancarAte(id, "Pronto");
    expect(loja.qtd("polo")).toBe(10);
    expect(await loja.ressincronizar(id)).toEqual([]);
    expect(loja.qtd("polo")).toBe(10);
  });

  it("pedido da versao anterior sai da prateleira na entrega", async () => {
    const loja = new Loja(ETAPAS);
    loja.peca("polo", "PRODUCT", 0);
    const id = await pedidoDaVersaoAntiga(loja);
    await loja.avancarAte(id, "Pronto");
    await loja.avancarAte(id, "Entregue");
    expect(loja.qtd("polo")).toBe(0);
  });

  it("etapa criada entre Pronto e Entregue (Embalagem) mantem as pecas na prateleira ate a entrega", async () => {
    const loja = new Loja(["Recebido", "Costura", "Pronto", "Embalagem", "Entregue"]);
    loja.peca("polo", "PRODUCT", 0);
    const id = await loja.criar([{ productId: "polo", quantity: 12 }]);
    await loja.avancarAte(id, "Pronto");
    expect(loja.qtd("polo")).toBe(12);
    await loja.avancarAte(id, "Embalagem");
    expect(loja.qtd("polo")).toBe(12);
    await loja.avancarAte(id, "Entregue");
    expect(loja.qtd("polo")).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// (b) A tela de estoque soma certo?
// ---------------------------------------------------------------------------

function textoDosCartoes(html: string): string[] {
  return html
    .replace(/<[^>]+>/g, "\n")
    .split("\n")
    .map((t) => t.trim())
    .filter(Boolean);
}

function cartao(html: string, rotulo: string): { valor: string; nota: string } {
  const t = textoDosCartoes(html);
  const i = t.indexOf(rotulo);
  return { valor: t[i + 1], nota: t[i + 2] };
}

/** O que src/app/estoque/page.tsx entrega para a tela, a partir do banco. */
function propsDaTela(loja: Loja) {
  const pecas = [...loja.db.produtos.values()]
    .filter((p) => p.companyId === EMPRESA && p.deletedAt === null) // where companyId + filtro da lixeira
    .map((p) => ({
      id: p.id,
      name: p.id,
      category: null,
      size: null,
      color: null,
      currentQuantity: p.currentQuantity,
      minimumQuantity: p.minimumQuantity,
      costInCents: p.costInCents,
    }));
  const prontos = [...loja.db.pedidos.values()]
    .filter((o) => o.status === "READY")
    .map((o) => ({
      id: o.id,
      number: o.number,
      deliveryDate: HOJE,
      client: { name: "Cliente" },
      items: o.items.map((it, i) => ({ id: `${o.id}-${i}`, description: it.productId ?? "avulso", size: null, color: null, quantity: it.quantity })),
    }));
  return { pecas, movimentos: [], prontos, canManage: false };
}

describe("tela de estoque (db-stock-manager.tsx)", () => {
  it("depois de uma simulação: prateleira, pedidos prontos e valor parado batem com o banco", async () => {
    const loja = await simularExato(MODELO_PADRAO.etapas, 7, 300, false);
    const props = propsDaTela(loja);
    const html = renderToStaticMarkup(createElement(DbStockManager, props));

    const total = props.pecas.reduce((s, p) => s + p.currentQuantity, 0);
    const valor = props.pecas.reduce((s, p) => s + p.currentQuantity * p.costInCents, 0);
    expect(cartao(html, "Peças na prateleira").valor).toBe(String(total));
    expect(cartao(html, "Esperando retirada").valor).toBe(String(props.prontos.length));
    expect(cartao(html, "Valor parado").valor).toBe(centsToCurrency(valor));
    const itensProntos = props.prontos.reduce((s, o) => s + o.items.reduce((x, i) => x + i.quantity, 0), 0);
    expect(cartao(html, "Esperando retirada").nota).toBe(
      props.prontos.length === 0 ? "nenhum pedido pronto" : `${itensProntos} peça(s) em pedidos prontos`,
    );
  }, 60_000);

  it("prontos só com peça própria: 'N peça(s) em pedidos prontos' é o que entrou na prateleira", async () => {
    const loja = montarLoja(MODELO_PADRAO.etapas);
    const id = await loja.criar([{ productId: "polo", quantity: 30 }]);
    await loja.avancarAte(id, "Pronto");
    const html = renderToStaticMarkup(createElement(DbStockManager, propsDaTela(loja)));
    expect(cartao(html, "Esperando retirada")).toEqual({ valor: "1", nota: "30 peça(s) em pedidos prontos" });
    expect(cartao(html, "Peças na prateleira").valor).toBe(String(20 + 30 + 0 + 5 + 3));
  });

  it("ATENÇÃO: com serviço na peça do cliente e item avulso, o cartão conta peças que não entraram na prateleira", async () => {
    const loja = montarLoja(MODELO_PADRAO.etapas);
    const id = await loja.criar([
      { productId: "polo", quantity: 30 },
      { productId: "bordado-cliente", quantity: 15 },
      { productId: null, quantity: 5 },
    ]);
    await loja.avancarAte(id, "Pronto");
    expect(loja.qtd("polo")).toBe(50); // só 30 entraram
    const html = renderToStaticMarkup(createElement(DbStockManager, propsDaTela(loja)));
    expect(cartao(html, "Esperando retirada").nota).toBe("50 peça(s) em pedidos prontos");
  });

  it("peça 'acabando' só com mínimo definido e estoque no mínimo ou abaixo", async () => {
    const loja = montarLoja(MODELO_PADRAO.etapas);
    loja.manual("polo", "ADJUSTMENT", 10); // mínimo 10
    const html = renderToStaticMarkup(createElement(DbStockManager, propsDaTela(loja)));
    expect(cartao(html, "Acabando").valor).toBe("1"); // bone tem 0 mas mínimo 0: fora
  });
});
