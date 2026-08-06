import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { chavePublica, pushConfigurado } from "@/lib/push";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET — a chave pública que o navegador precisa para se inscrever.
 *
 * Vem por rota, e não por variável de build: assim trocar a chave não exige
 * publicar o sistema de novo.
 */
export async function GET() {
  return NextResponse.json(
    { configurado: pushConfigurado(), chavePublica: chavePublica() },
    { headers: { "cache-control": "no-store" } },
  );
}

/** POST — guarda a inscrição deste aparelho. */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ erro: "sem sessão" }, { status: 401 });

  let corpo: { endpoint?: string; keys?: { p256dh?: string; auth?: string }; aparelho?: string };
  try {
    corpo = await req.json();
  } catch {
    return NextResponse.json({ erro: "corpo inválido" }, { status: 400 });
  }

  const { endpoint, keys, aparelho } = corpo;
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return NextResponse.json({ erro: "inscrição incompleta" }, { status: 400 });
  }

  // upsert pelo endpoint: o navegador reaproveita o mesmo endereço ao
  // reinscrever, e sem isto a pessoa receberia a notificação repetida.
  await prisma.pushInscricao.upsert({
    where: { endpoint },
    create: {
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
      aparelho: aparelho?.slice(0, 80) ?? null,
      userId: user.id,
      companyId: user.companyId,
    },
    // O aparelho pode ter trocado de dono (celular emprestado, conta nova):
    // a inscrição passa a valer para quem está usando agora.
    update: {
      p256dh: keys.p256dh,
      auth: keys.auth,
      userId: user.id,
      companyId: user.companyId,
    },
  });

  return NextResponse.json({ ok: true });
}

/** DELETE — a pessoa desligou as notificações neste aparelho. */
export async function DELETE(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ erro: "sem sessão" }, { status: 401 });

  let corpo: { endpoint?: string };
  try {
    corpo = await req.json();
  } catch {
    return NextResponse.json({ erro: "corpo inválido" }, { status: 400 });
  }
  if (!corpo.endpoint) return NextResponse.json({ erro: "endpoint faltando" }, { status: 400 });

  // O userId no filtro impede alguém apagar a inscrição de outra pessoa.
  await prisma.pushInscricao.deleteMany({ where: { endpoint: corpo.endpoint, userId: user.id } });
  return NextResponse.json({ ok: true });
}
