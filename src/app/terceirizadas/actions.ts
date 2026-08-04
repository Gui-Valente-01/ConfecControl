"use server";

import { revalidatePath } from "next/cache";
import { adminCompanyId, requireCompanyId } from "@/lib/auth";
import type { FormState } from "@/lib/form-state";
import { prisma } from "@/lib/prisma";
import { validateContactFields } from "@/lib/validation";

export async function createPartnerAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const name = String(formData.get("name") ?? "").trim();
  const service = String(formData.get("service") ?? "").trim();
  const contact = String(formData.get("contact") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  if (!name) return { error: "Informe o nome da empresa terceirizada.", field: "name" };

  const invalido = validateContactFields({ phone, email });
  if (invalido) return { error: invalido.message, field: invalido.field };

  const companyId = await requireCompanyId();

  await prisma.partner.create({
    data: {
      companyId,
      name,
      service: service || null,
      contact: contact || null,
      phone: phone || null,
      email: email || null,
      notes: notes || null,
    },
  });

  revalidatePath("/terceirizadas");
  revalidatePath("/producao");
  return { success: `Terceirizada ${name} cadastrada.` };
}

export async function updatePartnerAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!id || !name) return { error: "Informe o nome da empresa terceirizada.", field: "name" };

  const phone = String(formData.get("phone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();

  const invalido = validateContactFields({ phone, email });
  if (invalido) return { error: invalido.message, field: invalido.field };

  const companyId = await adminCompanyId();
  if (!companyId) return { error: "Apenas o dono pode editar terceirizadas." };

  const updated = await prisma.partner.updateMany({
    where: { id, companyId },
    data: {
      name,
      service: String(formData.get("service") ?? "").trim() || null,
      contact: String(formData.get("contact") ?? "").trim() || null,
      phone: phone || null,
      email: email || null,
      notes: String(formData.get("notes") ?? "").trim() || null,
    },
  });
  if (updated.count === 0) return { error: "Terceirizada não encontrada." };

  revalidatePath("/terceirizadas");
  return { success: "Terceirizada atualizada." };
}

export async function togglePartnerActiveAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = String(formData.get("id") ?? "");
  const active = String(formData.get("active") ?? "") === "true";
  if (!id) return { error: "Terceirizada não encontrada." };

  const companyId = await requireCompanyId();
  const updated = await prisma.partner.updateMany({ where: { id, companyId }, data: { active } });
  if (updated.count === 0) return { error: "Terceirizada não encontrada." };

  revalidatePath("/terceirizadas");
  revalidatePath("/producao");
  return { success: active ? "Terceirizada reativada." : "Terceirizada desativada." };
}

export async function deletePartnerAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Terceirizada não encontrada." };

  const companyId = await requireCompanyId();
  // Vai para a lixeira: pedido antigo que aponta para ela continua inteiro.
  const deleted = await prisma.partner.updateMany({
    where: { id, companyId, deletedAt: null },
    data: { deletedAt: new Date() },
  });
  if (deleted.count === 0) return { error: "Terceirizada não encontrada." };

  revalidatePath("/terceirizadas");
  revalidatePath("/producao");
  revalidatePath("/lixeira");
  return { success: "Terceirizada foi para a lixeira." };
}
