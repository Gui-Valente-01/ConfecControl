// A decisão do freio de tentativas, sem banco e sem Next, para permitir teste.
//
// O limitador antigo vivia num Map na memória do processo. Em serverless cada
// requisição pode cair numa instância nova, então o contador reiniciava sozinho
// e o freio não freava: bastava insistir. A decisão passou para o banco, que é
// o único lugar que todas as instâncias enxergam igual — e a regra ficou aqui,
// separada, porque regra de segurança sem teste é palpite.

export type EstadoLimite = {
  tentativas: number;
  janelaInicio: Date;
  bloqueadoAte: Date | null;
};

export type Decisao = {
  /** Recusa agora? */
  bloqueado: boolean;
  /** Quanto falta para poder tentar de novo. Zero quando não está bloqueado. */
  esperarSegundos: number;
  /** O estado a gravar. Nulo quando nada muda (já estava bloqueado). */
  proximo: EstadoLimite | null;
};

/** Quanto tempo a contagem vale antes de zerar sozinha. */
export const JANELA_MS = 15 * 60 * 1000;

/** Tentativas livres dentro da janela. A sexta já é bloqueio. */
export const LIMITE = 5;

/**
 * Bloqueio progressivo: cada estouro dura mais que o anterior.
 *
 * Um minuto atrapalha quem errou a senha e mal atrapalha quem digitou errado
 * duas vezes. Uma hora inviabiliza a força bruta, que precisa de milhares de
 * tentativas. O degrau existe para não punir gente distraída com o remédio
 * reservado a atacante.
 */
export const DEGRAUS_MINUTOS = [1, 5, 15, 60];

/** A duração do bloqueio, dado quantas vezes a chave já estourou o limite. */
export function duracaoDoBloqueioMs(estourosAnteriores: number): number {
  const indice = Math.min(Math.max(0, estourosAnteriores), DEGRAUS_MINUTOS.length - 1);
  return DEGRAUS_MINUTOS[indice] * 60 * 1000;
}

/**
 * Decide se a tentativa passa e qual estado gravar.
 *
 * `estado` nulo significa chave nunca vista. A função é pura: quem chama é que
 * lê e grava no banco, o que permite testar toda a regra sem Postgres.
 */
export function decidir(estado: EstadoLimite | null, agora: Date = new Date()): Decisao {
  // Bloqueio em vigor: não conta tentativa nem estende a punição. Sem isso,
  // quem insiste durante o bloqueio empurraria o próprio castigo para sempre,
  // e um atacante conseguiria manter a conta de outra pessoa travada.
  if (estado?.bloqueadoAte && estado.bloqueadoAte > agora) {
    return {
      bloqueado: true,
      esperarSegundos: Math.ceil((estado.bloqueadoAte.getTime() - agora.getTime()) / 1000),
      proximo: null,
    };
  }

  const janelaExpirou = !estado || agora.getTime() - estado.janelaInicio.getTime() > JANELA_MS;

  // Janela vencida zera a contagem: erro de ontem não soma com o de hoje.
  if (janelaExpirou) {
    return {
      bloqueado: false,
      esperarSegundos: 0,
      proximo: { tentativas: 1, janelaInicio: agora, bloqueadoAte: null },
    };
  }

  const tentativas = estado.tentativas + 1;

  if (tentativas <= LIMITE) {
    return {
      bloqueado: false,
      esperarSegundos: 0,
      proximo: { tentativas, janelaInicio: estado.janelaInicio, bloqueadoAte: null },
    };
  }

  const estouros = tentativas - LIMITE - 1;
  const duracao = duracaoDoBloqueioMs(estouros);
  const bloqueadoAte = new Date(agora.getTime() + duracao);

  // A janela passa a contar do FIM do castigo, e não do começo dele.
  //
  // Sem isto os degraus de cima eram inalcançáveis. A janela é de 15 minutos e
  // o castigo mais longo também passa de 15: quando ele terminava, a contagem
  // já tinha zerado sozinha, e quem estava atacando voltava eternamente ao
  // degrau de 1 minuto. Contando do fim, a memória do castigo anterior dura
  // uma janela inteira DEPOIS da soltura, que é quando o atacante volta.
  return {
    bloqueado: true,
    esperarSegundos: Math.ceil(duracao / 1000),
    proximo: { tentativas, janelaInicio: bloqueadoAte, bloqueadoAte },
  };
}

/** Texto para a tela, sem revelar contagem nem existência de conta. */
export function textoDeEspera(segundos: number): string {
  if (segundos <= 60) return "Muitas tentativas. Espere um minuto e tente de novo.";
  const minutos = Math.ceil(segundos / 60);
  return `Muitas tentativas. Espere ${minutos} minutos e tente de novo.`;
}
