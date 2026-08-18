import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { DbDashboard } from "@/components/db-dashboard";
import { LandingPage } from "@/components/landing/landing-page";
import { PrimeirosPassos } from "@/components/primeiros-passos";
import { getSessionUser } from "@/lib/auth";
import { planHasFeature } from "@/lib/features";
import { canManageOrders, canSeeFinance } from "@/lib/roles";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// O mesmo site responde em confeccontrol.com, no www e no endereço da Vercel.
// Sem dizer qual é o oficial, o Google trata como três sites iguais e divide a
// relevância entre eles — ou escolhe sozinho, e às vezes escolhe o de teste.
export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default async function Home() {
  // Visitante sem sessão vê a página de apresentação; usuário logado vê o painel.
  const user = await getSessionUser();
  if (!user) return <LandingPage />;
  const [orders, stages, products, pedidosMovidos, recebimentos] = await Promise.all([
    prisma.order.findMany({
      where: { companyId: user.companyId },
      orderBy: { createdAt: "desc" },
      include: {
        client: { select: { name: true } },
        items: { select: { description: true, quantity: true } },
      },
    }),
    prisma.productionStage.findMany({
      where: { companyId: user.companyId, active: true },
      orderBy: { position: "asc" },
      include: {
        currentOrders: {
          orderBy: { deliveryDate: "asc" },
          include: {
            client: { select: { name: true } },
            items: { select: { description: true, quantity: true } },
          },
        },
      },
    }),

    prisma.product.findMany({
      where: { companyId: user.companyId },
      select: {
        id: true,
        name: true,
        costInCents: true,
        currentQuantity: true,
        minimumQuantity: true,
      },
    }),
    // Para os primeiros passos: já moveu algum pedido de etapa? já recebeu?
    prisma.productionHistory.count({ where: { order: { companyId: user.companyId } } }),
    prisma.payment.count({ where: { order: { companyId: user.companyId } } }),
  ]);

  // Peça sem custo digitado faz a margem do relatório mentir: a venda entra
  // como lucro cheio. Desde que o estoque virou de peça pronta, o custo vem
  // de um campo só, então a checagem é direta.
  const productsWithoutCost = products.filter((p) => p.costInCents === 0).length;

  const showFinance = canSeeFinance(user.role);
  const plan = {
    producao: planHasFeature(user.features, "producao"),
    estoque: planHasFeature(user.features, "estoque"),
    financeiro: planHasFeature(user.features, "financeiro") && showFinance,
  };

  return (
    <AppShell eyebrow="Hoje" title="Painel da produção" user={user}>
      {/* Some sozinha quando os cinco passos estiverem feitos. */}
      <PrimeirosPassos
        contagens={{
          pecas: products.length,
          pecasComEstoque: products.filter((p) => p.currentQuantity > 0).length,
          pedidos: orders.length,
          pedidosMovidos,
          recebimentos,
        }}
      />
      <DbDashboard
        orders={orders}
        stages={stages}
        products={products}
        productsWithoutCost={productsWithoutCost}
        plan={plan}
        showFinance={showFinance}
        podeCriarPedido={canManageOrders(user.role)}
      />
    </AppShell>
  );
}
