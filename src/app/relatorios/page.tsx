import Link from "next/link";
import { AlertTriangle, ArrowRight, BarChart3, CalendarRange, Clock, CreditCard, Download, Package, TrendingUp, Trophy, Users, Wrench } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { MetricCard } from "@/components/metric-card";
import { compararValores, periodoAnterior, textoVariacao } from "@/lib/comparacao";
import { agruparRentabilidade, lerMargem, noPrejuizo, ordenarPorLucro } from "@/lib/rentabilidade";
import { SectionCard } from "@/components/section-card";
import { StatusBadge } from "@/components/status-badge";
import { centsToCurrency, formatShortDate } from "@/lib/format";
import { isOrderLate, orderStatusLabels } from "@/lib/status";
import { requireRouteUser } from "@/lib/auth";
import { computeBalance } from "@/lib/payments";
import { findIncompleteCosts } from "@/lib/production";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ from?: string; to?: string }>;

function toInputDate(date: Date) {
  return date.toLocaleDateString("en-CA"); // yyyy-mm-dd
}

export default async function RelatoriosPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireRouteUser("/relatorios");
  const companyId = user.companyId;
  const params = await searchParams;

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const fromDate = params.from ? new Date(`${params.from}T00:00:00`) : monthStart;
  const toDate = params.to ? new Date(`${params.to}T23:59:59`) : now;
  const validFrom = Number.isNaN(fromDate.getTime()) ? monthStart : fromDate;
  const validTo = Number.isNaN(toDate.getTime()) ? now : toDate;

  // Mesmo tamanho de período, imediatamente antes: é o que dá sentido ao
  // número. "R$ 23 mil" sozinho não diz se foi um bom mês.
  const anterior = periodoAnterior({ de: validFrom, ate: validTo });

  const [rangeOrders, ordersAnterior, allOrders, products, pendingPayments, stages, materials] = await Promise.all([
    prisma.order.findMany({
      where: { companyId, orderDate: { gte: validFrom, lte: validTo } },
      select: {
        totalAmountInCents: true,
        paidAmountInCents: true,
        client: { select: { name: true } },
        items: { select: { description: true, quantity: true, productId: true, totalPriceInCents: true } },
        services: { select: { name: true, priceInCents: true } },
      },
    }),
    // Só o que a comparação usa: total, recebido e os itens para o lucro.
    prisma.order.findMany({
      where: { companyId, orderDate: { gte: anterior.de, lte: anterior.ate } },
      select: {
        totalAmountInCents: true,
        paidAmountInCents: true,
        items: { select: { quantity: true, productId: true, totalPriceInCents: true } },
        services: { select: { priceInCents: true } },
      },
    }),
    prisma.order.findMany({
      where: { companyId },
      select: { number: true, deliveryDate: true, status: true, assignee: true, client: { select: { name: true } } },
    }),
    prisma.product.findMany({
      where: { companyId },
      select: {
        id: true,
        name: true,
        costInCents: true,
        kind: true,
        bom: { select: { quantityPerUnit: true, material: { select: { name: true, costPerUnitInCents: true } } } },
      },
    }),
    // Pendência é SALDO: total do pedido menos o que já entrou. Antes somava o
    // total das linhas de pagamento, então um pedido de R$ 5.500 com R$ 3.300
    // pagos entrava inteiro — e o relatório divergia do financeiro.
    prisma.order.findMany({
      where: { companyId, status: { not: "CANCELED" } },
      orderBy: { deliveryDate: "asc" },
      select: {
        id: true,
        number: true,
        deliveryDate: true,
        totalAmountInCents: true,
        client: { select: { name: true } },
        payments: { select: { amountInCents: true } },
      },
    }),
    prisma.productionStage.findMany({
      where: { companyId, active: true },
      orderBy: { position: "asc" },
      include: { _count: { select: { currentOrders: true } } },
    }),
    prisma.material.findMany({
      where: { companyId },
      select: { id: true, name: true, unit: true, currentQuantity: true, minimumQuantity: true },
    }),
  ]);

  // Custo por peça = materiais da ficha + outros custos digitados no produto.
  const productCost = new Map(
    products.map((p) => {
      const materialCost = p.bom.reduce(
        (sum, entry) => sum + Math.round(Number(entry.quantityPerUnit) * entry.material.costPerUnitInCents),
        0,
      );
      return [p.id, materialCost + p.costInCents];
    }),
  );
  const productKind = new Map(products.map((p) => [p.id, p.kind]));
  const productName = new Map(products.map((p) => [p.id, p.name]));

  // Faturamento no período
  const totalRevenue = rangeOrders.reduce((sum, o) => sum + o.totalAmountInCents, 0);
  const received = rangeOrders.reduce((sum, o) => sum + o.paidAmountInCents, 0);
  const toReceive = Math.max(0, totalRevenue - received);

  // Lucro = receita menos custo. A receita inclui os serviços cobrados: para uma
  // serigrafia o serviço É o produto, e deixá-lo de fora fazia o lucro sair bem
  // abaixo do real, enquanto o faturamento já o contava.
  const rangeItems = rangeOrders.flatMap((o) => o.items);
  const itemsRevenue = rangeItems.reduce((sum, item) => sum + item.totalPriceInCents, 0);
  const serviceRevenue = rangeOrders.reduce(
    (sum, order) => sum + order.services.reduce((s, service) => s + service.priceInCents, 0),
    0,
  );
  const profitRevenue = itemsRevenue + serviceRevenue;
  const totalCost = rangeItems.reduce((sum, item) => sum + (item.productId ? (productCost.get(item.productId) ?? 0) * item.quantity : 0), 0);
  const estimatedProfit = profitRevenue - totalCost;

  // Faturamento separado: serviço na peça do cliente x peça feita pela confecção.
  const byKind = { SERVICE: { revenue: 0, units: 0 }, PRODUCT: { revenue: 0, units: 0 } };
  for (const item of rangeItems) {
    if (!item.productId) continue;
    const kind = productKind.get(item.productId) ?? "PRODUCT";
    byKind[kind].revenue += item.totalPriceInCents;
    byKind[kind].units += item.quantity;
  }

  // Quanto cada serviço rendeu: vem do que foi cobrado em cada pedido, então é
  // o valor real e não uma estimativa de tabela.
  const serviceTotals = new Map<string, { revenue: number; count: number }>();
  for (const order of rangeOrders) {
    for (const service of order.services) {
      const current = serviceTotals.get(service.name) ?? { revenue: 0, count: 0 };
      current.revenue += service.priceInCents;
      current.count += 1;
      serviceTotals.set(service.name, current);
    }
  }
  const serviceRows = [...serviceTotals.entries()]
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.revenue - a.revenue);
  const servicesRevenue = serviceRows.reduce((sum, row) => sum + row.revenue, 0);
  const margin = profitRevenue > 0 ? Math.round((estimatedProfit / profitRevenue) * 100) : 0;
  const itemsWithoutCost = rangeItems.filter((item) => !item.productId || (productCost.get(item.productId) ?? 0) === 0).length;

  // Custo incompleto é pior do que custo zerado: a peça tem número, mas ele está
  // por baixo, e o lucro aparece maior do que é. Acontece quando um material da
  // ficha ainda não tem preço cadastrado no estoque.
  const { productIds: productsMissingPrice, materialNames: materialsMissingPrice } = findIncompleteCosts(
    products.map((p) => ({
      id: p.id,
      bom: p.bom.map((entry) => ({
        materialName: entry.material.name,
        materialPriceInCents: entry.material.costPerUnitInCents,
      })),
    })),
  );
  const itemsWithPartialCost = rangeItems.filter(
    (item) => item.productId && productsMissingPrice.has(item.productId),
  ).length;

  // Produtos mais vendidos (no período)
  const productSales = new Map<string, { label: string; quantity: number; revenue: number }>();
  for (const item of rangeItems) {
    const key = item.productId ?? `desc:${item.description}`;
    const label = item.productId ? productName.get(item.productId) ?? item.description : item.description;
    const entry = productSales.get(key) ?? { label, quantity: 0, revenue: 0 };
    entry.quantity += item.quantity;
    entry.revenue += item.totalPriceInCents;
    productSales.set(key, entry);
  }
  const topProducts = [...productSales.values()].sort((a, b) => b.quantity - a.quantity).slice(0, 5);

  // Clientes que mais compram (no período)
  const clientSales = new Map<string, { count: number; total: number }>();
  for (const order of rangeOrders) {
    const entry = clientSales.get(order.client.name) ?? { count: 0, total: 0 };
    entry.count += 1;
    entry.total += order.totalAmountInCents;
    clientSales.set(order.client.name, entry);
  }
  const topClients = [...clientSales.entries()]
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  // Rentabilidade: por peça e por cliente, ordenada por LUCRO.
  //
  // "Quem mais compra" era por faturamento, e isso engana: cliente que compra
  // muito com margem apertada pode valer menos que um pequeno com margem boa.
  const rentPorPeca = ordenarPorLucro(
    agruparRentabilidade(
      rangeItems.map((item) => ({
        chave: item.productId ?? `desc:${item.description}`,
        rotulo: item.productId ? productName.get(item.productId) ?? item.description : item.description,
        quantidade: item.quantity,
        receitaInCents: item.totalPriceInCents,
        custoInCents: item.productId ? (productCost.get(item.productId) ?? 0) * item.quantity : 0,
      })),
    ),
  );

  const rentPorCliente = ordenarPorLucro(
    agruparRentabilidade(
      rangeOrders.flatMap((order) =>
        order.items.map((item) => ({
          chave: order.client.name,
          rotulo: order.client.name,
          quantidade: item.quantity,
          receitaInCents: item.totalPriceInCents,
          custoInCents: item.productId ? (productCost.get(item.productId) ?? 0) * item.quantity : 0,
        })),
      ),
    ),
  );

  // A lista que não existia: o que saiu por menos do que custou.
  const pecasNoPrejuizo = noPrejuizo(rentPorPeca);

  // Estado atual (independe do período)
  const lateOrders = allOrders
    .filter((o) => isOrderLate(o.deliveryDate, o.status))
    .sort((a, b) => (a.deliveryDate?.getTime() ?? 0) - (b.deliveryDate?.getTime() ?? 0));
  const pendingRows = pendingPayments
    .map((order) => ({ order, balance: computeBalance(order.totalAmountInCents, order.payments) }))
    .filter((row) => row.balance > 0);
  const pendingTotal = pendingRows.reduce((sum, row) => sum + row.balance, 0);
  const lowStock = materials.filter((m) => Number(m.currentQuantity) <= Number(m.minimumQuantity));
  const maxStageCount = Math.max(1, ...stages.map((s) => s._count.currentOrders));

  // Produção por responsável (pedidos ainda em andamento)
  const byAssignee = new Map<string, number>();
  for (const order of allOrders) {
    if (order.status === "DELIVERED" || order.status === "CANCELED") continue;
    const key = order.assignee?.trim() || "Sem responsável";
    byAssignee.set(key, (byAssignee.get(key) ?? 0) + 1);
  }
  const assigneeRows = [...byAssignee.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);

  // Os mesmos números do período anterior, pelas mesmas contas — senão a
  // comparação sairia entre coisas diferentes.
  const faturamentoAnterior = ordersAnterior.reduce((s, o) => s + o.totalAmountInCents, 0);
  const recebidoAnterior = ordersAnterior.reduce((s, o) => s + o.paidAmountInCents, 0);
  const itensAnterior = ordersAnterior.flatMap((o) => o.items);
  const lucroAnterior =
    itensAnterior.reduce((s, i) => s + i.totalPriceInCents, 0) +
    ordersAnterior.reduce((s, o) => s + o.services.reduce((x, sv) => x + sv.priceInCents, 0), 0) -
    itensAnterior.reduce((s, i) => s + (i.productId ? (productCost.get(i.productId) ?? 0) * i.quantity : 0), 0);

  const varFaturamento = compararValores(totalRevenue, faturamentoAnterior);
  const varRecebido = compararValores(received, recebidoAnterior);
  const varLucro = compararValores(estimatedProfit, lucroAnterior);
  const varPedidos = compararValores(rangeOrders.length, ordersAnterior.length);

  const kpis = [
    {
      label: "Faturamento (período)",
      value: centsToCurrency(totalRevenue),
      note: textoVariacao(varFaturamento, centsToCurrency),
      icon: BarChart3,
      tone: "primary" as const,
    },
    {
      label: "Recebido",
      value: centsToCurrency(received),
      note: `${centsToCurrency(toReceive)} a receber · ${textoVariacao(varRecebido, centsToCurrency)}`,
      icon: CreditCard,
      tone: "primary" as const,
    },
    {
      label: "Lucro estimado",
      value: centsToCurrency(estimatedProfit),
      note: `margem de ${margin}% · ${textoVariacao(varLucro, centsToCurrency)}`,
      icon: TrendingUp,
      tone: "warning" as const,
    },
    {
      label: "Pedidos no período",
      value: String(rangeOrders.length),
      note: textoVariacao(varPedidos, (n) => `${n} pedido${n === 1 ? "" : "s"}`),
      icon: Clock,
      tone: "primary" as const,
    },
  ];

  return (
    <AppShell eyebrow="Análise" title="Relatórios" actionLabel="Exportar" user={user}>
      <SectionCard eyebrow="Período" title="Intervalo de análise">
        <form method="get" className="flex flex-wrap items-end gap-3">
          <label>
            <span className="text-xs text-[#63736b]">De</span>
            <input type="date" name="from" defaultValue={toInputDate(validFrom)} className="mt-1 h-9 rounded-lg border border-[#c7d3ce] bg-white px-2 text-sm outline-none ring-[#087f7d]/20 transition focus:border-[#087f7d] focus:ring-4" />
          </label>
          <label>
            <span className="text-xs text-[#63736b]">Até</span>
            <input type="date" name="to" defaultValue={toInputDate(validTo)} className="mt-1 h-9 rounded-lg border border-[#c7d3ce] bg-white px-2 text-sm outline-none ring-[#087f7d]/20 transition focus:border-[#087f7d] focus:ring-4" />
          </label>
          <button className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#087f7d] px-4 text-sm font-semibold text-white transition hover:bg-[#05605e]">
            <CalendarRange size={15} aria-hidden="true" />
            Aplicar
          </button>
          <a href="/relatorios" className="inline-flex h-9 items-center rounded-lg border border-[#c7d3ce] px-4 text-sm font-semibold text-[#405047]">Mês atual</a>
          <a
            href={`/relatorios/export?from=${toInputDate(validFrom)}&to=${toInputDate(validTo)}`}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#087f7d] px-4 text-sm font-semibold text-[#05605e]"
          >
            <Download size={15} aria-hidden="true" />
            Exportar CSV
          </a>
        </form>
      </SectionCard>

      {itemsWithPartialCost > 0 ? (
        <div className="rounded-lg border border-[#ead49c] bg-[#fff7dd] p-4">
          <div className="flex gap-3">
            <AlertTriangle size={20} className="mt-0.5 shrink-0 text-[#a06a1c]" aria-hidden="true" />
            <div className="min-w-0">
              <p className="font-semibold text-[#7b5a0b]">O lucro abaixo pode estar maior do que o real.</p>
              <p className="mt-1 text-sm text-[#7b5a0b]">
                {itemsWithPartialCost} venda(s) do período usam peças com material sem preço cadastrado:{" "}
                <strong>{materialsMissingPrice.slice(0, 5).join(", ")}</strong>
                {materialsMissingPrice.length > 5 ? ` e mais ${materialsMissingPrice.length - 5}` : ""}. Enquanto faltar,
                o custo sai por baixo e a margem parece melhor do que é.
              </p>
              <Link
                href="/estoque"
                className="mt-2 inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#ead49c] bg-white px-3 text-sm font-semibold text-[#7b5a0b] transition hover:bg-[#fffdf7]"
              >
                Cadastrar preços no estoque
                <ArrowRight size={15} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((card) => (
          <MetricCard key={card.label} {...card} />
        ))}
      </section>

      <SectionCard eyebrow="Lucro" title="Composição do lucro estimado">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {[
            ["Receita das peças", centsToCurrency(itemsRevenue)],
            ["Receita dos serviços", centsToCurrency(serviceRevenue)],
            ["Custo de produção", centsToCurrency(totalCost)],
            ["Lucro estimado", centsToCurrency(estimatedProfit)],
            ["Margem", `${margin}%`],
          ].map(([label, value]) => (
            <article key={label} className="rounded-lg border border-[#d9e1dd] bg-[#f8faf9] p-4">
              <p className="text-sm text-[#63736b]">{label}</p>
              <p className="mt-1 text-xl font-semibold">{value}</p>
            </article>
          ))}
        </div>
        {itemsWithoutCost > 0 ? (
          <p className="mt-3 flex items-center gap-2 text-sm text-[#85620e]">
            <AlertTriangle size={15} aria-hidden="true" />
            {itemsWithoutCost} item(ns) sem custo cadastrado entram como lucro cheio. Preencha o custo dos produtos para um valor mais exato.
          </p>
        ) : null}
      </SectionCard>

      <section className="grid gap-6 lg:grid-cols-2">
        <SectionCard
          eyebrow="Serviços"
          title="Faturamento por serviço"
          action={<span className="rounded-lg bg-[#eef4f1] px-3 py-2 text-sm font-semibold text-[#405047]">{centsToCurrency(servicesRevenue)}</span>}
        >
          {serviceRows.length === 0 ? (
            <p className="rounded-lg border border-dashed border-[#c7d3ce] bg-[#f8faf9] p-6 text-center text-sm text-[#66756d]">
              Nenhum serviço cobrado no período. Os serviços são digitados ao criar o pedido.
            </p>
          ) : (
            <ul className="space-y-3">
              {serviceRows.map((row) => {
                const share = servicesRevenue > 0 ? Math.round((row.revenue / servicesRevenue) * 100) : 0;
                return (
                  <li key={row.name}>
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="flex min-w-0 items-center gap-2">
                        <Wrench size={14} className="shrink-0 text-[#05605e]" aria-hidden="true" />
                        <span className="truncate text-sm font-medium text-[#405047]">{row.name}</span>
                      </span>
                      <span className="shrink-0 text-sm font-semibold tabular-nums">
                        {centsToCurrency(row.revenue)}
                        <span className="ml-1 font-normal text-[#8a9890]">· {row.count}x</span>
                      </span>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-[#eef2ef]">
                      <div className="h-full rounded-full bg-[#087f7d]" style={{ width: `${share}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </SectionCard>

        <SectionCard eyebrow="Origem" title="Serviço x peça própria">
          <div className="grid gap-3 sm:grid-cols-2">
            {([
              ["Peça própria", byKind.PRODUCT, "A confecção fez a peça inteira"],
              ["Serviço no cliente", byKind.SERVICE, "O cliente trouxe a peça"],
            ] as const).map(([label, data, hint]) => {
              const share = itemsRevenue > 0 ? Math.round((data.revenue / itemsRevenue) * 100) : 0;
              return (
                <article key={label} className="rounded-lg border border-[#d9e1dd] bg-[#f8faf9] p-4">
                  <p className="text-sm font-medium text-[#405047]">{label}</p>
                  <p className="mt-1 text-xl font-semibold tabular-nums">{centsToCurrency(data.revenue)}</p>
                  <p className="mt-1 text-sm text-[#66756d]">
                    {share}% do faturamento · {data.units} un.
                  </p>
                  <p className="mt-2 text-xs text-[#8a9890]">{hint}</p>
                </article>
              );
            })}
          </div>
        </SectionCard>
      </section>

      {/* O que dá dinheiro de verdade. Vem antes de "mais vendidas" de
          propósito: vender muito e lucrar pouco é o erro que essa tela
          existia para revelar e não revelava. */}
      {pecasNoPrejuizo.length > 0 ? (
        <SectionCard eyebrow="Atenção" title="Saindo no prejuízo">
          <p className="mb-3 text-sm text-[#66756d]">
            Estas peças foram vendidas por menos do que custaram para fazer. O faturamento sobe, mas o
            dinheiro não fica.
          </p>
          <ul className="divide-y divide-[#eef2ef]">
            {pecasNoPrejuizo.slice(0, 5).map((linha) => (
              <li key={linha.rotulo} className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 py-2.5 first:pt-0 last:pb-0">
                <span className="min-w-0 flex-1 font-medium text-[#405047]">{linha.rotulo}</span>
                <span className="text-xs text-[#8a9890]">
                  {linha.quantidade} un. · vendeu {centsToCurrency(linha.receitaInCents)} · custou{" "}
                  {centsToCurrency(linha.custoInCents)}
                </span>
                <span className="font-semibold tabular-nums text-[#9f2f42]">
                  {centsToCurrency(linha.lucroInCents)}
                </span>
              </li>
            ))}
          </ul>
        </SectionCard>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-2">
        <SectionCard eyebrow="Lucro" title="Peças que mais dão lucro">
          {rentPorPeca.length === 0 ? (
            <EmptyHint icon={Trophy} text="Nenhum item vendido no período." />
          ) : (
            <ul className="divide-y divide-[#eef2ef]">
              {rentPorPeca.slice(0, 5).map((linha) => (
                <li key={linha.rotulo} className="py-2.5 first:pt-0 last:pb-0">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="min-w-0 flex-1 truncate font-medium text-[#405047]">{linha.rotulo}</span>
                    <span className="shrink-0 font-semibold tabular-nums text-[#05605e]">
                      {centsToCurrency(linha.lucroInCents)}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-[#8a9890]">
                    {linha.quantidade} un. · faturou {centsToCurrency(linha.receitaInCents)} ·{" "}
                    {lerMargem(linha.margem, linha.custoIncompleto)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard eyebrow="Lucro" title="Clientes que mais dão lucro">
          {rentPorCliente.length === 0 ? (
            <EmptyHint icon={Users} text="Nenhum pedido no período." />
          ) : (
            <ul className="divide-y divide-[#eef2ef]">
              {rentPorCliente.slice(0, 5).map((linha) => (
                <li key={linha.rotulo} className="py-2.5 first:pt-0 last:pb-0">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="min-w-0 flex-1 truncate font-medium text-[#405047]">{linha.rotulo}</span>
                    <span className="shrink-0 font-semibold tabular-nums text-[#05605e]">
                      {centsToCurrency(linha.lucroInCents)}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-[#8a9890]">
                    faturou {centsToCurrency(linha.receitaInCents)} · {lerMargem(linha.margem, linha.custoIncompleto)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <SectionCard eyebrow="Vendas" title="Peças mais vendidas">
          {topProducts.length === 0 ? (
            <EmptyHint icon={Trophy} text="Nenhum item vendido no período." />
          ) : (
            <ul className="space-y-3">
              {topProducts.map((product, index) => (
                <li key={product.label} className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-3">
                    <span className="flex size-7 items-center justify-center rounded-md bg-[#eef4f1] text-xs font-semibold text-[#405047]">{index + 1}</span>
                    <span className="text-sm font-medium">{product.label}</span>
                  </span>
                  <span className="text-right text-sm">
                    <strong>{product.quantity} un.</strong>
                    <span className="ml-2 text-[#63736b]">{centsToCurrency(product.revenue)}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard eyebrow="Clientes" title="Quem mais compra (período)">
          {topClients.length === 0 ? (
            <EmptyHint icon={Users} text="Nenhum cliente comprou no período." />
          ) : (
            <ul className="space-y-3">
              {topClients.map((client, index) => (
                <li key={client.name} className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-3">
                    <span className="flex size-7 items-center justify-center rounded-md bg-[#eef4f1] text-xs font-semibold text-[#405047]">{index + 1}</span>
                    <span className="text-sm font-medium">{client.name}</span>
                  </span>
                  <span className="text-right text-sm">
                    <strong>{centsToCurrency(client.total)}</strong>
                    <span className="ml-2 text-[#63736b]">{client.count} pedido(s)</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard eyebrow="Prazos" title="Pedidos atrasados">
          {lateOrders.length === 0 ? (
            <EmptyHint icon={Clock} text="Nenhum pedido atrasado. Tudo em dia!" />
          ) : (
            <ul className="space-y-2">
              {lateOrders.slice(0, 8).map((order) => (
                <li key={order.number} className="flex items-center justify-between gap-3 rounded-lg border border-[#f1c0c9] bg-[#fff0f2] px-3 py-2">
                  <span className="text-sm">
                    <span className="font-mono font-semibold text-[#63736b]">#{order.number}</span>
                    <span className="ml-2 font-medium">{order.client.name}</span>
                  </span>
                  <span className="flex items-center gap-2 text-sm">
                    <span className="text-[#63736b]">{orderStatusLabels[order.status]}</span>
                    <StatusBadge tone="warn">{formatShortDate(order.deliveryDate)}</StatusBadge>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard
          eyebrow="Financeiro"
          title="Pagamentos pendentes"
          action={<div className="rounded-lg bg-[#eef4f1] px-3 py-2 text-sm font-semibold text-[#405047]">{centsToCurrency(pendingTotal)}</div>}
        >
          {pendingRows.length === 0 ? (
            <EmptyHint icon={CreditCard} text="Nenhum pagamento pendente." />
          ) : (
            <ul className="space-y-2">
              {pendingRows.slice(0, 8).map(({ order, balance }) => (
                <li key={order.id} className="flex items-center justify-between gap-3">
                  <span className="text-sm">
                    <span className="font-mono font-semibold text-[#63736b]">#{order.number}</span>
                    <span className="ml-2 font-medium">{order.client.name}</span>
                    {order.deliveryDate ? <span className="ml-2 text-xs text-[#8a9890]">prazo {formatShortDate(order.deliveryDate)}</span> : null}
                  </span>
                  <strong className="text-sm tabular-nums">{centsToCurrency(balance)}</strong>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </section>

      <SectionCard eyebrow="Equipe" title="Produção por responsável">
        {assigneeRows.length === 0 ? (
          <EmptyHint icon={Users} text="Nenhum pedido em andamento." />
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {assigneeRows.map((row) => (
              <li key={row.name} className="flex items-center justify-between gap-3 rounded-lg border border-[#d9e1dd] bg-[#f8faf9] px-3 py-2 text-sm">
                <span className="font-medium">{row.name}</span>
                <StatusBadge>{row.count} pedido(s)</StatusBadge>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <section className="grid gap-6 lg:grid-cols-2">
        <SectionCard eyebrow="Produção" title="Pedidos por etapa">
          {stages.length === 0 ? (
            <EmptyHint icon={Package} text="Nenhuma etapa cadastrada." />
          ) : (
            <ul className="space-y-3">
              {stages.map((stage) => (
                <li key={stage.id}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{stage.name}</span>
                    <span className="text-[#63736b]">{stage._count.currentOrders}</span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-[#edf2ef]">
                    <div
                      className="h-2 rounded-full bg-[#087f7d]"
                      style={{ width: `${Math.round((stage._count.currentOrders / maxStageCount) * 100)}%`, backgroundColor: stage.color || undefined }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard
          eyebrow="Estoque"
          title="Materiais abaixo do mínimo"
          action={<div className="rounded-lg bg-[#eef4f1] px-3 py-2 text-sm font-semibold text-[#405047]">{lowStock.length}</div>}
        >
          {lowStock.length === 0 ? (
            <EmptyHint icon={Package} text="Estoque saudável, nada abaixo do mínimo." />
          ) : (
            <ul className="space-y-2">
              {lowStock.map((material) => (
                <li key={material.id} className="flex items-center justify-between gap-3 rounded-lg border border-[#f1c0c9] bg-[#fff0f2] px-3 py-2 text-sm">
                  <span className="flex items-center gap-2 font-medium">
                    <AlertTriangle size={14} className="text-[#9f2f42]" aria-hidden="true" />
                    {material.name}
                  </span>
                  <span className="text-[#63736b]">{Number(material.currentQuantity)}/{Number(material.minimumQuantity)} {material.unit}</span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </section>
    </AppShell>
  );
}

function EmptyHint({ icon: Icon, text }: { icon: typeof Package; text: string }) {
  return (
    <div className="rounded-lg border border-dashed border-[#c7d3ce] bg-[#f8faf9] p-6 text-center">
      <Icon className="mx-auto text-[#8a9890]" size={24} aria-hidden="true" />
      <p className="mt-2 text-sm text-[#66756d]">{text}</p>
    </div>
  );
}
