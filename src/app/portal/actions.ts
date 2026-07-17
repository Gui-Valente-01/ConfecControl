"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requirePortalClient } from "@/lib/client-auth";
import type { FormState } from "@/lib/form-state";
import { prisma } from "@/lib/prisma";
import { storageConfigured, uploadAttachmentToStorage } from "@/lib/storage";

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // 8 MB

// O cliente envia uma solicitação (nova peça ou repetição). A confecção aprova depois.
export async function createRequestAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const client = await requirePortalClient();

  const description = String(formData.get("description") ?? "").trim();
  const quantityRaw = String(formData.get("quantity") ?? "").trim();
  const referenceOrderId = String(formData.get("referenceOrderId") ?? "").trim() || null;
  const kind = referenceOrderId ? "REORDER" : "NEW";
  const file = formData.get("photo");

  if (description.length < 3) return { error: "Descreva o que você precisa (ao menos 3 caracteres)." };

  const quantity = quantityRaw ? Math.max(0, Math.floor(Number(quantityRaw) || 0)) : null;

  // Se veio de "pedir mais da mesma peça", confirma que o pedido é do próprio cliente.
  if (referenceOrderId) {
    const ref = await prisma.order.findFirst({
      where: { id: referenceOrderId, clientId: client.id },
      select: { id: true },
    });
    if (!ref) return { error: "Pedido de referência inválido." };
  }

  let photoUrl: string | null = null;
  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_UPLOAD_BYTES) return { error: "A foto passa de 8 MB. Envie uma imagem menor." };
    if (!storageConfigured()) return { error: "Envio de foto indisponível no momento. Tente sem foto." };
    const safeName = file.name.replace(/[^\w.\-]/g, "_").slice(-60) || "foto";
    const path = `${client.companyId}/solicitacoes/${randomUUID()}-${safeName}`;
    photoUrl = await uploadAttachmentToStorage(path, await file.arrayBuffer(), file.type || null);
    if (!photoUrl) return { error: "Não consegui enviar a foto. Tente novamente." };
  }

  await prisma.orderRequest.create({
    data: {
      companyId: client.companyId,
      clientId: client.id,
      kind,
      referenceOrderId,
      description,
      quantity,
      photoUrl,
    },
  });

  revalidatePath("/portal");
  return { success: "Solicitação enviada! A confecção vai avaliar e responder." };
}
