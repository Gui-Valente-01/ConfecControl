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
const AUTH_SECRET = process.env.AUTH_SECRET ?? "confec-dev-secret-troque-em-produção";

// ---------- Senha (scrypt, sem dependencia externa) ----------

export function hashPassword(plain: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(plain, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

export function verifyPassword(plain: string, stored: string) {
  if (!stored.includes(":")) {
    // Compatibilidade com senhas antigas em texto puro.
    return stored === plain;
  }
  const [salt, hash] = stored.split(":");
  const derived = scryptSync(plain, salt, 64);
  const original = Buffer.from(hash, "hex");
  if (original.length !== derived.length) return false;
  return timingSafeEqual(original, derived);
}

// ---------- Token de sessao (cookie assinado HMAC) ----------

function sign(value: string) {
  return createHmac("sha256", AUTH_SECRET).update(value).digest("hex");
}

function buildToken(userId: string) {
  return `${userId}.${sign(userId)}`;
}

function readToken(token: string | undefined): string | null {
  if (!token) return null;
  const idx = token.lastIndexOf(".");
  if (idx <= 0) return null;
  const userId = token.slice(0, idx);
  const signature = token.slice(idx + 1);
  const expected = sign(userId);
  if (signature.length !== expected.length) return null;
  if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
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
