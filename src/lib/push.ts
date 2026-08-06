// Envio de notificação para o celular (Web Push).
//
// Só no servidor: a chave privada assina cada envio e não pode sair daqui.
//
// A mensagem vai criptografada de ponta a ponta — nem o serviço do Google ou
// da Apple, que faz a entrega, consegue ler o conteúdo. Quem escreve isso à mão
// erra; por isso usamos a biblioteca web-push.

import webpush from "web-push";
import { prisma } from "@/lib/prisma";

let configurado = false;

/** Está tudo cadastrado para enviar? Sem as chaves, o push simplesmente não roda. */
export function pushConfigurado(): boolean {
  return Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

export function chavePublica(): string | null {
  return process.env.VAPID_PUBLIC_KEY ?? null;
}

function configurar(): boolean {
  if (configurado) return true;
  if (!pushConfigurado()) return false;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:contato@confeccontrolapp.com",
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );
  configurado = true;
  return true;
}

export type Notificacao = {
  titulo: string;
  corpo: string;
  urgente: boolean;
  /** Para onde levar quando a pessoa tocar na notificação. */
  url: string;
};

/**
 * Manda a notificação para todos os aparelhos da empresa, menos o de quem
 * gerou o aviso.
 *
 * Quem pediu a cor não precisa ser avisado do próprio pedido — receber a
 * própria notificação faz a pessoa achar que o sistema está confuso.
 *
 * Aparelho que o serviço recusa (404/410) foi desinstalado ou teve a permissão
 * revogada: a inscrição é apagada em vez de tentar para sempre.
 */
export async function enviarParaEmpresa(
  companyId: string,
  notificacao: Notificacao,
  exceptUserId?: string | null,
): Promise<{ enviados: number; removidos: number }> {
  if (!configurar()) return { enviados: 0, removidos: 0 };

  const inscricoes = await prisma.pushInscricao.findMany({
    where: { companyId, ...(exceptUserId ? { NOT: { userId: exceptUserId } } : {}) },
    select: { id: true, endpoint: true, p256dh: true, auth: true },
  });
  if (inscricoes.length === 0) return { enviados: 0, removidos: 0 };

  const carga = JSON.stringify(notificacao);
  const mortos: string[] = [];
  let enviados = 0;

  await Promise.all(
    inscricoes.map(async (inscricao) => {
      try {
        await webpush.sendNotification(
          { endpoint: inscricao.endpoint, keys: { p256dh: inscricao.p256dh, auth: inscricao.auth } },
          carga,
          {
            // Urgente chega na hora; o resto pode esperar o aparelho acordar,
            // o que poupa bateria de quem está com o celular no bolso.
            urgency: notificacao.urgente ? "high" : "normal",
            TTL: notificacao.urgente ? 3600 : 86400,
          },
        );
        enviados++;
      } catch (erro: unknown) {
        const status = (erro as { statusCode?: number })?.statusCode;
        if (status === 404 || status === 410) mortos.push(inscricao.id);
        // Outros erros (rede, serviço fora) só são ignorados: o aviso já está
        // salvo no sistema, e a pessoa vai ver no sino de qualquer jeito.
      }
    }),
  );

  if (mortos.length > 0) {
    await prisma.pushInscricao.deleteMany({ where: { id: { in: mortos } } });
  }

  return { enviados, removidos: mortos.length };
}
