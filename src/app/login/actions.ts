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
  if (!user || !user.active || !verifyPassword(password, user.password)) {
    return { error: "E-mail ou senha inválidos." };
  }

  clearRateLimit(rateKey);
  await createSession(user.id);
  redirect("/");
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}
