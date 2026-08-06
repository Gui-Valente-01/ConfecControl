import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Quantos avisos esta pessoa ainda não leu.
 *
 * Existe como rota própria para o sino se virar sozinho em qualquer tela: a
 * alternativa era buscar a contagem nas vinte páginas que montam o menu.
 *
 * Devolve também quantos são urgentes, porque é isso que decide se o sino fica
 * vermelho — cinco avisos comuns podem esperar, um pedido de ajuda não.
 */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ total: 0, urgentes: 0 });

  const naoLido = {
    companyId: user.companyId,
    leituras: { none: { userId: user.id } },
  } as const;

  const [total, urgentes] = await Promise.all([
    prisma.aviso.count({ where: naoLido }),
    prisma.aviso.count({ where: { ...naoLido, urgente: true } }),
  ]);

  return NextResponse.json(
    { total, urgentes },
    // Contagem não pode vir de cache: o sino ficaria mostrando número velho.
    { headers: { "cache-control": "no-store" } },
  );
}
