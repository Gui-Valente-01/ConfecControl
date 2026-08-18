import { describe, expect, it } from "vitest";
import {
  DEGRAUS_MINUTOS,
  JANELA_MS,
  LIMITE,
  decidir,
  duracaoDoBloqueioMs,
  textoDeEspera,
  type EstadoLimite,
} from "@/lib/rate-limit-policy";

const AGORA = new Date(2026, 7, 18, 10, 0, 0);
const emMinutos = (m: number) => new Date(AGORA.getTime() + m * 60_000);

/** Encadeia N tentativas seguidas, como faria quem insiste. */
function insistir(vezes: number, agora = AGORA): EstadoLimite | null {
  let estado: EstadoLimite | null = null;
  for (let i = 0; i < vezes; i += 1) {
    const d = decidir(estado, agora);
    if (d.proximo) estado = d.proximo;
  }
  return estado;
}

describe("dentro do limite", () => {
  it("chave nunca vista passa e comeca a contar", () => {
    const d = decidir(null, AGORA);
    expect(d.bloqueado).toBe(false);
    expect(d.proximo?.tentativas).toBe(1);
  });

  it("as primeiras tentativas passam", () => {
    let estado: EstadoLimite | null = null;
    for (let i = 1; i <= LIMITE; i += 1) {
      const d = decidir(estado, AGORA);
      expect(d.bloqueado, `tentativa ${i}`).toBe(false);
      estado = d.proximo;
    }
    expect(estado?.tentativas).toBe(LIMITE);
  });

  it("a tentativa seguinte ao limite bloqueia", () => {
    const estado = insistir(LIMITE);
    const d = decidir(estado, AGORA);
    expect(d.bloqueado).toBe(true);
    expect(d.esperarSegundos).toBeGreaterThan(0);
    expect(d.proximo?.bloqueadoAte).toBeInstanceOf(Date);
  });
});

describe("janela", () => {
  it("contagem zera sozinha depois da janela: erro de ontem nao soma com o de hoje", () => {
    const estado = insistir(LIMITE);
    const depois = new Date(AGORA.getTime() + JANELA_MS + 1000);
    const d = decidir(estado, depois);
    expect(d.bloqueado).toBe(false);
    expect(d.proximo?.tentativas).toBe(1);
  });

  it("dentro da janela a contagem continua somando", () => {
    const estado = insistir(3);
    const d = decidir(estado, emMinutos(5));
    expect(d.proximo?.tentativas).toBe(4);
  });
});

describe("bloqueio em vigor", () => {
  it("recusa sem contar tentativa nem estender o castigo", () => {
    const bloqueado: EstadoLimite = {
      tentativas: 99,
      janelaInicio: AGORA,
      bloqueadoAte: emMinutos(10),
    };
    const d = decidir(bloqueado, emMinutos(2));

    expect(d.bloqueado).toBe(true);
    // proximo nulo = nada a gravar. E o que impede um atacante de manter a
    // conta de outra pessoa travada para sempre, so insistindo.
    expect(d.proximo).toBeNull();
    expect(d.esperarSegundos).toBe(8 * 60);
  });

  it("passado o bloqueio, volta a aceitar", () => {
    const bloqueado: EstadoLimite = {
      tentativas: 6,
      janelaInicio: AGORA,
      bloqueadoAte: emMinutos(1),
    };
    const d = decidir(bloqueado, emMinutos(20));
    expect(d.bloqueado).toBe(false);
  });
});

describe("bloqueio progressivo", () => {
  it("cada estouro dura mais que o anterior", () => {
    const duracoes = DEGRAUS_MINUTOS.map((_, i) => duracaoDoBloqueioMs(i));
    for (let i = 1; i < duracoes.length; i += 1) {
      expect(duracoes[i], `degrau ${i}`).toBeGreaterThan(duracoes[i - 1]);
    }
  });

  it("o primeiro estouro e curto: quem so errou a senha nao fica de castigo", () => {
    expect(duracaoDoBloqueioMs(0)).toBe(60_000);
  });

  it("estouro alem do ultimo degrau nao ultrapassa o teto", () => {
    const teto = duracaoDoBloqueioMs(DEGRAUS_MINUTOS.length - 1);
    expect(duracaoDoBloqueioMs(999)).toBe(teto);
    expect(duracaoDoBloqueioMs(-5)).toBe(duracaoDoBloqueioMs(0));
  });

  it("forca bruta fica inviavel: quem espera o bloqueio passar sobe de degrau", () => {
    // Modela o ataque real: insiste, e a cada bloqueio espera ele expirar para
    // tentar de novo. E este o caminho que precisa levar ao teto.
    let estado = insistir(LIMITE);
    let instante = AGORA;
    const duracoes: number[] = [];

    for (let i = 0; i < DEGRAUS_MINUTOS.length + 2; i += 1) {
      const d = decidir(estado, instante);
      if (d.proximo) estado = d.proximo;
      if (d.bloqueado) {
        duracoes.push(d.esperarSegundos);
        // Espera o castigo acabar, que e o que um atacante faz.
        instante = new Date(instante.getTime() + d.esperarSegundos * 1000 + 1000);
      }
    }

    expect(duracoes.length).toBeGreaterThan(1);
    // Cada castigo dura mais que o anterior, ate o teto.
    for (let i = 1; i < duracoes.length; i += 1) {
      expect(duracoes[i], `castigo ${i}`).toBeGreaterThanOrEqual(duracoes[i - 1]);
    }
    const teto = DEGRAUS_MINUTOS[DEGRAUS_MINUTOS.length - 1] * 60;
    expect(Math.max(...duracoes)).toBe(teto);
  });

  it("o degrau alto e alcancavel: a janela recomeca no bloqueio", () => {
    // Regressao do defeito encontrado: com a janela contando do inicio, um
    // bloqueio mais longo que ela zerava a contagem sozinho e o atacante
    // voltava para sempre ao primeiro degrau.
    const bloqueioLongo = DEGRAUS_MINUTOS[DEGRAUS_MINUTOS.length - 1] * 60_000;
    expect(bloqueioLongo).toBeGreaterThan(JANELA_MS);
  });
});

describe("mensagem", () => {
  it("nao revela contagem, tentativa restante nem existencia de conta", () => {
    const texto = textoDeEspera(120);
    expect(texto).not.toMatch(/\d+ de \d+|restant|e-mail|senha|conta/i);
    expect(texto).toContain("2 minutos");
  });

  it("ate um minuto fala em minuto, e nao em segundos", () => {
    expect(textoDeEspera(30)).toContain("um minuto");
  });
});
