"use server";

import { revalidatePath } from "next/cache";
import { adminCompanyId, requireCompanyId } from "@/lib/auth";
import type { FormState } from "@/lib/form-state";
import { prisma } from "@/lib/prisma";

export async function createPartnerAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const name = String(formData.get("name") ?? "").trim();
  const service = String(formData.get("service") ?? "").trim();
  const contact = String(formData.get("contact") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  if (!name) return { error: "Informe o nome da empresa terceirizada." };

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

export async function updatePartnerAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!id || !name) return;

  const companyId = await adminCompanyId();
  if (!companyId) return; // só o Dono edita

  await prisma.partner.updateMany({
    where: { id, companyId },
    data: {
      name,
      service: String(formData.get("service") ?? "").trim() || null,
      contact: String(formData.get("contact") ?? "").trim() || null,
      phone: String(formData.get("phone") ?? "").trim() || null,
      email: String(formData.get("email") ?? "").trim() || null,
      notes: String(formData.get("notes") ?? "").trim() || null,
    },
  });

  revalidatePath("/terceirizadas");
}

export async function togglePartnerActiveAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const active = String(formData.get("active") ?? "") === "true";
  if (!id) return;

  const companyId = await requireCompanyId();
  await prisma.partner.updateMany({ where: { id, companyId }, data: { active } });

  revalidatePath("/terceirizadas");
  revalidatePath("/producao");
}

export async function deletePartnerAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const companyId = await requireCompanyId();
  await prisma.partner.deleteMany({ where: { id, companyId } });

  revalidatePath("/terceirizadas");
  revalidatePath("/producao");
}
