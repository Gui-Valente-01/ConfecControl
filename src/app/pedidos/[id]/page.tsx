import { roleHasCapability } from "@/lib/capabilities";
import { comLinkAssinado } from "@/lib/anexos-link";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MessageCircle, Paperclip, Pencil, Printer } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { AttachmentUploadForm } from "@/components/attachment-upload-form";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { OrderProgressTrail } from "@/components/order-progress-trail";
import { SectionCard } from "@/components/section-card";
import { whatsappUrl } from "@/lib/whatsapp";
import { StatusBadge } from "@/components/status-badge";
import { deleteAttachmentAction, deleteOrderAction } from "@/app/pedidos/actions";
import { requireRouteUser } from "@/lib/auth";
import { canManageOrders, canSeeFinance } from "@/lib/roles";
import { centsToCurrency, formatDateTime, formatLongDate } from "@/lib/format";
import { orderStatusLabels, paymentStatusLabels } from "@/lib/status";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRouteUser("/pedidos");
  const { id } = await params;

  const order = await prisma.order.findFirst({
    where: { id, companyId: user.companyId },
    include: {
      client: true,
      currentStage: { select: { name: true } },
      partner: { select: { name: true, service: true, phone: true } },
      items: { include: { product: { select: { name: true } } } },
      services: { orderBy: { createdAt: "asc" } },
      attachments: { orderBy: { createdAt: "desc" } },
      payments: { orderBy: { createdAt: "asc" } },
      history: {
        orderBy: { changedAt: "asc" },
        include: {
          fromStage: { select: { name: true } },
          toStage: { select: { name: true } },
        },
      },
    },
  });

  if (!order) notFound();

  // O bucket e privado: o banco guarda o caminho, e a tela recebe um link que
  // expira em minutos. Feito aqui, na busca dos dados, para os componentes de
  // exibicao continuarem recebendo apenas "url".
  const anexos = await comLinkAssinado(order.attachments, user.companyId);

  const canManage = canManageOrders(user.role);
  const showFinance = canSeeFinance(user.role);
  const balanceInCents = Math.max(0, order.totalAmountInCents - order.paidAmountInCents);
  const late = order.deliveryDate && order.deliveryDate < new Date() && !["READY", "DELIVERED"].includes(order.status);

  // Link de WhatsApp com mensagem pronta de status (telefone do cliente).
  const whatsappLink = whatsappUrl(
    order.client.phone,
    `Olá ${order.client.name}! Sobre o seu pedido #${order.number}: situação atual "${orderStatusLabels[order.status]}". Qualquer dúvida estamos à disposição.`,
  );

  return (
    <AppShell eyebrow="Operação" title={`Pedido #${order.number}`} actionLabel="Novo pedido" user={user}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/pedidos" className="inline-flex h-10 items-center gap-2 rounded-lg border border-line bg-surface px-3 text-sm font-semibold text-body transition hover:bg-canvas">
          <ArrowLeft size={16} aria-hidden="true" />
          Voltar para pedidos
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          {whatsappLink ? (
            <a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#25d366] px-4 text-sm font-semibold text-white"
            >
              <MessageCircle size={16} aria-hidden="true" />
              Avisar cliente
            </a>
          ) : null}
          <a
            href={`/pedidos/${order.id}/imprimir`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-line-strong bg-surface px-4 text-sm font-semibold text-body transition hover:bg-canvas"
          >
            <Printer size={16} aria-hidden="true" />
            Imprimir / PDF
          </a>
          {canManage ? (
            <>
              <Link
                href={`/pedidos/${order.id}/editar`}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white transition hover:bg-primary-dark"
              >
                <Pencil size={16} aria-hidden="true" />
                Editar
              </Link>
              <ConfirmDeleteButton
                action={deleteOrderAction}
                id={order.id}
                variant="full"
                label="Excluir"
                message={`Excluir o pedido #${order.number}? Esta ação não pode ser desfeita.`}
              />
            </>
          ) : null}
        </div>
      </div>

      {/* Antes de qualquer detalhe: em que pé está e o que fazer agora. */}
      <OrderProgressTrail
        status={order.status}
        totalAmountInCents={order.totalAmountInCents}
        paidAmountInCents={order.paidAmountInCents}
        etapaAtual={order.currentStage?.name ?? null}
        podeAvancar={canManage}
      />

      <SectionCard eyebrow="Resumo" title={order.client.name}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-xs font-medium text-muted">Status da produção</p>
            <p className="mt-1"><StatusBadge tone="dark">{orderStatusLabels[order.status]}</StatusBadge></p>
            {order.currentStage ? <p className="mt-1 text-xs text-soft">Etapa: {order.currentStage.name}</p> : null}
          </div>
          {showFinance ? (
            <div>
              <p className="text-xs font-medium text-muted">Pagamento</p>
              <p className="mt-1"><StatusBadge tone={order.paymentStatus === "PAID" ? "good" : "neutral"}>{paymentStatusLabels[order.paymentStatus]}</StatusBadge></p>
              {order.paymentMethod ? <p className="mt-1 text-xs text-soft">{order.paymentMethod}</p> : null}
            </div>
          ) : null}
          <div>
            <p className="text-xs font-medium text-muted">Data do pedido</p>
            <p className="mt-1 text-sm font-medium">{formatLongDate(order.orderDate)}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted">Prazo de entrega</p>
            <p className="mt-1 text-sm font-medium">
              {formatLongDate(order.deliveryDate)} {late ? <StatusBadge tone="warn">Atrasado</StatusBadge> : null}
            </p>
          </div>
        </div>

        {showFinance ? (
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-line bg-surface p-4 shadow-sm">
              <p className="text-xs font-medium text-muted">Total</p>
              <p className="mt-1 text-2xl font-semibold">{centsToCurrency(order.totalAmountInCents)}</p>
            </div>
            <div className="rounded-lg border border-line bg-surface p-4 shadow-sm">
              <p className="text-xs font-medium text-muted">Pago</p>
              <p className="mt-1 text-2xl font-semibold text-primary-dark">{centsToCurrency(order.paidAmountInCents)}</p>
            </div>
            <div className="rounded-lg border border-line bg-surface p-4 shadow-sm">
              <p className="text-xs font-medium text-muted">Saldo</p>
              <p className="mt-1 text-2xl font-semibold text-danger-dark">{centsToCurrency(balanceInCents)}</p>
            </div>
          </div>
        ) : null}

        {order.client.phone || order.client.contact ? (
          <p className="mt-4 text-sm text-muted">
            Contato: {[order.client.contact, order.client.phone].filter(Boolean).join(" - ")}
          </p>
        ) : null}

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-line bg-surface p-3 shadow-sm">
            <p className="text-xs font-medium text-muted">Responsável na produção</p>
            <p className="mt-1 text-sm font-medium">{order.assignee || "Não definido"}</p>
          </div>
          <div className="rounded-lg border border-line bg-surface p-3 shadow-sm">
            <p className="text-xs font-medium text-muted">Terceirizada</p>
            {order.partner ? (
              <p className="mt-1 text-sm font-medium">
                {order.partner.name}
                {order.partner.service ? <span className="text-soft"> - {order.partner.service}</span> : null}
                {order.partner.phone ? <span className="block text-xs text-soft">{order.partner.phone}</span> : null}
              </p>
            ) : (
              <p className="mt-1 text-sm text-soft">Nenhuma</p>
            )}
          </div>
        </div>
      </SectionCard>

      <SectionCard
        eyebrow="Itens"
        title={`${order.items.length} item(ns)${order.services.length ? ` + ${order.services.length} serviço(s)` : ""}`}
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-separate border-spacing-0 text-left text-sm">
            <thead>
              <tr className="text-muted">
                <th className="border-b border-line pb-3 font-semibold">Descrição</th>
                <th className="border-b border-line pb-3 font-semibold">Tam./Cor</th>
                <th className="border-b border-line pb-3 text-right font-semibold">Qtd.</th>
                {showFinance ? <th className="border-b border-line pb-3 text-right font-semibold">Preço un.</th> : null}
                {showFinance ? <th className="border-b border-line pb-3 text-right font-semibold">Total</th> : null}
              </tr>
            </thead>
            <tbody>
              {order.items.map((item) => (
                <tr key={item.id} className="transition hover:bg-canvas">
                  <td className="border-b border-divider py-3 font-medium">
                    {item.description}
                    {item.product ? <span className="ml-1 text-xs text-soft">({item.product.name})</span> : null}
                  </td>
                  <td className="border-b border-divider py-3 text-muted">{[item.size, item.color].filter(Boolean).join(" / ") || "-"}</td>
                  <td className="border-b border-divider py-3 text-right">{item.quantity}</td>
                  {showFinance ? <td className="border-b border-divider py-3 text-right">{centsToCurrency(item.unitPriceInCents)}</td> : null}
                  {showFinance ? <td className="border-b border-divider py-3 text-right font-semibold">{centsToCurrency(item.totalPriceInCents)}</td> : null}
                </tr>
              ))}
              {order.services.map((service) => (
                <tr key={service.id} className="transition hover:bg-canvas">
                  <td className="border-b border-divider py-3 font-medium">
                    {service.name}
                    <span className="ml-1 text-xs text-soft">(serviço)</span>
                  </td>
                  <td className="border-b border-divider py-3 text-muted">-</td>
                  <td className="border-b border-divider py-3 text-right">-</td>
                  {showFinance ? <td className="border-b border-divider py-3 text-right">-</td> : null}
                  {showFinance ? <td className="border-b border-divider py-3 text-right font-semibold">{centsToCurrency(service.priceInCents)}</td> : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <div className={`grid gap-6 ${showFinance ? "lg:grid-cols-2" : ""}`}>
        {showFinance ? (
          <SectionCard eyebrow="Financeiro" title="Pagamentos">
            {order.payments.length === 0 ? (
              <p className="text-sm text-muted">Nenhum pagamento registrado.</p>
            ) : (
              <ul className="space-y-3">
                {order.payments.map((payment) => (
                  <li key={payment.id} className="flex items-center justify-between rounded-lg border border-line bg-surface px-4 py-3 shadow-sm">
                    <div>
                      <p className="font-semibold">{centsToCurrency(payment.amountInCents)}</p>
                      <p className="text-xs text-soft">
                        {payment.method ?? "Sem forma definida"}
                        {payment.paidAt ? ` - pago em ${formatLongDate(payment.paidAt)}` : ""}
                      </p>
                    </div>
                    <StatusBadge tone={payment.status === "PAID" ? "good" : "neutral"}>{paymentStatusLabels[payment.status]}</StatusBadge>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        ) : null}

        <SectionCard eyebrow="Produção" title="Histórico de etapas">
          <ul className="space-y-3">
            <li className="flex gap-3">
              <div className="mt-1 size-2.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
              <div>
                <p className="text-sm font-medium">Pedido criado</p>
                <p className="text-xs text-soft">{formatDateTime(order.createdAt)}</p>
              </div>
            </li>
            {order.history.map((entry) => (
              <li key={entry.id} className="flex gap-3">
                <div className="mt-1 size-2.5 shrink-0 rounded-full bg-warning" aria-hidden="true" />
                <div>
                  <p className="text-sm font-medium">
                    {entry.fromStage ? `${entry.fromStage.name} -> ` : ""}{entry.toStage.name}
                  </p>
                  <p className="text-xs text-soft">{formatDateTime(entry.changedAt)}</p>
                  {entry.note ? <p className="mt-0.5 text-xs text-muted">{entry.note}</p> : null}
                </div>
              </li>
            ))}
            {order.history.length === 0 ? (
              <li className="text-sm text-muted">Pedido ainda na etapa inicial.</li>
            ) : null}
          </ul>
        </SectionCard>
      </div>

      {order.internalNotes ? (
        <SectionCard eyebrow="Anotações" title="Observações internas">
          <p className="whitespace-pre-line text-sm leading-6 text-body">{order.internalNotes}</p>
        </SectionCard>
      ) : null}

      <SectionCard eyebrow="Arquivos" title="Anexos (arte, molde, foto)">
        {canManage ? <AttachmentUploadForm orderId={order.id} /> : null}

        {anexos.length === 0 ? (
          <p className={`text-sm text-soft ${canManage ? "mt-4" : ""}`}>Nenhum anexo neste pedido.</p>
        ) : (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {anexos.map((attachment) => {
              const isImage = (attachment.type ?? "").startsWith("image/");
              return (
                <li key={attachment.id} className="rounded-lg border border-line bg-surface p-3 shadow-sm transition hover:border-line-strong">
                  <a href={attachment.url} target="_blank" rel="noopener noreferrer" className="block">
                    {isImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={attachment.url} alt={attachment.name} className="mb-2 h-28 w-full rounded-md object-cover" />
                    ) : (
                      <div className="mb-2 flex h-28 items-center justify-center rounded-md bg-surface text-muted">
                        <Paperclip size={24} aria-hidden="true" />
                      </div>
                    )}
                    <span className="block truncate text-sm font-medium text-body" title={attachment.name}>{attachment.name}</span>
                  </a>
                  {canManage ? (
                    <div className="mt-2 flex justify-end">
                      <ConfirmDeleteButton
                        action={deleteAttachmentAction}
                        id={attachment.id}
                        title="Remover anexo"
                        message={`Remover o anexo ${attachment.name}?`}
                      />
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </SectionCard>
    </AppShell>
  );
}
