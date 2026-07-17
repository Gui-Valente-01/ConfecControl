"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { planHasFeature } from "@/lib/features";
import type { FormState } from "@/lib/form-state";
import { canAccessRoute } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { stageNameToOrderStatus } from "@/lib/status";

// Só quem pode acessar /solicitacoes e cuja empresa tem o módulo portal.
async function requireRequestsUser() {
  const user = await requireUser();
  if (!canAccessRoute(user.role, "/solicitacoes")) redirect("/");
  if (!planHasFeature(user.features, "portal")) redirect("/");
  return user;
}

export async function acceptRequestAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireRequestsUser();
  const id = String(formData.get("id") ?? "");
  const note = String(formData.get("note") ?? "").trim();
  if (!id) return { error: "Solicitação não encontrada." };

  const request = await prisma.orderRequest.findFirst({
    where: { id, companyId: user.companyId, status: "PENDING" },
  });
  if (!request) return { error: "Solicitação não encontrada ou já respondida." };

  const firstStage = await prisma.productionStage.findFirst({
    where: { companyId: user.companyId, active: true },
    orderBy: { position: "asc" },
  });

  const description = request.description.slice(0, 300);
  const quantity = request.quantity && request.quantity > 0 ? request.quantity : 1;

  // Cria um pedido RASCUNHO (preço/prazo o usuário completa depois). Número único
  // gerado na transação, com retry em corrida (P2002 no @@unique [companyId, number]).
  let createdOrderId: string | null = null;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      createdOrderId = await prisma.$transaction(async (tx) => {
        const last = await tx.order.findFirst({
          where: { companyId: user.companyId },
          orderBy: { number: "desc" },
          select: { number: true },
        });
        const number = (last?.number ?? 1000) + 1;

        const order = await tx.order.create({
          data: {
            companyId: user.companyId,
            clientId: request.clientId,
            number,
            status: firstStage ? stageNameToOrderStatus(firstStage.name) : "RECEIVED",
            currentStageId: firstStage?.id,
            internalNotes: `Rascunho criado a partir de solicitação do portal.\n${request.description}`,
            items: {
              create: {
                description,
                quantity,
                unitPriceInCents: 0,
                totalPriceInCents: 0,
              },
            },
            attachments: request.photoUrl
              ? { create: { name: "Foto do cliente", url: request.photoUrl, type: "image/*" } }
              : undefined,
          },
          select: { id: true },
        });
        return order.id;
      });
      break;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") continue;
      throw e;
    }
  }

  if (!createdOrderId) return { error: "Não foi possível gerar o pedido. Tente novamente." };

  await prisma.orderRequest.update({
    where: { id: request.id },
    data: { status: "ACCEPTED", reviewedAt: new Date(), reviewNote: note || null, createdOrderId },
  });

  revalidatePath("/solicitacoes");
  revalidatePath("/pedidos");
  revalidatePath("/");
  return { success: "Solicitação aceita. Um pedido rascunho foi criado — complete preço e prazo." };
}

export async function rejectRequestAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireRequestsUser();
  const id = String(formData.get("id") ?? "");
  const note = String(formData.get("note") ?? "").trim();
  if (!id) return { error: "Solicitação não encontrada." };

  const updated = await prisma.orderRequest.updateMany({
    where: { id, companyId: user.companyId, status: "PENDING" },
    data: { status: "REJECTED", reviewedAt: new Date(), reviewNote: note || null },
  });
  if (updated.count === 0) return { error: "Solicitação não encontrada ou já respondida." };

  revalidatePath("/solicitacoes");
  return { success: "Solicitação recusada. O cliente vê a resposta no portal." };
}
