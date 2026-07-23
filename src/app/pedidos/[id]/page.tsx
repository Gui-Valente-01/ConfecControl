import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MessageCircle, Paperclip, Pencil, Printer } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { AttachmentUploadForm } from "@/components/attachment-upload-form";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { SectionCard } from "@/components/section-card";
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

  const canManage = canManageOrders(user.role);
  const showFinance = canSeeFinance(user.role);
  const balanceInCents = Math.max(0, order.totalAmountInCents - order.paidAmountInCents);
  const late = order.deliveryDate && order.deliveryDate < new Date() && !["READY", "DELIVERED"].includes(order.status);

  // Link de WhatsApp com mensagem pronta de status (telefone do cliente).
  const phoneDigits = (order.client.phone ?? "").replace(/\D/g, "");
  const whatsappPhone = phoneDigits ? (phoneDigits.length <= 11 ? `55${phoneDigits}` : phoneDigits) : "";
  const whatsappMessage = encodeURIComponent(
    `Olá ${order.client.name}! Sobre o seu pedido #${order.number}: situação atual "${orderStatusLabels[order.status]}". Qualquer dúvida estamos à disposição.`,
  );
  const whatsappUrl = whatsappPhone ? `https://wa.me/${whatsappPhone}?text=${whatsappMessage}` : null;

  return (
    <AppShell eyebrow="Operação" title={`Pedido #${order.number}`} actionLabel="Novo pedido" user={user}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/pedidos" className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#d9e1dd] bg-white px-3 text-sm font-semibold text-[#405047] transition hover:bg-[#f8faf9]">
          <ArrowLeft size={16} aria-hidden="true" />
          Voltar para pedidos
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          {whatsappUrl ? (
            <a
              href={whatsappUrl}
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
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#c7d3ce] bg-white px-4 text-sm font-semibold text-[#405047] transition hover:bg-[#f8faf9]"
          >
            <Printer size={16} aria-hidden="true" />
            Imprimir / PDF
          </a>
          {canManage ? (
            <>
              <Link
                href={`/pedidos/${order.id}/editar`}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#087f7d] px-4 text-sm font-semibold text-white transition hover:bg-[#05605e]"
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

      <SectionCard eyebrow="Resumo" title={order.client.name}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-xs font-medium text-[#63736b]">Status da produção</p>
            <p className="mt-1"><StatusBadge tone="dark">{orderStatusLabels[order.status]}</StatusBadge></p>
            {order.currentStage ? <p className="mt-1 text-xs text-[#8a9890]">Etapa: {order.currentStage.name}</p> : null}
          </div>
          {showFinance ? (
            <div>
              <p className="text-xs font-medium text-[#63736b]">Pagamento</p>
              <p className="mt-1"><StatusBadge tone={order.paymentStatus === "PAID" ? "good" : "neutral"}>{paymentStatusLabels[order.paymentStatus]}</StatusBadge></p>
              {order.paymentMethod ? <p className="mt-1 text-xs text-[#8a9890]">{order.paymentMethod}</p> : null}
            </div>
          ) : null}
          <div>
            <p className="text-xs font-medium text-[#63736b]">Data do pedido</p>
            <p className="mt-1 text-sm font-medium">{formatLongDate(order.orderDate)}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-[#63736b]">Prazo de entrega</p>
            <p className="mt-1 text-sm font-medium">
              {formatLongDate(order.deliveryDate)} {late ? <StatusBadge tone="warn">Atrasado</StatusBadge> : null}
            </p>
          </div>
        </div>

        {showFinance ? (
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-[#d9e1dd] bg-white p-4 shadow-sm">
              <p className="text-xs font-medium text-[#63736b]">Total</p>
              <p className="mt-1 text-2xl font-semibold">{centsToCurrency(order.totalAmountInCents)}</p>
            </div>
            <div className="rounded-lg border border-[#d9e1dd] bg-white p-4 shadow-sm">
              <p className="text-xs font-medium text-[#63736b]">Pago</p>
              <p className="mt-1 text-2xl font-semibold text-[#05605e]">{centsToCurrency(order.paidAmountInCents)}</p>
            </div>
            <div className="rounded-lg border border-[#d9e1dd] bg-white p-4 shadow-sm">
              <p className="text-xs font-medium text-[#63736b]">Saldo</p>
              <p className="mt-1 text-2xl font-semibold text-[#9f2f42]">{centsToCurrency(balanceInCents)}</p>
            </div>
          </div>
        ) : null}

        {order.client.phone || order.client.contact ? (
          <p className="mt-4 text-sm text-[#66756d]">
            Contato: {[order.client.contact, order.client.phone].filter(Boolean).join(" - ")}
          </p>
        ) : null}

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-[#d9e1dd] bg-white p-3 shadow-sm">
            <p className="text-xs font-medium text-[#63736b]">Responsável na produção</p>
            <p className="mt-1 text-sm font-medium">{order.assignee || "Não definido"}</p>
          </div>
          <div className="rounded-lg border border-[#d9e1dd] bg-white p-3 shadow-sm">
            <p className="text-xs font-medium text-[#63736b]">Terceirizada</p>
            {order.partner ? (
              <p className="mt-1 text-sm font-medium">
                {order.partner.name}
                {order.partner.service ? <span className="text-[#8a9890]"> - {order.partner.service}</span> : null}
                {order.partner.phone ? <span className="block text-xs text-[#8a9890]">{order.partner.phone}</span> : null}
              </p>
            ) : (
              <p className="mt-1 text-sm text-[#8a9890]">Nenhuma</p>
            )}
          </div>
        </div>
      </SectionCard>

      <SectionCard eyebrow="Itens" title={`${order.items.length} item(ns)`}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-separate border-spacing-0 text-left text-sm">
            <thead>
              <tr className="text-[#63736b]">
                <th className="border-b border-[#d9e1dd] pb-3 font-semibold">Descrição</th>
                <th className="border-b border-[#d9e1dd] pb-3 font-semibold">Tam./Cor</th>
                <th className="border-b border-[#d9e1dd] pb-3 text-right font-semibold">Qtd.</th>
                {showFinance ? <th className="border-b border-[#d9e1dd] pb-3 text-right font-semibold">Preço un.</th> : null}
                {showFinance ? <th className="border-b border-[#d9e1dd] pb-3 text-right font-semibold">Total</th> : null}
              </tr>
            </thead>
            <tbody>
              {order.items.map((item) => (
                <tr key={item.id} className="transition hover:bg-[#f8faf9]">
                  <td className="border-b border-[#edf2ef] py-3 font-medium">
                    {item.description}
                    {item.product ? <span className="ml-1 text-xs text-[#8a9890]">({item.product.name})</span> : null}
                  </td>
                  <td className="border-b border-[#edf2ef] py-3 text-[#66756d]">{[item.size, item.color].filter(Boolean).join(" / ") || "-"}</td>
                  <td className="border-b border-[#edf2ef] py-3 text-right">{item.quantity}</td>
                  {showFinance ? <td className="border-b border-[#edf2ef] py-3 text-right">{centsToCurrency(item.unitPriceInCents)}</td> : null}
                  {showFinance ? <td className="border-b border-[#edf2ef] py-3 text-right font-semibold">{centsToCurrency(item.totalPriceInCents)}</td> : null}
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
              <p className="text-sm text-[#66756d]">Nenhum pagamento registrado.</p>
            ) : (
              <ul className="space-y-3">
                {order.payments.map((payment) => (
                  <li key={payment.id} className="flex items-center justify-between rounded-lg border border-[#d9e1dd] bg-white px-4 py-3 shadow-sm">
                    <div>
                      <p className="font-semibold">{centsToCurrency(payment.amountInCents)}</p>
                      <p className="text-xs text-[#8a9890]">
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
              <div className="mt-1 size-2.5 shrink-0 rounded-full bg-[#087f7d]" aria-hidden="true" />
              <div>
                <p className="text-sm font-medium">Pedido criado</p>
                <p className="text-xs text-[#8a9890]">{formatDateTime(order.createdAt)}</p>
              </div>
            </li>
            {order.history.map((entry) => (
              <li key={entry.id} className="flex gap-3">
                <div className="mt-1 size-2.5 shrink-0 rounded-full bg-[#c88a2b]" aria-hidden="true" />
                <div>
                  <p className="text-sm font-medium">
                    {entry.fromStage ? `${entry.fromStage.name} -> ` : ""}{entry.toStage.name}
                  </p>
                  <p className="text-xs text-[#8a9890]">{formatDateTime(entry.changedAt)}</p>
                  {entry.note ? <p className="mt-0.5 text-xs text-[#66756d]">{entry.note}</p> : null}
                </div>
              </li>
            ))}
            {order.history.length === 0 ? (
              <li className="text-sm text-[#66756d]">Pedido ainda na etapa inicial.</li>
            ) : null}
          </ul>
        </SectionCard>
      </div>

      {order.internalNotes ? (
        <SectionCard eyebrow="Anotações" title="Observações internas">
          <p className="whitespace-pre-line text-sm leading-6 text-[#405047]">{order.internalNotes}</p>
        </SectionCard>
      ) : null}

      <SectionCard eyebrow="Arquivos" title="Anexos (arte, molde, foto)">
        {canManage ? <AttachmentUploadForm orderId={order.id} /> : null}

        {order.attachments.length === 0 ? (
          <p className={`text-sm text-[#8a9890] ${canManage ? "mt-4" : ""}`}>Nenhum anexo neste pedido.</p>
        ) : (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {order.attachments.map((attachment) => {
              const isImage = (attachment.type ?? "").startsWith("image/");
              return (
                <li key={attachment.id} className="rounded-lg border border-[#d9e1dd] bg-white p-3 shadow-sm transition hover:border-[#c7d3ce]">
                  <a href={attachment.url} target="_blank" rel="noopener noreferrer" className="block">
                    {isImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={attachment.url} alt={attachment.name} className="mb-2 h-28 w-full rounded-md object-cover" />
                    ) : (
                      <div className="mb-2 flex h-28 items-center justify-center rounded-md bg-white text-[#63736b]">
                        <Paperclip size={24} aria-hidden="true" />
                      </div>
                    )}
                    <span className="block truncate text-sm font-medium text-[#405047]" title={attachment.name}>{attachment.name}</span>
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
