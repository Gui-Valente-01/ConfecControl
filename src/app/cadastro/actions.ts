"use server";

import { redirect } from "next/navigation";
import { createSession, hashPassword } from "@/lib/auth";
import { seedCompanyStages } from "@/lib/db-bootstrap";
import type { FormState } from "@/lib/form-state";
import { prisma } from "@/lib/prisma";
import { validateContactFields } from "@/lib/validation";

export async function signupAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const accessCode = String(formData.get("accessCode") ?? "").replace(/\D/g, "");
  const companyName = String(formData.get("companyName") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!accessCode) return { error: "Informe o token de acesso recebido na contratação." };
  if (!companyName || !name || !email) return { error: "Preencha empresa, nome e e-mail." };
  if (password.length < 6) return { error: "A senha deve ter ao menos 6 caracteres." };

  // Esse e-mail vira o login do dono e o token só pode ser usado uma vez:
  // errar aqui queima o acesso da empresa inteira.
  const invalido = validateContactFields({ email });
  if (invalido) return { error: invalido.message };

  try {
    const userId = await prisma.$transaction(async (tx) => {
      // Lê o plano do token antes de marcá-lo como usado.
      const token = await tx.signupToken.findUnique({
        where: { code: accessCode },
        select: { features: true, usedAt: true, revokedAt: true },
      });
      if (!token || token.usedAt || token.revokedAt) {
        throw new Error("TOKEN_INVALID");
      }

      const claimed = await tx.signupToken.updateMany({
        where: { code: accessCode, usedAt: null, revokedAt: null },
        data: { usedAt: new Date(), usedByEmail: email },
      });

      if (claimed.count !== 1) {
        throw new Error("TOKEN_INVALID");
      }

      const existing = await tx.user.findUnique({ where: { email }, select: { id: true } });
      if (existing) {
        throw new Error("EMAIL_EXISTS");
      }

      const company = await tx.company.create({
        data: { name: companyName, email, features: token.features },
      });
      await seedCompanyStages(company.id, tx);

      const user = await tx.user.create({
        data: {
          companyId: company.id,
          name,
          email,
          password: hashPassword(password),
          role: "ADMIN",
        },
      });

      await tx.signupToken.update({
        where: { code: accessCode },
        data: { usedCompanyId: company.id },
      });

      return user.id;
    });

    await createSession(userId);
  } catch (error) {
    if (error instanceof Error && error.message === "TOKEN_INVALID") {
      return { error: "Token inválido, já usado ou revogado." };
    }
    if (error instanceof Error && error.message === "EMAIL_EXISTS") {
      return { error: "Já existe um usuário com esse e-mail." };
    }
    throw error;
  }

  redirect("/");
}
