"use server";

import { revalidatePath } from "next/cache";
import { adminCompanyId, requireCompanyId } from "@/lib/auth";
import type { FormState } from "@/lib/form-state";
import { prisma } from "@/lib/prisma";

export async function createClientAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const name = String(formData.get("name") ?? "").trim();
  const contact = String(formData.get("contact") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const document = String(formData.get("document") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  if (!name) return { error: "Informe o nome do cliente." };

  const companyId = await requireCompanyId();

  await prisma.client.create({
    data: {
      companyId,
      name,
      contact: contact || null,
      phone: phone || null,
      email: email || null,
      document: document || null,
      address: address || null,
      notes: notes || null,
    },
  });

  revalidatePath("/clientes");
  return { success: `Cliente ${name} cadastrado.` };
}

export async function updateClientAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!id || !name) return;

  const companyId = await adminCompanyId();
  if (!companyId) return; // só o Dono edita

  await prisma.client.updateMany({
    where: { id, companyId },
    data: {
      name,
      contact: String(formData.get("contact") ?? "").trim() || null,
      phone: String(formData.get("phone") ?? "").trim() || null,
      email: String(formData.get("email") ?? "").trim() || null,
      document: String(formData.get("document") ?? "").trim() || null,
      address: String(formData.get("address") ?? "").trim() || null,
      notes: String(formData.get("notes") ?? "").trim() || null,
    },
  });

  revalidatePath("/clientes");
}

export async function deleteClientAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const companyId = await requireCompanyId();

  // deleteMany com companyId garante que so apaga clientes da empresa do usuário.
  await prisma.client.deleteMany({ where: { id, companyId } });

  revalidatePath("/clientes");
}
