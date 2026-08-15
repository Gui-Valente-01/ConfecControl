"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createSession, hashPassword } from "@/lib/auth";
import { demoHabilitada, EMPRESA_DEMO } from "@/lib/demo";
import { prisma } from "@/lib/prisma";
import { isRateLimited } from "@/lib/rate-limit";
import { recriarEmpresaDemo, type PrismaDoSeed } from "@/lib/seed-demo";

// Fotos de exemplo só fora de produção: o next.config libera o picsum.photos
// apenas ali, e em produção a miniatura apareceria quebrada.
const COM_FOTOS = process.env.NODE_ENV !== "production";

/** Recria o cenário e devolve o dono, que é com quem o visitante entra. */
async function recriar(): Promise<string> {
  const resumo = await recriarEmpresaDemo({
    // O cliente do site carrega a extensão da lixeira, que troca a assinatura
    // dos métodos sem mudar o que eles fazem. O seed só usa create, delete e
    // findUnique, iguais nos dois — a conversão fica aqui, num lugar só, para
    // o seed continuar servindo também ao script de linha de comando.
    prisma: prisma as unknown as PrismaDoSeed,
    hashPassword,
    comFotos: COM_FOTOS,
  });
  const dono = await prisma.user.findUnique({ where: { email: resumo.emailDono }, select: { id: true } });
  if (!dono) throw new Error("Demonstração criada sem dono.");
  return dono.id;
}

/** Identifica quem está pedindo, para limitar a recriação. */
async function origem(): Promise<string> {
  const cabecalhos = await headers();
  return cabecalhos.get("x-forwarded-for")?.split(",")[0]?.trim() || "desconhecido";
}

/**
 * Entra na confecção de demonstração.
 *
 * Só recria o cenário quando ele não existe. Recriar a cada visita deixaria a
 * entrada lenta e, pior, apagaria a demonstração de quem estivesse mexendo
 * nela naquele instante.
 */
export async function entrarNaDemoAction(): Promise<void> {
  if (!demoHabilitada()) redirect("/");

  const dono = await prisma.user.findUnique({
    where: { email: EMPRESA_DEMO.emailDono },
    select: { id: true, company: { select: { name: true } } },
  });

  const donoId =
    dono && dono.company.name === EMPRESA_DEMO.nome ? dono.id : await recriar();

  await createSession(donoId);
  redirect("/");
}

/**
 * Recomeça a demonstração do zero.
 *
 * Existe porque o visitante mexe à vontade: sem isto, a primeira pessoa que
 * cancelasse todos os pedidos deixaria a demonstração feia para as próximas.
 * A sessão é refeita porque o usuário anterior deixou de existir junto com a
 * empresa apagada.
 *
 * Limitação conhecida: apagar e recriar leva alguns segundos e não é atômico.
 * Quem estiver olhando a demonstração nesse intervalo pode ver um erro, porque
 * o Prisma busca pedido e cliente em consultas separadas e pode pegar uma de
 * cada lado da troca. Só afeta a empresa de demonstração, e a tela seguinte já
 * volta certa. Resolver de vez pede envolver a recriação inteira numa
 * transação com tempo limite maior — não feito aqui para não segurar uma
 * conexão do banco por meio minuto.
 */
export async function recomecarDemoAction(): Promise<void> {
  if (!demoHabilitada()) redirect("/");

  // Recriar custa dezenas de escritas no banco. Sem freio, um único visitante
  // insistindo no botão viraria carga permanente em cima do banco de produção.
  if (isRateLimited(`demo:${await origem()}`)) redirect("/?demo=espere");

  const donoId = await recriar();
  await createSession(donoId);
  redirect("/");
}
