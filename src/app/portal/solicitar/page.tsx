import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PortalHeader } from "@/components/portal/portal-header";
import { RequestForm } from "@/components/portal/request-form";
import { requirePortalClient } from "@/lib/client-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function PortalRequestPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  const client = await requirePortalClient();
  const { ref } = await searchParams;

  // Se veio de "pedir mais dessa peça", confirma que o pedido é do próprio cliente.
  let referenceOrderId: string | undefined;
  let referenceLabel: string | undefined;
  if (ref) {
    const order = await prisma.order.findFirst({
      where: { id: ref, clientId: client.id },
      select: { id: true, number: true, items: { select: { description: true }, take: 1 } },
    });
    if (order) {
      referenceOrderId = order.id;
      referenceLabel = `#${order.number}${order.items[0] ? ` · ${order.items[0].description}` : ""}`;
    }
  }

  return (
    <div className="min-h-[100dvh] bg-shell text-fg">
      <PortalHeader companyName={client.companyName} clientName={client.name} />

      <main className="mx-auto max-w-xl space-y-5 px-4 py-6">
        <Link href="/portal" className="inline-flex items-center gap-2 text-sm font-semibold text-body hover:text-primary">
          <ArrowLeft size={16} aria-hidden="true" />
          Voltar
        </Link>

        <div>
          <h1 className="text-xl font-semibold">{referenceLabel ? "Pedir mais dessa peça" : "Nova solicitação"}</h1>
          <p className="mt-1 text-sm text-muted">
            A confecção recebe seu pedido, avalia e responde se aceita. Você acompanha tudo por aqui.
          </p>
        </div>

        <div className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
          <RequestForm referenceOrderId={referenceOrderId} referenceLabel={referenceLabel} />
        </div>
      </main>
    </div>
  );
}
