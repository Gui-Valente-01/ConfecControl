import { AppShell } from "@/components/app-shell";
import { DbFinanceManager } from "@/components/db-finance-manager";
import { requireRouteUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function FinanceiroPage() {
  const user = await requireRouteUser("/financeiro");
  const companyId = user.companyId;

  // A cobrança olha pedidos (o saldo sai do total menos os recebimentos), e o
  // histórico olha recebimentos. São perguntas diferentes, com dados diferentes.
  const [orders, receipts] = await Promise.all([
    prisma.order.findMany({
      where: { companyId, status: { not: "CANCELED" } },
      select: {
        id: true,
        number: true,
        totalAmountInCents: true,
        deliveryDate: true,
        client: { select: { name: true, phone: true } },
        payments: { select: { amountInCents: true } },
      },
    }),
    prisma.payment.findMany({
      where: { order: { companyId } },
      orderBy: [{ paidAt: "desc" }, { createdAt: "desc" }],
      take: 60,
      select: {
        id: true,
        amountInCents: true,
        method: true,
        note: true,
        paidAt: true,
        order: { select: { id: true, number: true, client: { select: { name: true } } } },
      },
    }),
  ]);

  return (
    <AppShell eyebrow="Caixa" title="Financeiro" user={user}>
      <DbFinanceManager orders={orders} receipts={receipts} canDelete={user.role === "ADMIN"} />
    </AppShell>
  );
}
