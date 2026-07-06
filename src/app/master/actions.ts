"use server";

import { randomInt } from "crypto";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import type { FormState } from "@/lib/form-state";
import { prisma } from "@/lib/prisma";

function superAdminEmails(): string[] {
  return (process.env.SUPERADMIN_EMAIL ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

async function requireSuperAdmin() {
  const user = await requireUser();
  if (!superAdminEmails().includes(user.email.toLowerCase())) {
    throw new Error("Acesso negado.");
  }
  return user;
}

async function generateUniqueTokenCode() {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = String(randomInt(10_000_000, 100_000_000));
    const existing = await prisma.signupToken.findUnique({ where: { code }, select: { id: true } });
    if (!existing) return code;
  }

  throw new Error("Nao foi possivel gerar um token unico. Tente novamente.");
}

export async function createSignupTokenAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireSuperAdmin();
  const clientName = String(formData.get("clientName") ?? "").trim();
  const contactEmail = String(formData.get("contactEmail") ?? "").trim().toLowerCase();

  if (!clientName) {
    return { error: "Informe o nome do cliente ou da empresa." };
  }

  const code = await generateUniqueTokenCode();
  await prisma.signupToken.create({
    data: {
      code,
      clientName,
      contactEmail: contactEmail || null,
      createdByEmail: user.email,
    },
  });

  revalidatePath("/master");
  return { success: `Token ${code} criado para ${clientName}.` };
}

export async function revokeSignupTokenAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireSuperAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Token nao encontrado." };

  const result = await prisma.signupToken.updateMany({
    where: { id, usedAt: null, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  if (result.count === 0) {
    return { error: "Esse token ja foi usado, revogado ou nao existe." };
  }

  revalidatePath("/master");
  return { success: "Token revogado." };
}
