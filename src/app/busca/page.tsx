import Link from "next/link";
import { ClipboardList, Search, Shirt, Users } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { SectionCard } from "@/components/section-card";
import { StatusBadge } from "@/components/status-badge";
import { requireUser } from "@/lib/auth";
import { centsToCurrency } from "@/lib/format";
import { orderStatusLabels } from "@/lib/status";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ q?: string; type?: string }>;

const typeOptions = [
  { value: "", label: "Tudo" },
  { value: "pedidos", label: "Pedidos" },
  { value: "clientes", label: "Clientes" },
  { value: "produtos", label: "Peças" },
];

export default async function BuscaPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser();
  const companyId = user.companyId;
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const type = params.type ?? "";
  const asNumber = Number(q.replace(/\D/g, ""));

  const showOrders = q !== "" && (type === "" || type === "pedidos");
  const showClients = q !== "" && (type === "" || type === "clientes");
  const showProducts = q !== "" && (type === "" || type === "produtos");

  const [clients, products, orders] = await Promise.all([
    showClients
      ? prisma.client.findMany({
          where: { companyId, name: { contains: q } },
          orderBy: { name: "asc" },
          take: 12,
          select: { id: true, name: true, phone: true },
        })
      : Promise.resolve([]),
    showProducts
      ? prisma.product.findMany({
          where: { companyId, name: { contains: q } },
          orderBy: { name: "asc" },
          take: 12,
          select: { id: true, name: true, standardPriceInCents: true },
        })
      : Promise.resolve([]),
    showOrders
      ? prisma.order.findMany({
          where: {
            companyId,
            OR: [
              { client: { name: { contains: q } } },
              ...(Number.isFinite(asNumber) && asNumber > 0 ? [{ number: asNumber }] : []),
            ],
          },
          orderBy: { createdAt: "desc" },
          take: 12,
          select: { id: true, number: true, status: true, totalAmountInCents: true, client: { select: { name: true } } },
        })
      : Promise.resolve([]),
  ]);

  const total = clients.length + products.length + orders.length;

  return (
    <AppShell eyebrow="Busca" title="Resultados" user={user}>
      <SectionCard eyebrow="Pesquisa" title="Buscar no sistema">
        <form method="get" className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-48 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#63736b]" size={18} aria-hidden="true" />
            <input
              name="q"
              defaultValue={q}
              autoFocus
              className="h-11 w-full rounded-lg border border-[#c7d3ce] bg-white pl-10 pr-3 text-sm outline-none ring-[#087f7d]/20 transition focus:border-[#087f7d] focus:ring-4"
              placeholder="Pedido (número), cliente ou produto"
            />
          </div>
          <select name="type" defaultValue={type} className="h-11 rounded-lg border border-[#c7d3ce] bg-white px-3 text-sm outline-none ring-[#087f7d]/20 transition focus:border-[#087f7d] focus:ring-4">
            {typeOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <button className="h-11 rounded-lg bg-[#087f7d] px-5 text-sm font-semibold text-white transition hover:bg-[#05605e]">Buscar</button>
        </form>
        {q ? <p className="mt-3 text-sm text-[#66756d]">{total} resultado(s) para &quot;{q}&quot;.</p> : <p className="mt-3 text-sm text-[#66756d]">Digite algo para pesquisar.</p>}
      </SectionCard>

      {q ? (
        <section className="grid gap-6 lg:grid-cols-3">
          {showOrders ? (
          <SectionCard eyebrow="Pedidos" title="Pedidos">
            {orders.length === 0 ? (
              <Empty text="Nenhum pedido." />
            ) : (
              <ul className="space-y-2">
                {orders.map((order) => (
                  <li key={order.id}>
                    <Link href={`/pedidos/${order.id}`} className="flex items-center justify-between gap-2 rounded-lg border border-[#d9e1dd] bg-[#f8faf9] px-3 py-2 text-sm hover:bg-[#eef4f1]">
                      <span className="flex items-center gap-2">
                        <ClipboardList size={15} className="text-[#63736b]" aria-hidden="true" />
                        <span className="font-mono font-semibold text-[#405047]">#{order.number}</span>
                        <span>{order.client.name}</span>
                      </span>
                      <StatusBadge>{orderStatusLabels[order.status]}</StatusBadge>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
          ) : null}

          {showClients ? (
          <SectionCard eyebrow="Clientes" title="Clientes">
            {clients.length === 0 ? (
              <Empty text="Nenhum cliente." />
            ) : (
              <ul className="space-y-2">
                {clients.map((client) => (
                  <li key={client.id}>
                    <Link href={`/clientes/${client.id}`} className="flex items-center justify-between gap-2 rounded-lg border border-[#d9e1dd] bg-[#f8faf9] px-3 py-2 text-sm hover:bg-[#eef4f1]">
                      <span className="flex items-center gap-2">
                        <Users size={15} className="text-[#63736b]" aria-hidden="true" />
                        {client.name}
                      </span>
                      <span className="text-[#63736b]">{client.phone || ""}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
          ) : null}

          {showProducts ? (
          <SectionCard eyebrow="Catálogo" title="Peças">
            {products.length === 0 ? (
              <Empty text="Nenhuma peça." />
            ) : (
              <ul className="space-y-2">
                {products.map((product) => (
                  <li key={product.id}>
                    <Link href="/produtos" className="flex items-center justify-between gap-2 rounded-lg border border-[#d9e1dd] bg-[#f8faf9] px-3 py-2 text-sm hover:bg-[#eef4f1]">
                      <span className="flex items-center gap-2">
                        <Shirt size={15} className="text-[#63736b]" aria-hidden="true" />
                        {product.name}
                      </span>
                      <span className="text-[#63736b]">{centsToCurrency(product.standardPriceInCents)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
          ) : null}
        </section>
      ) : null}
    </AppShell>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="text-sm text-[#8a9890]">{text}</p>;
}
