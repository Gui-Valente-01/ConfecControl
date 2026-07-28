"use server";

import { revalidatePath } from "next/cache";
import { adminCompanyId, requireCompanyId, requireUser } from "@/lib/auth";
import { currencyToCents } from "@/lib/format";
import type { FormState } from "@/lib/form-state";
import { canManageStock } from "@/lib/roles";
import { prisma } from "@/lib/prisma";

// Serviços fazem parte do custo da peça: mesma regra do estoque (Dono e Gerente).
async function ensureCanManage(): Promise<FormState | null> {
  const user = await requireUser();
  return canManageStock(user.role) ? null : { error: "Você não tem permissão para alterar serviços." };
}

function revalidateServices() {
  revalidatePath("/produtos");
  revalidatePath("/relatorios");
}

export async function createServiceAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const denied = await ensureCanManage();
  if (denied) return denied;

  const name = String(formData.get("name") ?? "").trim();
  const price = currencyToCents(String(formData.get("price") ?? ""));
  if (!name) return { error: "Informe o nome do serviço." };

  const companyId = await requireCompanyId();

  const existing = await prisma.service.findFirst({ where: { companyId, name }, select: { id: true } });
  if (existing) return { error: `Já existe um serviço chamado ${name}.` };

  const last = await prisma.service.findFirst({
    where: { companyId },
    orderBy: { position: "desc" },
    select: { position: true },
  });

  await prisma.service.create({
    data: { companyId, name, defaultPriceInCents: Math.max(0, price), position: (last?.position ?? 0) + 1 },
  });

  revalidateServices();
  return { success: `Serviço ${name} cadastrado.` };
}

export async function updateServiceAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const denied = await ensureCanManage();
  if (denied) return denied;

  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!id || !name) return { error: "Informe o nome do serviço." };

  const companyId = await requireCompanyId();
  const updated = await prisma.service.updateMany({
    where: { id, companyId },
    data: {
      name,
      defaultPriceInCents: Math.max(0, currencyToCents(String(formData.get("price") ?? ""))),
    },
  });
  if (updated.count === 0) return { error: "Serviço não encontrado." };

  revalidateServices();
  return { success: "Serviço atualizado." };
}

export async function deleteServiceAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Serviço não encontrado." };

  // Excluir mexe no custo de todas as peças que usam o serviço: só o Dono.
  const companyId = await adminCompanyId();
  if (!companyId) return { error: "Apenas o dono pode excluir serviços." };

  const deleted = await prisma.service.deleteMany({ where: { id, companyId } });
  if (deleted.count === 0) return { error: "Serviço não encontrado." };

  revalidateServices();
  return { success: "Serviço removido." };
}

// Vincula um serviço a uma peça, com o valor que ele custa naquela peça.
export async function linkProductServiceAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const denied = await ensureCanManage();
  if (denied) return denied;

  const productId = String(formData.get("productId") ?? "");
  const serviceId = String(formData.get("serviceId") ?? "");
  const priceRaw = String(formData.get("price") ?? "").trim();
  if (!productId || !serviceId) return { error: "Escolha o serviço." };

  const companyId = await requireCompanyId();

  const [product, service] = await Promise.all([
    prisma.product.findFirst({ where: { id: productId, companyId }, select: { id: true } }),
    prisma.service.findFirst({ where: { id: serviceId, companyId }, select: { id: true, name: true, defaultPriceInCents: true } }),
  ]);
  if (!product) return { error: "Peça não encontrada." };
  if (!service) return { error: "Serviço não encontrado." };

  // Sem valor digitado, usa o padrão do catálogo.
  const priceInCents = priceRaw ? Math.max(0, currencyToCents(priceRaw)) : service.defaultPriceInCents;

  await prisma.productService.upsert({
    where: { productId_serviceId: { productId, serviceId } },
    create: { productId, serviceId, priceInCents },
    update: { priceInCents },
  });

  revalidateServices();
  return { success: `${service.name} vinculado à peça.` };
}

export async function unlinkProductServiceAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const denied = await ensureCanManage();
  if (denied) return denied;

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Vínculo não encontrado." };

  const companyId = await requireCompanyId();
  const deleted = await prisma.productService.deleteMany({
    where: { id, product: { companyId } },
  });
  if (deleted.count === 0) return { error: "Vínculo não encontrado." };

  revalidateServices();
  return { success: "Serviço removido da peça." };
}
