"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { adminCompanyId, companyIdWithCapability, requireUser } from "@/lib/auth";
import { describeBlockedDeletion } from "@/lib/deletion";
import { planHasFeature } from "@/lib/features";
import type { FormState } from "@/lib/form-state";
import { prisma } from "@/lib/prisma";
import { validateContactFields } from "@/lib/validation";

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

  if (!name) return { error: "Informe o nome do cliente.", field: "name" };

  const invalido = validateContactFields({ phone, document, email });
  if (invalido) return { error: invalido.message, field: invalido.field };

  // Isolamento por empresa NAO e autorizacao: dizia de quem era o dado,
  // mas nao se esta pessoa podia mexer nele.
  const companyId = await companyIdWithCapability("clients.write");
  if (!companyId) return { error: "Voce nao tem permissao para alterar clientes." };

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
  if (!id || !name) return { error: "Informe o nome do cliente.", field: "name" };

  const phone = String(formData.get("phone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const document = String(formData.get("document") ?? "").trim();

  const invalido = validateContactFields({ phone, document, email });
  if (invalido) return { error: invalido.message, field: invalido.field };

  const companyId = await adminCompanyId();
  if (!companyId) return { error: "Apenas o dono pode editar clientes." };

  const updated = await prisma.client.updateMany({
    where: { id, companyId },
    data: {
      name,
      contact: String(formData.get("contact") ?? "").trim() || null,
      phone: phone || null,
      email: email || null,
      document: document || null,
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

  // Isolamento por empresa NAO e autorizacao: dizia de quem era o dado,
  // mas nao se esta pessoa podia mexer nele.
  const companyId = await companyIdWithCapability("clients.write");
  if (!companyId) return { error: "Voce nao tem permissao para alterar clientes." };

  const client = await prisma.client.findFirst({
    where: { id, companyId },
    select: { id: true, name: true, _count: { select: { orders: true } } },
  });
  if (!client) return { error: "Cliente não encontrado." };

  // O banco já recusa apagar cliente com pedido (a chave estrangeira é Restrict),
  // mas o erro que vinha de lá era ilegível. Aqui explicamos o motivo e o número.
  const bloqueio = describeBlockedDeletion({
    tipo: "o cliente",
    nome: client.name,
    bloqueios: [{ count: client._count.orders, singular: "pedido", plural: "pedidos" }],
    saida: "Apague os pedidos dele antes, ou deixe o cadastro parado — cliente sem pedido novo não atrapalha nada.",
  });
  if (bloqueio) return { error: bloqueio };

  // Vai para a lixeira: some das telas mas continua no banco, com volta.
  // O companyId garante que so mexe em cliente da empresa do usuário.
  const deleted = await prisma.client.updateMany({
    where: { id, companyId, deletedAt: null },
    data: { deletedAt: new Date() },
  });
  if (deleted.count === 0) return { error: "Cliente não encontrado." };

  revalidatePath("/clientes");
  revalidatePath("/lixeira");
  return { success: `Cliente ${client.name} foi para a lixeira.` };
}
