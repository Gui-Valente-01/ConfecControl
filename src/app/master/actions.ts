"use server";

import { randomInt } from "crypto";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { DIAS_DE_VALIDADE_DO_CONVITE, calcularExpiracao } from "@/lib/convite";
import { sanitizeFeatures } from "@/lib/features";
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

  const features = sanitizeFeatures(formData.getAll("features").map(String));

  const code = await generateUniqueTokenCode();
  await prisma.signupToken.create({
    data: {
      code,
      clientName,
      contactEmail: contactEmail || null,
      createdByEmail: user.email,
      // Todo token novo nasce com prazo. Convite sem validade vira segredo
      // eterno de 8 dígitos circulando em conversa de WhatsApp.
      expiresAt: calcularExpiracao(new Date()),
      features,
    },
  });

  revalidatePath("/master");
  return { success: `Token ${code} criado para ${clientName}. Vale ${DIAS_DE_VALIDADE_DO_CONVITE} dias.` };
}

// Altera o plano (módulos) de uma empresa já existente: upgrade/downgrade.
export async function updateCompanyFeaturesAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireSuperAdmin();
  const companyId = String(formData.get("companyId") ?? "");
  if (!companyId) return { error: "Empresa nao encontrada." };

  const features = sanitizeFeatures(formData.getAll("features").map(String));
  const updated = await prisma.company.updateMany({ where: { id: companyId }, data: { features } });
  if (updated.count === 0) return { error: "Empresa nao encontrada." };

  revalidatePath("/master");
  return { success: "Plano da empresa atualizado." };
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
