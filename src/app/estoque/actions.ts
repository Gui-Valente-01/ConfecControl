"use server";

import { StockMovementType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { adminCompanyId, requireCompanyId, requireUser } from "@/lib/auth";
import { canManageStock } from "@/lib/roles";
import type { FormState } from "@/lib/form-state";
import { moneyToCents } from "@/lib/format";
import { prisma } from "@/lib/prisma";

// Estoque: cadastrar/lançar/editar é só do Dono e do Gerente (Produção é só leitura).
async function ensureCanManageStock(): Promise<FormState | null> {
  const user = await requireUser();
  return canManageStock(user.role) ? null : { error: "Você não tem permissão para alterar o estoque." };
}

function quantityFromText(value: string) {
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

function revalidateStock() {
  revalidatePath("/");
  revalidatePath("/estoque");
  revalidatePath("/produtos");
}

export async function createMaterialAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const denied = await ensureCanManageStock();
  if (denied) return denied;
  const name = String(formData.get("name") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const unit = String(formData.get("unit") ?? "").trim();
  const current = quantityFromText(String(formData.get("current") ?? ""));
  const min = quantityFromText(String(formData.get("min") ?? ""));
  const costPerUnitInCents = moneyToCents(String(formData.get("cost") ?? ""));
  const supplier = String(formData.get("supplier") ?? "").trim();

  if (!name) return { error: "Informe o nome do material." };

  const companyId = await requireCompanyId();

  const material = await prisma.material.create({
    data: {
      companyId,
      name,
      category: category || null,
      unit: unit || "unidades",
      currentQuantity: current,
      minimumQuantity: min,
      costPerUnitInCents,
      supplier: supplier || null,
    },
  });

  // Registra o saldo inicial como entrada para o histórico.
  if (current > 0) {
    await prisma.stockMovement.create({
      data: { materialId: material.id, type: "IN", quantity: current, note: "Saldo inicial" },
    });
  }

  revalidateStock();
  return { success: `Material ${name} cadastrado.` };
}

export async function updateMaterialAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!id || !name) return { error: "Informe o nome do material." };

  const companyId = await adminCompanyId();
  if (!companyId) return { error: "Apenas o dono pode editar materiais." };

  const updated = await prisma.material.updateMany({
    where: { id, companyId },
    data: {
      name,
      category: String(formData.get("category") ?? "").trim() || null,
      unit: String(formData.get("unit") ?? "").trim() || "unidades",
      minimumQuantity: quantityFromText(String(formData.get("min") ?? "")),
      costPerUnitInCents: moneyToCents(String(formData.get("cost") ?? "")),
      supplier: String(formData.get("supplier") ?? "").trim() || null,
    },
  });
  if (updated.count === 0) return { error: "Material não encontrado." };

  revalidateStock();
  return { success: "Material atualizado." };
}

export async function deleteMaterialAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const denied = await ensureCanManageStock();
  if (denied) return denied;
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Material não encontrado." };

  const companyId = await requireCompanyId();

  const material = await prisma.material.findFirst({
    where: { id, companyId },
    select: { id: true, name: true },
  });
  if (!material) return { error: "Material não encontrado." };

  // Vai para a lixeira em vez de sumir. Era aqui o pior caso do sistema: a
  // exclusão levava em cascata a ficha técnica de todas as peças que usavam o
  // material e todo o histórico de estoque. Agora nada disso é apagado.
  const deleted = await prisma.material.updateMany({
    where: { id, companyId, deletedAt: null },
    data: { deletedAt: new Date() },
  });
  if (deleted.count === 0) return { error: "Material não encontrado." };

  revalidateStock();
  revalidatePath("/lixeira");
  return { success: `Material ${material.name} foi para a lixeira.` };
}

const movementTypes: StockMovementType[] = ["IN", "OUT", "ADJUSTMENT"];

export async function registerStockMovementAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const denied = await ensureCanManageStock();
  if (denied) return denied;
  const materialId = String(formData.get("materialId") ?? "");
  const typeRaw = String(formData.get("type") ?? "");
  const quantity = quantityFromText(String(formData.get("quantity") ?? ""));
  const note = String(formData.get("note") ?? "").trim();

  if (!materialId || !movementTypes.includes(typeRaw as StockMovementType) || quantity < 0) {
    return { error: "Dados do movimento inválidos. Confira o tipo e a quantidade." };
  }
  const type = typeRaw as StockMovementType;

  const companyId = await requireCompanyId();

  const found = await prisma.$transaction(async (tx) => {
    // Confere que o material pertence a empresa e bloqueia o registro saldo errado.
    const material = await tx.material.findFirst({ where: { id: materialId, companyId }, select: { id: true } });
    if (!material) return false;

    // Atualiza o saldo de forma atômica no banco (evita lost update em movimentos concorrentes).
    if (type === "IN") {
      await tx.material.update({ where: { id: materialId }, data: { currentQuantity: { increment: quantity } } });
    } else if (type === "OUT") {
      await tx.$executeRaw`
        UPDATE "materiais"
        SET "currentQuantity" = GREATEST(0, "currentQuantity" - ${quantity})
        WHERE "id" = ${materialId} AND "companyId" = ${companyId}`;
    } else {
      await tx.material.update({ where: { id: materialId }, data: { currentQuantity: quantity } }); // ADJUSTMENT: saldo absoluto
    }

    await tx.stockMovement.create({
      data: { materialId, type, quantity, note: note || null },
    });
    return true;
  });
  if (!found) return { error: "Material não encontrado." };

  revalidateStock();
  return { success: "Movimentação registrada." };
}

// --------- Ficha tecnica (BOM): materiais que cada produto consome ---------

export async function setProductMaterialAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const denied = await ensureCanManageStock();
  if (denied) return denied;
  const productId = String(formData.get("productId") ?? "");
  const materialId = String(formData.get("materialId") ?? "");
  const quantityPerUnit = quantityFromText(String(formData.get("quantityPerUnit") ?? ""));

  if (!productId || !materialId || quantityPerUnit <= 0) {
    return { error: "Informe o material e a quantidade por peça (maior que zero)." };
  }

  const companyId = await requireCompanyId();
  const [product, material] = await Promise.all([
    prisma.product.findFirst({ where: { id: productId, companyId }, select: { id: true } }),
    prisma.material.findFirst({ where: { id: materialId, companyId }, select: { id: true } }),
  ]);
  if (!product || !material) return { error: "Produto ou material inválido." };

  await prisma.productMaterial.upsert({
    where: { productId_materialId: { productId, materialId } },
    update: { quantityPerUnit },
    create: { productId, materialId, quantityPerUnit },
  });

  revalidatePath("/produtos");
  return { success: "Ficha técnica atualizada." };
}

export async function removeProductMaterialAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const denied = await ensureCanManageStock();
  if (denied) return denied;
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Item da ficha técnica não encontrado." };

  const companyId = await requireCompanyId();
  // Garante que a ficha pertence a um produto da empresa.
  const link = await prisma.productMaterial.findFirst({
    where: { id, product: { companyId } },
    select: { id: true },
  });
  if (!link) return { error: "Item da ficha técnica não encontrado." };

  await prisma.productMaterial.delete({ where: { id } });

  revalidatePath("/produtos");
  return { success: "Item removido da ficha técnica." };
}
