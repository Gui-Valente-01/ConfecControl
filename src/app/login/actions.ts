"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createSession, destroySession, verifyPassword } from "@/lib/auth";
import { clearRateLimit, isRateLimited } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";

export type LoginState = { error?: string };

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Informe e-mail e senha." };
  }

  const headerStore = await headers();
  const ip = headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const rateKey = `${email}|${ip}`;
  if (isRateLimited(rateKey)) {
    return { error: "Muitas tentativas de login. Aguarde 15 minutos e tente novamente." };
  }

  const user = await prisma.user.findUnique({ where: { email } });
  const senhaConfere = Boolean(user) && verifyPassword(password, user!.password);

  // Só dizemos "desativado" para quem acertou a senha: quem não acertou não
  // fica sabendo se o e-mail existe. Para o funcionário certo, porém, saber o
  // motivo é o que evita ele ficar tentando a mesma senha por dias.
  if (user && senhaConfere && !user.active) {
    return { error: "Seu acesso foi desativado. Peça ao dono da empresa para reativar em Funcionários." };
  }

  if (!user || !user.active || !senhaConfere) {
    return {
      error:
        "E-mail ou senha inválidos. Confira o e-mail; se a senha não vier, peça ao dono da empresa para redefinir em Funcionários - Redefinir.",
    };
  }

  clearRateLimit(rateKey);
  await createSession(user.id);
  redirect("/");
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}
