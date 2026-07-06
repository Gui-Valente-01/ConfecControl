"use server";

import { revalidatePath } from "next/cache";
import { requireCompanyId } from "@/lib/auth";
import type { FormState } from "@/lib/form-state";
import { prisma } from "@/lib/prisma";

export async function markPaymentPaidAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const paymentId = String(formData.get("paymentId") ?? "");
  const orderId = String(formData.get("orderId") ?? "");
  if (!paymentId || !orderId) return { error: "Pagamento não encontrado." };

  const companyId = await requireCompanyId();

  // Confirma que o pedido pertence a empresa do usuário e usa o total real do
  // banco como valor pago (nunca confiar no valor vindo do formulário).
  const order = await prisma.order.findFirst({
    where: { id: orderId, companyId },
    select: { id: true, totalAmountInCents: true },
  });
  if (!order) return { error: "Pedido não encontrado." };

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
  return { success: "Pagamento marcado como pago." };
}
