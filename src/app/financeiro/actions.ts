"use server";

import { revalidatePath } from "next/cache";
import { requireCompanyId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function markPaymentPaidAction(formData: FormData) {
  const paymentId = String(formData.get("paymentId") ?? "");
  const orderId = String(formData.get("orderId") ?? "");
  if (!paymentId || !orderId) return;

  const companyId = await requireCompanyId();

  // Confirma que o pedido pertence a empresa do usuário e usa o total real do
  // banco como valor pago (nunca confiar no valor vindo do formulário).
  const order = await prisma.order.findFirst({
    where: { id: orderId, companyId },
    select: { id: true, totalAmountInCents: true },
  });
  if (!order) return;

  await prisma.$transaction([
    prisma.payment.updateMany({
      where: { id: paymentId, orderId },
      data: {
        status: "PAID",
        paidAt: new Date(),
      },
    }),
    prisma.order.update({
      where: { id: orderId },
      data: {
        paymentStatus: "PAID",
        paidAmountInCents: order.totalAmountInCents,
      },
    }),
  ]);

  revalidatePath("/");
  revalidatePath("/pedidos");
  revalidatePath("/financeiro");
}
