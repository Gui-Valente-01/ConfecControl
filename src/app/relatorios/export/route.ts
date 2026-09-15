import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { userWithCapability } from "@/lib/auth";
import { resolverPeriodo } from "@/lib/relatorio";
import { orderStatusLabels, paymentStatusLabels } from "@/lib/status";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function csvCell(value: string | number) {
  const text = String(value).replace(/"/g, '""');
  return `"${text}"`;
}

// Data no calendário de Brasília: o servidor roda em UTC, e o pedido lançado
// às 22h saía na planilha com a data do dia seguinte.
function formatDate(date: Date | null) {
  return date ? date.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "";
}

export async function GET(req: NextRequest) {
  // Exportar e ler o financeiro em arquivo, entao exige a MESMA permissao da
  // tela -- e nao apenas estar logado. Sem isto, qualquer pessoa da empresa
  // baixava o total e o pago de todos os pedidos digitando a URL, inclusive a
  // Producao, que o sistema proibe de ver dinheiro.
  const user = await userWithCapability("reports.export");
  if (!user) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Mesmo período da tela, pelas mesmas regras (Brasília, dia inteiro). Sem
  // datas, a planilha traz todos os pedidos.
  const from = req.nextUrl.searchParams.get("from");
  const to = req.nextUrl.searchParams.get("to");
  const preset = req.nextUrl.searchParams.get("preset");
  const temPeriodo = Boolean(from || to || preset);
  const periodo = temPeriodo ? resolverPeriodo({ from, to, preset }) : null;
  const fromDate = periodo?.de;
  const toDate = periodo?.ate;

  const orders = await prisma.order.findMany({
    where: {
      companyId: user.companyId,
      ...(fromDate || toDate ? { orderDate: { gte: fromDate, lte: toDate } } : {}),
    },
    orderBy: { number: "asc" },
    include: { client: { select: { name: true } } },
  });

  const header = ["Pedido", "Cliente", "Data", "Prazo", "Status", "Pagamento", "Total (R$)", "Pago (R$)"];
  const rows = orders.map((order) => [
    order.number,
    order.client.name,
    formatDate(order.orderDate),
    formatDate(order.deliveryDate),
    orderStatusLabels[order.status],
    paymentStatusLabels[order.paymentStatus],
    (order.totalAmountInCents / 100).toFixed(2).replace(".", ","),
    (order.paidAmountInCents / 100).toFixed(2).replace(".", ","),
  ]);

  const csv = [header, ...rows].map((line) => line.map(csvCell).join(";")).join("\r\n");
  const body = `﻿${csv}`; // BOM para o Excel reconhecer UTF-8

  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="pedidos-confeccontrol.csv"`,
    },
  });
}
