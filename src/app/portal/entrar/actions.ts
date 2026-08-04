"use server";

import { redirect } from "next/navigation";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { createClientSession, destroyClientSession } from "@/lib/client-auth";
import { planHasFeature } from "@/lib/features";
import type { FormState } from "@/lib/form-state";
import { prisma } from "@/lib/prisma";

// 1º acesso pelo link de convite: o cliente define a senha e é conectado à confecção.
export async function portalActivateAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const token = String(formData.get("token") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (!token) return { error: "Link de acesso inválido. Peça um novo link à confecção." };
  if (password.length < 6) return { error: "A senha deve ter ao menos 6 caracteres." };
  if (password !== confirm) return { error: "As senhas não conferem." };

  const client = await prisma.client.findUnique({
    where: { inviteToken: token },
    include: { company: { select: { features: true } } },
  });
  // Cliente na lixeira nao entra no portal. A checagem e na mao porque
  // findUnique fica de fora do filtro automatico (o where so aceita campo unico).
  if (!client || client.deletedAt) return { error: "Link de acesso inválido ou já utilizado." };
  if (!planHasFeature(client.company.features, "portal")) {
    return { error: "Esta confecção não está com o portal do cliente ativo." };
  }

  await prisma.client.update({
    where: { id: client.id },
    data: { passwordHash: hashPassword(password), portalEnabled: true, inviteToken: null },
  });

  await createClientSession(client.id);
  redirect("/portal");
}

// Acessos seguintes: e-mail + senha.
export async function portalLoginAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) return { error: "Informe e-mail e senha." };

  const clients = await prisma.client.findMany({
    where: { email, portalEnabled: true, passwordHash: { not: null } },
    include: { company: { select: { features: true } } },
  });

  const match = clients.find(
    (client) =>
      client.passwordHash &&
      verifyPassword(password, client.passwordHash) &&
      planHasFeature(client.company.features, "portal"),
  );
  if (!match) return { error: "E-mail ou senha inválidos." };

  await createClientSession(match.id);
  redirect("/portal");
}

export async function portalLogoutAction() {
  await destroyClientSession();
  redirect("/portal/entrar");
}
