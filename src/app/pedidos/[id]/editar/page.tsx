import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { OrderForm } from "@/components/order-form";
import { SectionCard } from "@/components/section-card";
import { updateOrderAction } from "@/app/pedidos/actions";
import { requireRouteUser } from "@/lib/auth";
import { dateToInputValue } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function EditOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRouteUser("/pedidos");
  const { id } = await params;

  const [order, clients, products] = await Promise.all([
    prisma.order.findFirst({
      where: { id, companyId: user.companyId },
      include: { items: true },
    }),
    prisma.client.findMany({ where: { companyId: user.companyId }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.product.findMany({
      where: { companyId: user.companyId },
      orderBy: { name: "asc" },
      select: { id: true, name: true, standardPriceInCents: true },
    }),
  ]);

  if (!order) notFound();

  const defaults = {
    clientId: order.clientId,
    deliveryDate: dateToInputValue(order.deliveryDate),
    paymentMethod: order.paymentMethod ?? "",
    paidReais: order.paidAmountInCents ? (order.paidAmountInCents / 100).toString() : "",
    internalNotes: order.internalNotes ?? "",
    items: order.items.map((item) => ({
      productId: item.productId,
      description: item.description,
      size: item.size,
      color: item.color,
      quantity: item.quantity,
      unitPriceInCents: item.unitPriceInCents,
    })),
  };

  return (
    <AppShell eyebrow="Operação" title={`Editar pedido #${order.number}`} actionLabel="Novo pedido" user={user}>
      <Link href={`/pedidos/${order.id}`} className="inline-flex items-center gap-2 text-sm font-semibold text-[#405047] hover:underline">
        <ArrowLeft size={16} aria-hidden="true" />
        Voltar para o pedido
      </Link>

      <SectionCard eyebrow="Edição" title="Dados do pedido">
        <OrderForm
          clients={clients}
          products={products}
          action={updateOrderAction}
          submitLabel="Salvar alterações"
          orderId={order.id}
          defaults={defaults}
        />
      </SectionCard>
    </AppShell>
  );
}
