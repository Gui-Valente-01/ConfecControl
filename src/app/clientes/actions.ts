"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { adminCompanyId, requireCompanyId, requireUser } from "@/lib/auth";
import { planHasFeature } from "@/lib/features";
import type { FormState } from "@/lib/form-state";
import { prisma } from "@/lib/prisma";

// Gera (ou renova) o link de acesso do cliente ao portal. Exige o módulo portal
// e um e-mail no cliente (usado para os logins seguintes).
export async function generateClientInviteAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  if (!planHasFeature(user.features, "portal")) {
    return { error: "Ative o módulo Portal do cliente para convidar clientes." };
  }
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Cliente não encontrado." };

  const client = await prisma.client.findFirst({
    where: { id, companyId: user.companyId },
    select: { id: true, email: true },
  });
  if (!client) return { error: "Cliente não encontrado." };
  if (!client.email) return { error: "Adicione um e-mail ao cliente antes de gerar o acesso." };

  const token = randomBytes(24).toString("base64url");
  await prisma.client.update({ where: { id: client.id }, data: { inviteToken: token } });

  revalidatePath("/clientes");
  return { success: "Link de acesso gerado. Copie e envie ao cliente." };
}

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

export async function updateClientAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!id || !name) return { error: "Informe o nome do cliente." };

  const companyId = await adminCompanyId();
  if (!companyId) return { error: "Apenas o dono pode editar clientes." };

  const updated = await prisma.client.updateMany({
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
  if (updated.count === 0) return { error: "Cliente não encontrado." };

  revalidatePath("/clientes");
  return { success: "Cliente atualizado." };
}

export async function deleteClientAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Cliente não encontrado." };

  const companyId = await requireCompanyId();

  // deleteMany com companyId garante que so apaga clientes da empresa do usuário.
  const deleted = await prisma.client.deleteMany({ where: { id, companyId } });
  if (deleted.count === 0) return { error: "Cliente não encontrado." };

  revalidatePath("/clientes");
  return { success: "Cliente removido." };
}
