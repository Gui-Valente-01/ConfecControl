"use server";

import { problemaDaSenha } from "@/lib/validation";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { registrarTentativa, limparTentativas } from "@/lib/rate-limit";
import { createClientSession, destroyClientSession } from "@/lib/client-auth";
import { planHasFeature } from "@/lib/features";
import type { FormState } from "@/lib/form-state";
import { prisma } from "@/lib/prisma";

// 1º acesso pelo link de convite: o cliente define a senha e é conectado à confecção.
/** Identifica quem esta tentando, para o freio nao ser global. */
async function origemDaTentativa(): Promise<string> {
  const cabecalhos = await headers();
  return cabecalhos.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}

export async function portalActivateAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const token = String(formData.get("token") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (!token) return { error: "Link de acesso inválido. Peça um novo link à confecção." };
  const problemaSenha = problemaDaSenha(password);
  if (problemaSenha) return { error: problemaSenha };
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

  // O portal e a porta do CLIENTE da confeccao, e nao tinha freio nenhum: dava
  // para tentar senha a vontade. A chave junta e-mail e origem para o ataque a
  // uma conta nao travar as demais.
  const chave = `portal:${email}|${await origemDaTentativa()}`;
  const freio = await registrarTentativa(chave);
  if (freio.bloqueado) return { error: freio.mensagem ?? "Muitas tentativas. Tente mais tarde." };

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

  await limparTentativas(chave);

  await createClientSession(match.id);
  redirect("/portal");
}

export async function portalLogoutAction() {
  await destroyClientSession();
  redirect("/portal/entrar");
}
