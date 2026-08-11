import { CheckCircle2, Clock, Inbox, RefreshCw, XCircle } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { SectionCard } from "@/components/section-card";
import { ToastForm } from "@/components/toast-form";
import { acceptRequestAction, rejectRequestAction } from "@/app/solicitacoes/actions";
import { requireRouteUser } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const answeredBadge: Record<string, { label: string; className: string; icon: typeof CheckCircle2 }> = {
  ACCEPTED: { label: "Aceita", className: "bg-primary-soft text-primary-dark", icon: CheckCircle2 },
  REJECTED: { label: "Recusada", className: "bg-danger-soft text-danger-dark", icon: XCircle },
};

export default async function SolicitacoesPage() {
  const user = await requireRouteUser("/solicitacoes");

  const requests = await prisma.orderRequest.findMany({
    where: { companyId: user.companyId },
    orderBy: { createdAt: "desc" },
    include: { client: { select: { name: true } } },
  });

  const pending = requests.filter((request) => request.status === "PENDING");
  const answered = requests.filter((request) => request.status !== "PENDING");

  return (
    <AppShell eyebrow="Portal do cliente" title="Solicitações" user={user}>
      <SectionCard
        eyebrow="Caixa de entrada"
        title="Aguardando sua avaliação"
        action={<span className="rounded-lg bg-warning-soft px-3 py-2 text-sm font-semibold text-[#544d43]">{pending.length} pendente(s)</span>}
      >
        {pending.length === 0 ? (
          <div className="rounded-lg border border-dashed border-line-strong bg-canvas p-8 text-center">
            <Inbox className="mx-auto text-faint" size={28} aria-hidden="true" />
            <p className="mt-2 text-sm text-muted">Nenhuma solicitação nova. Elas aparecem aqui quando um cliente envia pelo portal.</p>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {pending.map((request) => (
              <article key={request.id} className="rounded-xl border border-line bg-surface p-4 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-warning-soft px-2 py-1 text-xs font-semibold text-warning-ink">
                    {request.kind === "REORDER" ? <RefreshCw size={12} aria-hidden="true" /> : <Clock size={12} aria-hidden="true" />}
                    {request.kind === "REORDER" ? "Repetição" : "Nova peça"}
                  </span>
                  <span className="text-xs text-muted">{formatDateTime(request.createdAt)}</span>
                </div>

                <p className="mt-2 text-sm font-semibold">{request.client.name}</p>
                <p className="mt-1 whitespace-pre-line text-sm text-body">{request.description}</p>
                {request.quantity ? <p className="mt-1 text-sm text-muted">Quantidade: {request.quantity} un.</p> : null}

                {request.photoUrl ? (
                  <a href={request.photoUrl} target="_blank" rel="noopener noreferrer" className="mt-3 block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={request.photoUrl} alt="Foto enviada pelo cliente" className="h-40 w-full rounded-lg object-cover" />
                  </a>
                ) : null}

                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <ToastForm action={acceptRequestAction} className="space-y-2 rounded-lg border border-primary/30 bg-primary-soft p-3">
                    <input type="hidden" name="id" value={request.id} />
                    <input
                      name="note"
                      placeholder="Observação (opcional)"
                      className="h-9 w-full rounded-lg border border-line-strong px-2 text-xs outline-none ring-primary/20 transition focus:border-primary focus:ring-4"
                    />
                    <button className="flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-primary text-xs font-semibold text-white transition hover:bg-primary-dark">
                      <CheckCircle2 size={14} aria-hidden="true" />
                      Aceitar (cria rascunho)
                    </button>
                  </ToastForm>

                  <ToastForm action={rejectRequestAction} className="space-y-2 rounded-lg border border-danger-line bg-danger-soft p-3" confirm={`Recusar a solicitação de ${request.client.name}?`}>
                    <input type="hidden" name="id" value={request.id} />
                    <input
                      name="note"
                      placeholder="Motivo (opcional)"
                      className="h-9 w-full rounded-lg border border-danger-line px-2 text-xs outline-none ring-danger/20 transition focus:border-danger focus:ring-4"
                    />
                    <button className="flex h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-danger-line bg-surface text-xs font-semibold text-danger-dark transition hover:bg-danger-soft">
                      <XCircle size={14} aria-hidden="true" />
                      Recusar
                    </button>
                  </ToastForm>
                </div>
              </article>
            ))}
          </div>
        )}
      </SectionCard>

      {answered.length > 0 ? (
        <SectionCard eyebrow="Histórico" title="Solicitações respondidas">
          <ul className="divide-y divide-line">
            {answered.map((request) => {
              const badge = answeredBadge[request.status] ?? answeredBadge.REJECTED;
              const Icon = badge.icon;
              return (
                <li key={request.id} className="flex items-start justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{request.client.name}</p>
                    <p className="mt-0.5 line-clamp-2 text-sm text-muted">{request.description}</p>
                    {request.reviewNote ? <p className="mt-1 text-xs text-soft">Obs.: {request.reviewNote}</p> : null}
                  </div>
                  <span className={`inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold ${badge.className}`}>
                    <Icon size={13} aria-hidden="true" />
                    {badge.label}
                  </span>
                </li>
              );
            })}
          </ul>
        </SectionCard>
      ) : null}
    </AppShell>
  );
}
