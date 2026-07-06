import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  createHmac,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import type { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";

import { canAccessRoute, roleLabels } from "@/lib/roles";

export { roleLabels, canAccessRoute };

const SESSION_COOKIE = "confec_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 dias

// Em produção o segredo é obrigatório; sem ele qualquer um forjaria sessões.
function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("AUTH_SECRET não configurado. Defina a variável de ambiente em produção.");
  }
  return "confec-dev-secret";
}

// ---------- Senha (scrypt, sem dependencia externa) ----------

export function hashPassword(plain: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(plain, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

export function verifyPassword(plain: string, stored: string) {
  if (!stored.includes(":")) return false; // formato inválido: só aceitamos salt:hash
  const [salt, hash] = stored.split(":");
  const derived = scryptSync(plain, salt, 64);
  const original = Buffer.from(hash, "hex");
  if (original.length !== derived.length) return false;
  return timingSafeEqual(original, derived);
}

// ---------- Token de sessao (cookie assinado HMAC) ----------

function sign(value: string) {
  return createHmac("sha256", getAuthSecret()).update(value).digest("hex");
}

// Formato: userId.expiraEm.assinatura — a expiração fica dentro do payload
// assinado, então não dá para estendê-la sem invalidar a assinatura.
function buildToken(userId: string) {
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE;
  const payload = `${userId}.${expiresAt}`;
  return `${payload}.${sign(payload)}`;
}

function readToken(token: string | undefined): string | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [userId, expiresRaw, signature] = parts;
  if (!userId || !expiresRaw || !signature) return null;
  const expected = sign(`${userId}.${expiresRaw}`);
  if (signature.length !== expected.length) return null;
  if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  const expiresAt = Number(expiresRaw);
  if (!Number.isInteger(expiresAt) || expiresAt <= Math.floor(Date.now() / 1000)) return null;
  return userId;
}

export async function createSession(userId: string) {
  const store = await cookies();
  store.set(SESSION_COOKIE, buildToken(userId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function destroySession() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

// ---------- Usuário atual ----------

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  companyId: string;
  companyName: string;
};

export async function getSessionUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const userId = readToken(store.get(SESSION_COOKIE)?.value);
  if (!userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { company: { select: { name: true } } },
  });
  if (!user || !user.active) return null;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    companyId: user.companyId,
    companyName: user.company.name,
  };
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireRole(roles: UserRole[]): Promise<SessionUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) redirect("/");
  return user;
}

// Exige login e que o cargo possa acessar a rota; senao volta para o painel.
export async function requireRouteUser(href: string): Promise<SessionUser> {
  const user = await requireUser();
  if (!canAccessRoute(user.role, href)) redirect("/");
  return user;
}

// Atalho para server actions: retorna o companyId do usuário logado.
export async function requireCompanyId(): Promise<string> {
  const user = await requireUser();
  return user.companyId;
}

// Retorna o companyId apenas se o usuário for Dono (ADMIN); senão null.
// Usado em actions de edição que só o dono pode executar.
export async function adminCompanyId(): Promise<string | null> {
  const user = await requireUser();
  return user.role === "ADMIN" ? user.companyId : null;
}
