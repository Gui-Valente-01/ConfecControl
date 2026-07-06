"use server";

import { redirect } from "next/navigation";
import { createSession, hashPassword } from "@/lib/auth";
import { seedCompanyStages } from "@/lib/db-bootstrap";
import type { FormState } from "@/lib/form-state";
import { prisma } from "@/lib/prisma";

export async function signupAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const accessCode = String(formData.get("accessCode") ?? "").trim();
  const companyName = String(formData.get("companyName") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  // Venda presencial: só cria empresa quem recebeu o código de acesso na contratação.
  const expectedCode = process.env.SIGNUP_ACCESS_CODE?.trim();
  if (!expectedCode) {
    return { error: "O cadastro de novas empresas está fechado no momento. Fale com quem apresentou o sistema para você." };
  }
  if (accessCode.toUpperCase() !== expectedCode.toUpperCase()) {
    return { error: "Código de acesso inválido. Use o código recebido na contratação." };
  }

  if (!companyName || !name || !email) return { error: "Preencha empresa, nome e e-mail." };
  if (password.length < 6) return { error: "A senha deve ter ao menos 6 caracteres." };

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) return { error: "Já existe um usuário com esse e-mail." };

  const company = await prisma.company.create({
    data: { name: companyName, email },
  });
  await seedCompanyStages(company.id);

  const user = await prisma.user.create({
    data: {
      companyId: company.id,
      name,
      email,
      password: hashPassword(password),
      role: "ADMIN",
    },
  });

  await createSession(user.id);
  redirect("/");
}
