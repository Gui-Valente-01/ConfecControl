import { AppShell } from "@/components/app-shell";
import { DbFinanceManager } from "@/components/db-finance-manager";
import { requireRouteUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function FinanceiroPage() {
  const user = await requireRouteUser("/financeiro");
  const payments = await prisma.payment.findMany({
    where: {
      order: { companyId: user.companyId },
    },
    orderBy: { createdAt: "desc" },
    include: {
      order: {
        select: {
          number: true,
          paidAmountInCents: true,
          deliveryDate: true,
          client: { select: { name: true, phone: true } },
        },
      },
    },
  });

  return (
    <AppShell eyebrow="Caixa" title="Financeiro" actionLabel="Registrar pagamento" user={user}>
      <DbFinanceManager payments={payments} />
    </AppShell>
  );
}
