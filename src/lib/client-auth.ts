import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHmac, timingSafeEqual } from "node:crypto";
import { planHasFeature } from "@/lib/features";
import { prisma } from "@/lib/prisma";

// Sessão do PORTAL DO CLIENTE — separada da sessão dos funcionários (outro cookie).
const CLIENT_COOKIE = "confec_client";
const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 dias

function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("AUTH_SECRET não configurado.");
  }
  return "confec-dev-secret";
}

function sign(value: string) {
  return createHmac("sha256", getAuthSecret()).update(value).digest("hex");
}

// Formato: clientId.expiraEm.assinatura (expiração dentro do payload assinado).
function buildToken(clientId: string) {
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE;
  const payload = `${clientId}.${expiresAt}`;
  return `${payload}.${sign(payload)}`;
}

function readToken(token: string | undefined): string | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [clientId, expiresRaw, signature] = parts;
  if (!clientId || !expiresRaw || !signature) return null;
  const expected = sign(`${clientId}.${expiresRaw}`);
  if (signature.length !== expected.length) return null;
  if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  const expiresAt = Number(expiresRaw);
  if (!Number.isInteger(expiresAt) || expiresAt <= Math.floor(Date.now() / 1000)) return null;
  return clientId;
}

export async function createClientSession(clientId: string) {
  const store = await cookies();
  store.set(CLIENT_COOKIE, buildToken(clientId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function destroyClientSession() {
  const store = await cookies();
  store.delete(CLIENT_COOKIE);
}

export type PortalClient = {
  id: string;
  name: string;
  email: string | null;
  companyId: string;
  companyName: string;
};

export async function getPortalClient(): Promise<PortalClient | null> {
  const store = await cookies();
  const clientId = readToken(store.get(CLIENT_COOKIE)?.value);
  if (!clientId) return null;

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: { company: { select: { name: true, features: true } } },
  });
  // Cliente na lixeira perde a sessao do portal na hora. A checagem e na mao
  // porque findUnique fica de fora do filtro automatico da lixeira.
  if (!client || client.deletedAt || !client.portalEnabled) return null;
  // Se a confecção não tem (mais) o módulo portal, o acesso fica suspenso.
  if (!planHasFeature(client.company.features, "portal")) return null;

  return {
    id: client.id,
    name: client.name,
    email: client.email,
    companyId: client.companyId,
    companyName: client.company.name,
  };
}

export async function requirePortalClient(): Promise<PortalClient> {
  const client = await getPortalClient();
  if (!client) redirect("/portal/entrar");
  return client;
}
