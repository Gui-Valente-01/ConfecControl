"use server";

import { UserRole } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { hashPassword, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type UserFormState = { error?: string; success?: string };

const roles: UserRole[] = ["ADMIN", "MANAGER", "PRODUCTION", "FINANCE", "SALES"];

// Apenas Dono (ADMIN) e Gerente (MANAGER) administram usuários.
async function requireManager() {
  const actor = await requireUser();
  if (actor.role !== "ADMIN" && actor.role !== "MANAGER") redirect("/");
  return actor;
}

export async function createUserAction(_prev: UserFormState, formData: FormData): Promise<UserFormState> {
  const actor = await requireManager();

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

export async function updateUserDetailsAction(formData: FormData) {
  const actor = await requireManager();
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const roleRaw = String(formData.get("role") ?? "");
  const sector = String(formData.get("sector") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  if (!id || !name || !email || !roles.includes(roleRaw as UserRole)) return;

  // Confirma que o funcionario e da empresa e que o e-mail nao pertence a outro.
  const target = await prisma.user.findFirst({ where: { id, companyId: actor.companyId }, select: { id: true } });
  if (!target) return;
  const emailTaken = await prisma.user.findFirst({ where: { email, NOT: { id } }, select: { id: true } });
  if (emailTaken) return;

  await prisma.user.update({
    where: { id },
    data: { name, email, role: roleRaw as UserRole, sector: sector || null, phone: phone || null },
  });

  revalidatePath("/usuarios");
}

export async function toggleUserActiveAction(formData: FormData) {
  const actor = await requireManager();
  const id = String(formData.get("id") ?? "");
  const active = String(formData.get("active") ?? "") === "true";
  if (!id) return;
  // Não permite o proprio usuário se desativar e ficar sem acesso.
  if (id === actor.id && !active) return;

  await prisma.user.updateMany({
    where: { id, companyId: actor.companyId },
    data: { active },
  });

  revalidatePath("/usuarios");
}

export async function resetUserPasswordAction(formData: FormData) {
  const actor = await requireManager();
  const id = String(formData.get("id") ?? "");
  const password = String(formData.get("password") ?? "");
  if (!id || password.length < 6) return;

  await prisma.user.updateMany({
    where: { id, companyId: actor.companyId },
    data: { password: hashPassword(password) },
  });

  revalidatePath("/usuarios");
}

export async function deleteUserAction(formData: FormData) {
  const actor = await requireManager();
  const id = String(formData.get("id") ?? "");
  if (!id || id === actor.id) return; // não pode excluir a si mesmo

  await prisma.user.deleteMany({ where: { id, companyId: actor.companyId } });

  revalidatePath("/usuarios");
}
