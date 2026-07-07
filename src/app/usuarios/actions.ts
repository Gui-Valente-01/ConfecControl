"use server";

import { UserRole } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { hashPassword, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type UserFormState = { error?: string; success?: string };

const roles: UserRole[] = ["ADMIN", "MANAGER", "PRODUCTION", "FINANCE", "SALES"];

// Apenas o Dono (ADMIN) administra os funcionários da empresa.
async function requireOwner() {
  const actor = await requireUser();
  if (actor.role !== "ADMIN") redirect("/");
  return actor;
}

export async function createUserAction(_prev: UserFormState, formData: FormData): Promise<UserFormState> {
  const actor = await requireOwner();

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const roleRaw = String(formData.get("role") ?? "");
  const sector = String(formData.get("sector") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();

  if (!name || !email) return { error: "Informe nome e e-mail." };
  if (password.length < 6) return { error: "A senha deve ter ao menos 6 caracteres." };
  if (!roles.includes(roleRaw as UserRole)) return { error: "Cargo inválido." };

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) return { error: "Já existe um funcionário com esse e-mail." };

  await prisma.user.create({
    data: {
      companyId: actor.companyId,
      name,
      email,
      password: hashPassword(password),
      role: roleRaw as UserRole,
      sector: sector || null,
      phone: phone || null,
    },
  });

  revalidatePath("/usuarios");
  return { success: `Funcionário ${name} cadastrado.` };
}

export async function updateUserDetailsAction(_prev: UserFormState, formData: FormData): Promise<UserFormState> {
  const actor = await requireOwner();
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const roleRaw = String(formData.get("role") ?? "");
  const sector = String(formData.get("sector") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  if (!id || !name || !email || !roles.includes(roleRaw as UserRole)) {
    return { error: "Informe nome, e-mail e um cargo válido." };
  }

  // Confirma que o funcionario e da empresa e que o e-mail nao pertence a outro.
  const target = await prisma.user.findFirst({ where: { id, companyId: actor.companyId }, select: { id: true } });
  if (!target) return { error: "Funcionário não encontrado." };
  if (id === actor.id && roleRaw !== "ADMIN") {
    return { error: "Você não pode remover o seu próprio acesso de Dono." };
  }

  const emailTaken = await prisma.user.findFirst({ where: { email, NOT: { id } }, select: { id: true } });
  if (emailTaken) return { error: "Já existe um funcionário com esse e-mail." };

  await prisma.user.update({
    where: { id },
    data: { name, email, role: roleRaw as UserRole, sector: sector || null, phone: phone || null },
  });

  revalidatePath("/usuarios");
  return { success: "Dados do funcionário atualizados." };
}

export async function toggleUserActiveAction(_prev: UserFormState, formData: FormData): Promise<UserFormState> {
  const actor = await requireOwner();
  const id = String(formData.get("id") ?? "");
  const active = String(formData.get("active") ?? "") === "true";
  if (!id) return { error: "Funcionário não encontrado." };
  // Não permite o proprio usuário se desativar e ficar sem acesso.
  if (id === actor.id && !active) return { error: "Você não pode desativar o seu próprio acesso." };

  const updated = await prisma.user.updateMany({
    where: { id, companyId: actor.companyId },
    data: { active },
  });
  if (updated.count === 0) return { error: "Funcionário não encontrado." };

  revalidatePath("/usuarios");
  return { success: active ? "Acesso reativado." : "Acesso desativado." };
}

export async function resetUserPasswordAction(_prev: UserFormState, formData: FormData): Promise<UserFormState> {
  const actor = await requireOwner();
  const id = String(formData.get("id") ?? "");
  const password = String(formData.get("password") ?? "");
  if (!id || password.length < 6) return { error: "A nova senha deve ter ao menos 6 caracteres." };

  const updated = await prisma.user.updateMany({
    where: { id, companyId: actor.companyId },
    data: { password: hashPassword(password) },
  });
  if (updated.count === 0) return { error: "Funcionário não encontrado." };

  revalidatePath("/usuarios");
  return { success: "Senha redefinida." };
}

export async function deleteUserAction(_prev: UserFormState, formData: FormData): Promise<UserFormState> {
  const actor = await requireOwner();
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Funcionário não encontrado." };
  if (id === actor.id) return { error: "Você não pode excluir o seu próprio usuário." };

  const deleted = await prisma.user.deleteMany({ where: { id, companyId: actor.companyId } });
  if (deleted.count === 0) return { error: "Funcionário não encontrado." };

  revalidatePath("/usuarios");
  return { success: "Funcionário removido." };
}
