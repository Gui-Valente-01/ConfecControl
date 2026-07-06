"use server";

import { revalidatePath } from "next/cache";
import { adminCompanyId, requireCompanyId } from "@/lib/auth";
import type { FormState } from "@/lib/form-state";
import { currencyToCents } from "@/lib/format";
import { prisma } from "@/lib/prisma";

function daysFromText(value: string) {
  const parsed = Number(value.replace(/\D/g, ""));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
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
      standardPriceInCents: currencyToCents(price),
      costInCents: currencyToCents(cost),
      averageProductionDays: daysFromText(time),
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
      standardPriceInCents: currencyToCents(String(formData.get("price") ?? "")),
      costInCents: currencyToCents(String(formData.get("cost") ?? "")),
      averageProductionDays: daysFromText(String(formData.get("time") ?? "")),
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

  const deleted = await prisma.product.deleteMany({ where: { id, companyId } });
  if (deleted.count === 0) return { error: "Peça não encontrada." };

  revalidatePath("/produtos");
  return { success: "Peça removida." };
}
