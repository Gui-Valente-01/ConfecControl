import Link from "next/link";
import { AlertTriangle, FileText, Search } from "lucide-react";
import type { FiscalStatus, Prisma } from "@prisma/client";
import { AppShell } from "@/components/app-shell";
import { MetricCard } from "@/components/metric-card";
import { SectionCard } from "@/components/section-card";
import { StatusBadge } from "@/components/status-badge";
import { requireRouteUser } from "@/lib/auth";
import { ambienteFiscal, provedorFiscal } from "@/lib/fiscal/config";
import { rotuloDoStatus } from "@/lib/fiscal/estados";
import { centsToCurrency, formatShortDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  status?: string;
  de?: string;
  ate?: string;
  chave?: string;
  cliente?: string;
  pagina?: string;
}>;

const POR_PAGINA = 25;

const FILTROS: { valor: string; rotulo: string }[] = [
  { valor: "", rotulo: "Todas" },
  { valor: "AUTHORIZED", rotulo: "Autorizadas" },
  { valor: "PROCESSING", rotulo: "Em processamento" },
  { valor: "REJECTED", rotulo: "Rejeitadas" },
  { valor: "CANCELLED", rotulo: "Canceladas" },
  { valor: "ERROR", rotulo: "Com falha" },
];

const TOM: Record<string, "good" | "warn" | "neutral" | "dark"> = {
  AUTHORIZED: "good",
  CANCELLED: "dark",
  REJECTED: "warn",
  ERROR: "warn",
};

function ehStatus(valor: string): valor is FiscalStatus {
  return ["DRAFT", "VALIDATING", "PROCESSING", "AUTHORIZED", "REJECTED", "CANCELLATION_PENDING", "CANCELLED", "ERROR"].includes(valor);
}

export default async function FiscalPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireRouteUser("/fiscal");
  const companyId = user.companyId;
  const params = await searchParams;

  const statusFiltro = params.status && ehStatus(params.status) ? params.status : null;
  const chave = params.chave?.replace(/\D/g, "").trim() || null;
  const cliente = params.cliente?.trim() || null;
  const de = params.de ? new Date(`${params.de}T00:00:00`) : null;
  const ate = params.ate ? new Date(`${params.ate}T23:59:59`) : null;
  const pagina = Math.max(1, Number(params.pagina) || 1);

  const where: Prisma.FiscalDocumentWhereInput = {
    companyId,
    ...(statusFiltro ? { status: statusFiltro } : {}),
    ...(chave ? { accessKey: { contains: chave } } : {}),
    ...(cliente ? { order: { client: { name: { contains: cliente, mode: "insensitive" } } } } : {}),
    ...(de || ate ? { createdAt: { ...(de ? { gte: de } : {}), ...(ate ? { lte: ate } : {}) } } : {}),
  };

  // Contagem e página vêm do banco, e não de carregar tudo e filtrar na memória:
  // uma confecção que emite todo dia acumula milhares de notas por ano.
  const [documentos, total, resumo, pedidosSemNota] = await Promise.all([
    prisma.fiscalDocument.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (pagina - 1) * POR_PAGINA,
      take: POR_PAGINA,
      include: { order: { select: { number: true, id: true, client: { select: { name: true } } } } },
    }),
    prisma.fiscalDocument.count({ where }),
    prisma.fiscalDocument.groupBy({ by: ["status"], where: { companyId }, _count: { _all: true } }),
    // Pedidos entregues que ainda não têm nota: é a lista que dá trabalho ao
    // financeiro no fim do mês.
    prisma.order.findMany({
      where: { companyId, status: "DELIVERED", fiscalDocuments: { none: {} } },
      orderBy: { deliveryDate: "desc" },
      take: 8,
      select: { id: true, number: true, totalAmountInCents: true, client: { select: { name: true } } },
    }),
  ]);

  const contarPorStatus = (status: FiscalStatus) =>
    resumo.find((linha) => linha.status === status)?._count._all ?? 0;

  const ambiente = ambienteFiscal();
  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA));

  const comFiltro = (extra: Record<string, string>) => {
    const busca = new URLSearchParams();
    if (statusFiltro) busca.set("status", statusFiltro);
    if (params.de) busca.set("de", params.de);
    if (params.ate) busca.set("ate", params.ate);
    if (params.chave) busca.set("chave", params.chave);
    if (params.cliente) busca.set("cliente", params.cliente);
    for (const [k, v] of Object.entries(extra)) {
      if (v) busca.set(k, v);
      else busca.delete(k);
    }
    return `/fiscal?${busca.toString()}`;
  };

  return (
    <AppShell eyebrow="Fiscal" title="Notas fiscais" user={user}>
      <div
        className={`rounded-lg border p-4 text-sm ${
          ambiente === "HOMOLOGACAO"
            ? "border-warning-line bg-warning-soft text-warning-ink"
            : "border-danger-line bg-danger-soft text-danger-dark"
        }`}
      >
        <p className="flex items-center gap-2 font-semibold">
          <AlertTriangle size={16} aria-hidden="true" />
          {ambiente === "HOMOLOGACAO" ? "Ambiente de teste (homologação)" : "Ambiente de produção"}
        </p>
        <p className="mt-1">
          {ambiente === "HOMOLOGACAO"
            ? "As notas desta tela NÃO têm valor fiscal e não existem para a SEFAZ."
            : "As notas desta tela têm valor fiscal."}
          {provedorFiscal().nome === "falso" ? " O provedor configurado é o de teste." : null}
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Autorizadas" value={String(contarPorStatus("AUTHORIZED"))} note="valem como documento" icon={FileText} tone="primary" />
        <MetricCard label="Em processamento" value={String(contarPorStatus("PROCESSING"))} note="aguardando a SEFAZ" icon={FileText} tone="warning" />
        <MetricCard
          label="Rejeitadas"
          value={String(contarPorStatus("REJECTED"))}
          note={contarPorStatus("REJECTED") > 0 ? "precisam de correção" : "nenhuma pendente"}
          icon={AlertTriangle}
          tone={contarPorStatus("REJECTED") > 0 ? "danger" : "neutral"}
        />
        <MetricCard label="Canceladas" value={String(contarPorStatus("CANCELLED"))} note="canceladas na SEFAZ" icon={FileText} tone="neutral" />
      </section>

      <SectionCard eyebrow="Filtros" title="Encontrar uma nota">
        <form method="get" className="flex flex-wrap items-end gap-3">
          <label>
            <span className="text-xs text-muted">Situação</span>
            <select name="status" defaultValue={statusFiltro ?? ""} className="mt-1 h-9 rounded-lg border border-line-strong bg-surface px-2 text-sm">
              {FILTROS.map((f) => (
                <option key={f.valor || "todas"} value={f.valor}>{f.rotulo}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="text-xs text-muted">De</span>
            <input type="date" name="de" defaultValue={params.de ?? ""} className="mt-1 h-9 rounded-lg border border-line-strong bg-surface px-2 text-sm" />
          </label>
          <label>
            <span className="text-xs text-muted">Até</span>
            <input type="date" name="ate" defaultValue={params.ate ?? ""} className="mt-1 h-9 rounded-lg border border-line-strong bg-surface px-2 text-sm" />
          </label>
          <label>
            <span className="text-xs text-muted">Cliente</span>
            <input name="cliente" defaultValue={params.cliente ?? ""} placeholder="nome do cliente" className="mt-1 h-9 rounded-lg border border-line-strong bg-surface px-2 text-sm" />
          </label>
          <label>
            <span className="text-xs text-muted">Chave de acesso</span>
            <input name="chave" defaultValue={params.chave ?? ""} inputMode="numeric" placeholder="44 dígitos" className="mt-1 h-9 w-44 rounded-lg border border-line-strong bg-surface px-2 text-sm" />
          </label>
          <button className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white transition hover:bg-primary-dark">
            <Search size={15} aria-hidden="true" />
            Buscar
          </button>
          <Link href="/fiscal" className="inline-flex h-9 items-center rounded-lg border border-line-strong px-4 text-sm font-semibold text-body">
            Limpar
          </Link>
        </form>
      </SectionCard>

      <SectionCard
        eyebrow="Notas"
        title={total === 1 ? "1 nota encontrada" : `${total} notas encontradas`}
      >
        {documentos.length === 0 ? (
          <p className="rounded-lg border border-dashed border-line-strong bg-canvas p-6 text-center text-sm text-muted">
            Nenhuma nota com esses filtros.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-soft">
                  <th className="py-2">Número</th>
                  <th className="py-2">Pedido</th>
                  <th className="py-2">Cliente</th>
                  <th className="py-2">Emitida</th>
                  <th className="py-2 text-right">Valor</th>
                  <th className="py-2">Situação</th>
                </tr>
              </thead>
              <tbody>
                {documentos.map((doc) => (
                  <tr key={doc.id} className="border-b border-divider last:border-0">
                    <td className="py-2 font-mono text-xs">{doc.number ?? "—"}</td>
                    <td className="py-2">
                      {doc.order ? (
                        <Link href={`/pedidos/${doc.order.id}`} className="font-mono font-semibold text-primary hover:text-primary-dark">
                          #{doc.order.number}
                        </Link>
                      ) : (
                        <span className="text-soft">avulsa</span>
                      )}
                    </td>
                    <td className="py-2">{doc.order?.client.name ?? "—"}</td>
                    <td className="py-2 text-muted">{doc.issuedAt ? formatShortDate(doc.issuedAt) : "—"}</td>
                    <td className="py-2 text-right tabular-nums">{centsToCurrency(doc.totalAmountInCents)}</td>
                    <td className="py-2">
                      <StatusBadge tone={TOM[doc.status] ?? "neutral"}>{rotuloDoStatus(doc.status)}</StatusBadge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPaginas > 1 ? (
          <div className="mt-4 flex items-center justify-between gap-3 text-sm">
            <span className="text-muted">Página {pagina} de {totalPaginas}</span>
            <div className="flex gap-2">
              {pagina > 1 ? (
                <Link href={comFiltro({ pagina: String(pagina - 1) })} className="rounded-lg border border-line-strong px-3 py-1.5 font-semibold text-body">
                  Anterior
                </Link>
              ) : null}
              {pagina < totalPaginas ? (
                <Link href={comFiltro({ pagina: String(pagina + 1) })} className="rounded-lg border border-line-strong px-3 py-1.5 font-semibold text-body">
                  Próxima
                </Link>
              ) : null}
            </div>
          </div>
        ) : null}
      </SectionCard>

      {pedidosSemNota.length > 0 ? (
        <SectionCard eyebrow="Pendente" title="Pedidos entregues ainda sem nota">
          <p className="mb-3 text-sm text-muted">
            Entregue e sem nota é o que vira correria no fim do mês.
          </p>
          <ul className="space-y-2">
            {pedidosSemNota.map((pedido) => (
              <li key={pedido.id}>
                <Link
                  href={`/pedidos/${pedido.id}`}
                  className="flex items-center justify-between gap-3 rounded-lg border border-line bg-canvas px-3 py-2 text-sm transition hover:bg-tint"
                >
                  <span>
                    <span className="font-mono font-semibold text-muted">#{pedido.number}</span>
                    <span className="ml-2 font-medium">{pedido.client.name}</span>
                  </span>
                  <span className="tabular-nums text-muted">{centsToCurrency(pedido.totalAmountInCents)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </SectionCard>
      ) : null}
    </AppShell>
  );
}
