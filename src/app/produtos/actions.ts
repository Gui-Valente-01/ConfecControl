"use server";

import type { ProductKind } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { adminCompanyId, requireCompanyId } from "@/lib/auth";
import { describeBlockedDeletion } from "@/lib/deletion";
import type { FormState } from "@/lib/form-state";
import { moneyToCents } from "@/lib/format";
import { prisma } from "@/lib/prisma";

function daysFromText(value: string) {
  const parsed = Number(value.replace(/\D/g, ""));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

// Peça própria (PRODUCT) ou serviço na peça do cliente (SERVICE).
function productKindFromForm(value: FormDataEntryValue | null): ProductKind {
  return String(value ?? "") === "SERVICE" ? "SERVICE" : "PRODUCT";
}

export async function createProductAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const name = String(formData.get("name") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const fabric = String(formData.get("fabric") ?? "").trim();
  const price = String(formData.get("price") ?? "").trim();
  const cost = String(formData.get("cost") ?? "").trim();
  const time = String(formData.get("time") ?? "").trim();

  if (!name) return { error: "Informe o nome da peça." };

  const companyId = await requireCompanyId();

  await prisma.product.create({
    data: {
      companyId,
      name,
      category: category || null,
      fabric: fabric || null,
      standardPriceInCents: moneyToCents(price),
      costInCents: moneyToCents(cost),
      averageProductionDays: daysFromText(time),
      kind: productKindFromForm(formData.get("kind")),
    },
  });

  revalidatePath("/produtos");
  return { success: `Peça ${name} cadastrada.` };
}

export async function updateProductAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!id || !name) return { error: "Informe o nome da peça." };

  const companyId = await adminCompanyId();
  if (!companyId) return { error: "Apenas o dono pode editar peças." };

  const updated = await prisma.product.updateMany({
    where: { id, companyId },
    data: {
      name,
      category: String(formData.get("category") ?? "").trim() || null,
      fabric: String(formData.get("fabric") ?? "").trim() || null,
      standardPriceInCents: moneyToCents(String(formData.get("price") ?? "")),
      costInCents: moneyToCents(String(formData.get("cost") ?? "")),
      averageProductionDays: daysFromText(String(formData.get("time") ?? "")),
      kind: productKindFromForm(formData.get("kind")),
    },
  });
  if (updated.count === 0) return { error: "Peça não encontrada." };

  revalidatePath("/produtos");
  return { success: "Peça atualizada." };
}

export async function deleteProductAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Peça não encontrada." };

  const companyId = await requireCompanyId();

  const product = await prisma.product.findFirst({
    where: { id, companyId },
    select: { id: true, name: true, _count: { select: { items: true } } },
  });
  if (!product) return { error: "Peça não encontrada." };

  // Peça usada em pedido não pode sumir: o item do pedido antigo ficaria sem
  // produto, e o relatório de custo mudaria sozinho, sem ninguém ter mexido.
  const bloqueio = describeBlockedDeletion({
    tipo: "a peça",
    nome: product.name,
    bloqueios: [{ count: product._count.items, singular: "item de pedido", plural: "itens de pedido" }],
    saida: "Apagar agora bagunçaria o histórico e o relatório de custo. Deixe a peça parada no catálogo.",
  });
  if (bloqueio) return { error: bloqueio };

  const deleted = await prisma.product.updateMany({
    where: { id, companyId, deletedAt: null },
    data: { deletedAt: new Date() },
  });
  if (deleted.count === 0) return { error: "Peça não encontrada." };

  revalidatePath("/produtos");
  revalidatePath("/lixeira");
  return { success: `Peça ${product.name} foi para a lixeira.` };
}
