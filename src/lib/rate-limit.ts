// Freio de tentativas compartilhado, guardado no banco.
//
// A versão anterior contava num Map na memória do processo. Em serverless cada
// requisição pode cair numa instância nova, então o contador reiniciava sozinho
// e o freio não freava nada: bastava insistir para continuar tentando senha.
//
// Agora a contagem mora numa tabela, que é o único lugar que todas as
// instâncias enxergam igual. A REGRA fica em rate-limit-policy.ts, sem banco e
// testada; aqui só entra a leitura e a gravação.

import { decidir, textoDeEspera, type EstadoLimite } from "@/lib/rate-limit-policy";
import { prisma } from "@/lib/prisma";

export { textoDeEspera };

export type Veredito = {
  bloqueado: boolean;
  esperarSegundos: number;
  /** Pronto para mostrar na tela, sem revelar contagem nem se a conta existe. */
  mensagem: string | null;
};

const LIVRE: Veredito = { bloqueado: false, esperarSegundos: 0, mensagem: null };

/**
 * Registra uma tentativa e diz se ela deve ser recusada.
 *
 * Falha ABERTO: se o banco não responder, a tentativa passa. É uma escolha —
 * um problema no banco derrubaria o login de todo mundo se falhasse fechado, e
 * indisponibilidade total é pior do que um intervalo sem freio. O erro sobe
 * para o monitoramento de qualquer forma.
 */
export async function registrarTentativa(chave: string): Promise<Veredito> {
  try {
    const atual = await prisma.rateLimit.findUnique({ where: { chave } });

    const estado: EstadoLimite | null = atual
      ? {
          tentativas: atual.tentativas,
          janelaInicio: atual.janelaInicio,
          bloqueadoAte: atual.bloqueadoAte,
        }
      : null;

    const decisao = decidir(estado, new Date());

    // proximo nulo = bloqueio em vigor, nada a gravar. É o que impede alguém de
    // manter a conta de outra pessoa travada só insistindo.
    if (decisao.proximo) {
      const dados = {
        tentativas: decisao.proximo.tentativas,
        janelaInicio: decisao.proximo.janelaInicio,
        bloqueadoAte: decisao.proximo.bloqueadoAte,
      };
      await prisma.rateLimit.upsert({
        where: { chave },
        create: { chave, ...dados },
        update: dados,
      });
    }

    if (!decisao.bloqueado) return LIVRE;
    return {
      bloqueado: true,
      esperarSegundos: decisao.esperarSegundos,
      mensagem: textoDeEspera(decisao.esperarSegundos),
    };
  } catch {
    return LIVRE;
  }
}

/**
 * Zera a contagem depois de um acerto.
 *
 * Quem entrou provou que é dono da conta; manter a contagem faria a próxima
 * digitação errada, semanas depois, cair já perto do bloqueio.
 */
export async function limparTentativas(chave: string): Promise<void> {
  try {
    await prisma.rateLimit.deleteMany({ where: { chave } });
  } catch {
    // Falhar aqui só deixa a contagem viva até a janela expirar sozinha.
  }
}

/**
 * Limpa o que já não serve.
 *
 * A tabela cresce com uma linha por chave tentada. Sem faxina, um ataque com
 * e-mails aleatórios deixaria lixo permanente no banco.
 */
export async function faxinaDeLimites(agora: Date = new Date()): Promise<number> {
  const limite = new Date(agora.getTime() - 24 * 60 * 60 * 1000);
  try {
    const { count } = await prisma.rateLimit.deleteMany({
      where: {
        atualizadoEm: { lt: limite },
        OR: [{ bloqueadoAte: null }, { bloqueadoAte: { lt: agora } }],
      },
    });
    return count;
  } catch {
    return 0;
  }
}
