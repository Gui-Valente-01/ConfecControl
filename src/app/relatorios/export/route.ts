import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { orderStatusLabels, paymentStatusLabels } from "@/lib/status";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function csvCell(value: string | number) {
  const text = String(value).replace(/"/g, '""');
  return `"${text}"`;
}

function formatDate(date: Date | null) {
  return date ? date.toLocaleDateString("pt-BR") : "";
}

export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const from = req.nextUrl.searchParams.get("from");
  const to = req.nextUrl.searchParams.get("to");
  const fromDate = from ? new Date(`${from}T00:00:00`) : undefined;
  const toDate = to ? new Date(`${to}T23:59:59`) : undefined;

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
