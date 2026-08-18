"use server";

import { headers } from "next/headers";
import { registrarTentativa } from "@/lib/rate-limit";
import { redirect } from "next/navigation";
import { createSession, hashPassword } from "@/lib/auth";
import { seedCompanyStages } from "@/lib/db-bootstrap";
import type { FormState } from "@/lib/form-state";
import { prisma } from "@/lib/prisma";
import { problemaDaSenha, validateContactFields } from "@/lib/validation";

export async function signupAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const accessCode = String(formData.get("accessCode") ?? "").replace(/\D/g, "");
  const companyName = String(formData.get("companyName") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!accessCode) return { error: "Informe o código de acesso recebido na contratação." };

  // O codigo tem 8 digitos: sem freio, da para varrer o intervalo inteiro e
  // criar empresa com o codigo de outra pessoa. A chave e a origem, porque aqui
  // nao ha conta para proteger -- ha um segredo curto para adivinhar.
  const cabecalhos = await headers();
  const origem = cabecalhos.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const freio = await registrarTentativa(`cadastro:${origem}`);
  if (freio.bloqueado) return { error: freio.mensagem ?? "Muitas tentativas. Tente mais tarde." };
  if (!companyName || !name || !email) return { error: "Preencha empresa, nome e e-mail." };
  const problemaSenha = problemaDaSenha(password);
  if (problemaSenha) return { error: problemaSenha };

  // Esse e-mail vira o login do dono e o token só pode ser usado uma vez:
  // errar aqui queima o acesso da empresa inteira.
  const invalido = validateContactFields({ email });
  if (invalido) return { error: invalido.message, field: "email" };

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
