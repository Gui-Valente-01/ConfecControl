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

/**
 * Entrada, saída ou acerto de estoque de uma PEÇA pronta.
 *
 * IN soma (chegou mercadoria), OUT subtrai (saiu fora de pedido: perda,
 * amostra, brinde) e ADJUSTMENT grava o saldo contado na prateleira — que é
 * o que a pessoa faz quando o número da tela não bate com a realidade.
 */
export async function registerStockMovementAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const denied = await ensureCanManageStock();
  if (denied) return denied;
  const productId = String(formData.get("productId") ?? "");
  const typeRaw = String(formData.get("type") ?? "");
  // Peça se conta em unidades inteiras: "2,5 bonés" não existe.
  const quantity = Math.round(quantityFromText(String(formData.get("quantity") ?? "")));
  const note = String(formData.get("note") ?? "").trim();

  if (!productId || !movementTypes.includes(typeRaw as StockMovementType) || quantity < 0) {
    return { error: "Dados do movimento inválidos. Confira o tipo e a quantidade." };
  }
  const type = typeRaw as StockMovementType;

  const companyId = await requireCompanyId();

  const achou = await prisma.$transaction(async (tx) => {
    const peca = await tx.product.findFirst({ where: { id: productId, companyId }, select: { id: true } });
    if (!peca) return false;

    // Saldo alterado no banco, não lido-e-escrito no servidor: dois
    // lançamentos ao mesmo tempo perderiam um dos dois.
    if (type === "IN") {
      await tx.product.update({ where: { id: productId }, data: { currentQuantity: { increment: quantity } } });
    } else if (type === "OUT") {
      await tx.$executeRaw`
        UPDATE "produtos"
        SET "currentQuantity" = GREATEST(0, "currentQuantity" - ${quantity})
        WHERE "id" = ${productId} AND "companyId" = ${companyId}`;
    } else {
      await tx.product.update({ where: { id: productId }, data: { currentQuantity: quantity } }); // ADJUSTMENT: saldo contado
    }

    await tx.stockMovement.create({ data: { productId, type, quantity, note: note || null } });
    return true;
  });
  if (!achou) return { error: "Peça não encontrada." };

  revalidateStock();
  return { success: "Movimentação registrada." };
}

/** Define a partir de quantas unidades a peça entra no aviso de "acabando". */
export async function setProductMinimumAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const denied = await ensureCanManageStock();
  if (denied) return denied;
  const productId = String(formData.get("productId") ?? "");
  const minimum = Math.round(quantityFromText(String(formData.get("minimumQuantity") ?? "")));
  if (!productId || minimum < 0) return { error: "Quantidade mínima inválida." };

  const companyId = await requireCompanyId();
  const { count } = await prisma.product.updateMany({
    where: { id: productId, companyId },
    data: { minimumQuantity: minimum },
  });
  if (count === 0) return { error: "Peça não encontrada." };

  revalidateStock();
  return { success: "Mínimo atualizado." };
}

// A ficha tecnica (BOM) saiu da tela de Pecas junto com o estoque de material:
// o custo agora vem de um campo so. Os vinculos ja gravados continuam no banco,
// so nao ha mais como criar ou remover pela interface.
