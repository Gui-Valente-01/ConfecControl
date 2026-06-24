import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MessageCircle, Paperclip, Pencil, Printer, Upload } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { SectionCard } from "@/components/section-card";
import { StatusBadge } from "@/components/status-badge";
import { ToastForm } from "@/components/toast-form";
import { deleteAttachmentAction, deleteOrderAction, uploadAttachmentAction } from "@/app/pedidos/actions";
import { requireRouteUser } from "@/lib/auth";
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

  const balanceInCents = Math.max(0, order.totalAmountInCents - order.paidAmountInCents);
  const late = order.deliveryDate && order.deliveryDate < new Date() && !["READY", "DELIVERED"].includes(order.status);

  // Link de WhatsApp com mensagem pronta de status (telefone do cliente).
  const phoneDigits = (order.client.phone ?? "").replace(/\D/g, "");
  const whatsappPhone = phoneDigits ? (phoneDigits.length <= 11 ? `55${phoneDigits}` : phoneDigits) : "";
  const whatsappMessage = encodeURIComponent(
    `Ola ${order.client.name}! Sobre o seu pedido #${order.number}: situação atual "${orderStatusLabels[order.status]}". Qualquer duvida estamos a disposição.`,
  );
  const whatsappUrl = whatsappPhone ? `https://wa.me/${whatsappPhone}?text=${whatsappMessage}` : null;

  return (
    <AppShell eyebrow="Operação" title={`Pedido #${order.number}`} actionLabel="Novo pedido" user={user}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/pedidos" className="inline-flex items-center gap-2 text-sm font-semibold text-[#544d43] hover:underline">
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
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#d8cfbf] px-4 text-sm font-semibold text-[#544d43]"
          >
            <Printer size={16} aria-hidden="true" />
            Imprimir / PDF
          </a>
          <Link
            href={`/pedidos/${order.id}/editar`}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#1d1b16] px-4 text-sm font-semibold text-white"
          >
            <Pencil size={16} aria-hidden="true" />
            Editar
          </Link>
          <ConfirmDeleteButton
            action={deleteOrderAction}
            id={order.id}
            variant="full"
            label="Excluir"
            message={`Excluir o pedido #${order.number}? Esta acao não pode ser desfeita.`}
          />
        </div>
      </div>

      <SectionCard eyebrow="Resumo" title={order.client.name}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-xs font-medium text-[#766d5d]">Status da produção</p>
            <p className="mt-1"><StatusBadge tone="dark">{orderStatusLabels[order.status]}</StatusBadge></p>
            {order.currentStage ? <p className="mt-1 text-xs text-[#9a9285]">Etapa: {order.currentStage.name}</p> : null}
          </div>
          <div>
            <p className="text-xs font-medium text-[#766d5d]">Pagamento</p>
            <p className="mt-1"><StatusBadge tone={order.paymentStatus === "PAID" ? "good" : "neutral"}>{paymentStatusLabels[order.paymentStatus]}</StatusBadge></p>
            {order.paymentMethod ? <p className="mt-1 text-xs text-[#9a9285]">{order.paymentMethod}</p> : null}
          </div>
          <div>
            <p className="text-xs font-medium text-[#766d5d]">Data do pedido</p>
            <p className="mt-1 text-sm font-medium">{formatLongDate(order.orderDate)}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-[#766d5d]">Prazo de entrega</p>
            <p className="mt-1 text-sm font-medium">
              {formatLongDate(order.deliveryDate)} {late ? <StatusBadge tone="warn">Atrasado</StatusBadge> : null}
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-[#e3dbcd] bg-[#fbf8f1] p-4">
            <p className="text-xs font-medium text-[#766d5d]">Total</p>
            <p className="mt-1 text-2xl font-semibold">{centsToCurrency(order.totalAmountInCents)}</p>
          </div>
          <div className="rounded-lg border border-[#e3dbcd] bg-[#fbf8f1] p-4">
            <p className="text-xs font-medium text-[#766d5d]">Pago</p>
            <p className="mt-1 text-2xl font-semibold text-[#0f696b]">{centsToCurrency(order.paidAmountInCents)}</p>
          </div>
          <div className="rounded-lg border border-[#e3dbcd] bg-[#fbf8f1] p-4">
            <p className="text-xs font-medium text-[#766d5d]">Saldo</p>
            <p className="mt-1 text-2xl font-semibold text-[#b23647]">{centsToCurrency(balanceInCents)}</p>
          </div>
        </div>

        {order.client.phone || order.client.contact ? (
          <p className="mt-4 text-sm text-[#6f675b]">
            Contato: {[order.client.contact, order.client.phone].filter(Boolean).join(" - ")}
          </p>
        ) : null}

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-[#e3dbcd] bg-[#fbf8f1] p-3">
            <p className="text-xs font-medium text-[#766d5d]">Responsável na produção</p>
            <p className="mt-1 text-sm font-medium">{order.assignee || "Não definido"}</p>
          </div>
          <div className="rounded-lg border border-[#e3dbcd] bg-[#fbf8f1] p-3">
            <p className="text-xs font-medium text-[#766d5d]">Terceirizada</p>
            {order.partner ? (
              <p className="mt-1 text-sm font-medium">
                {order.partner.name}
                {order.partner.service ? <span className="text-[#9a9285]"> - {order.partner.service}</span> : null}
                {order.partner.phone ? <span className="block text-xs text-[#9a9285]">{order.partner.phone}</span> : null}
              </p>
            ) : (
              <p className="mt-1 text-sm text-[#9a9285]">Nenhuma</p>
            )}
          </div>
        </div>
      </SectionCard>

      <SectionCard eyebrow="Itens" title={`${order.items.length} item(ns)`}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-separate border-spacing-0 text-left text-sm">
            <thead>
              <tr className="text-[#766d5d]">
                <th className="border-b border-[#ded7ca] pb-3 font-semibold">Descrição</th>
                <th className="border-b border-[#ded7ca] pb-3 font-semibold">Tam./Cor</th>
                <th className="border-b border-[#ded7ca] pb-3 text-right font-semibold">Qtd.</th>
                <th className="border-b border-[#ded7ca] pb-3 text-right font-semibold">Preço un.</th>
                <th className="border-b border-[#ded7ca] pb-3 text-right font-semibold">Total</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item) => (
                <tr key={item.id}>
                  <td className="border-b border-[#eee8dc] py-3 font-medium">
                    {item.description}
                    {item.product ? <span className="ml-1 text-xs text-[#9a9285]">({item.product.name})</span> : null}
                  </td>
                  <td className="border-b border-[#eee8dc] py-3 text-[#6f675b]">{[item.size, item.color].filter(Boolean).join(" / ") || "-"}</td>
                  <td className="border-b border-[#eee8dc] py-3 text-right">{item.quantity}</td>
                  <td className="border-b border-[#eee8dc] py-3 text-right">{centsToCurrency(item.unitPriceInCents)}</td>
                  <td className="border-b border-[#eee8dc] py-3 text-right font-semibold">{centsToCurrency(item.totalPriceInCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard eyebrow="Financeiro" title="Pagamentos">
          {order.payments.length === 0 ? (
            <p className="text-sm text-[#6f675b]">Nenhum pagamento registrado.</p>
          ) : (
            <ul className="space-y-3">
              {order.payments.map((payment) => (
                <li key={payment.id} className="flex items-center justify-between rounded-lg border border-[#e3dbcd] bg-[#fbf8f1] px-4 py-3">
                  <div>
                    <p className="font-semibold">{centsToCurrency(payment.amountInCents)}</p>
                    <p className="text-xs text-[#9a9285]">
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

        <SectionCard eyebrow="Produção" title="Histórico de etapas">
          <ul className="space-y-3">
            <li className="flex gap-3">
              <div className="mt-1 size-2.5 shrink-0 rounded-full bg-[#0f8b8d]" aria-hidden="true" />
              <div>
                <p className="text-sm font-medium">Pedido criado</p>
                <p className="text-xs text-[#9a9285]">{formatDateTime(order.createdAt)}</p>
              </div>
            </li>
            {order.history.map((entry) => (
              <li key={entry.id} className="flex gap-3">
                <div className="mt-1 size-2.5 shrink-0 rounded-full bg-[#edae49]" aria-hidden="true" />
                <div>
                  <p className="text-sm font-medium">
                    {entry.fromStage ? `${entry.fromStage.name} -> ` : ""}{entry.toStage.name}
                  </p>
                  <p className="text-xs text-[#9a9285]">{formatDateTime(entry.changedAt)}</p>
                  {entry.note ? <p className="mt-0.5 text-xs text-[#6f675b]">{entry.note}</p> : null}
                </div>
              </li>
            ))}
            {order.history.length === 0 ? (
              <li className="text-sm text-[#6f675b]">Pedido ainda na etapa inicial.</li>
            ) : null}
          </ul>
        </SectionCard>
      </div>

      {order.internalNotes ? (
        <SectionCard eyebrow="Anotações" title="Observações internas">
          <p className="whitespace-pre-line text-sm leading-6 text-[#544d43]">{order.internalNotes}</p>
        </SectionCard>
      ) : null}

      <SectionCard eyebrow="Arquivos" title="Anexos (arte, molde, foto)">
        <ToastForm action={uploadAttachmentAction} message="Anexo enviado." className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="orderId" value={order.id} />
          <input
            type="file"
            name="file"
            required
            className="text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-[#1d1b16] file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white"
          />
          <button className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#d8cfbf] px-4 text-sm font-semibold text-[#544d43]">
            <Upload size={16} aria-hidden="true" />
            Enviar
          </button>
        </ToastForm>

        {order.attachments.length === 0 ? (
          <p className="mt-4 text-sm text-[#9a9285]">Nenhum anexo. Envie a arte, o molde ou uma foto de referência (até 8 MB).</p>
        ) : (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {order.attachments.map((attachment) => {
              const isImage = (attachment.type ?? "").startsWith("image/");
              return (
                <li key={attachment.id} className="rounded-lg border border-[#e3dbcd] bg-[#fbf8f1] p-3">
                  <a href={attachment.url} target="_blank" rel="noopener noreferrer" className="block">
                    {isImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={attachment.url} alt={attachment.name} className="mb-2 h-28 w-full rounded-md object-cover" />
                    ) : (
                      <div className="mb-2 flex h-28 items-center justify-center rounded-md bg-white text-[#766d5d]">
                        <Paperclip size={24} aria-hidden="true" />
                      </div>
                    )}
                    <span className="block truncate text-sm font-medium text-[#544d43]" title={attachment.name}>{attachment.name}</span>
                  </a>
                  <div className="mt-2 flex justify-end">
                    <ConfirmDeleteButton
                      action={deleteAttachmentAction}
                      id={attachment.id}
                      title="Remover anexo"
                      message={`Remover o anexo ${attachment.name}?`}
                      toastMessage="Anexo removido."
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </SectionCard>
    </AppShell>
  );
}
