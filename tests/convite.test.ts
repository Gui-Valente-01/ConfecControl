import { describe, expect, it } from "vitest";
import {
  DIAS_DE_VALIDADE_DO_CONVITE,
  calcularExpiracao,
  conviteUtilizavel,
  emailPodeUsarConvite,
  estadoDoConvite,
  montarConvite,
  urlDoCadastro,
} from "@/lib/convite";

// O que este arquivo protege
// ---------------------------------------------------------------------------
// O convite é a primeira frase do relacionamento com um cliente pagante, e ele
// sai do sistema pronto para colar. Três coisas não podem escapar aqui: o
// código errado (o cliente trava na primeira tela e conclui que o produto não
// funciona), promessa de tempo sem medição, e convite que vale para sempre.
//
// A regra de estado é a mesma que /master usa para pintar a etiqueta e que o
// cadastro usa para aceitar ou recusar. Um teste só, servindo aos dois lados.

const ORIGEM = "https://www.confeccontrol.com";
const AGORA = new Date("2026-08-28T12:00:00.000Z");
const semPrazo = { usedAt: null, revokedAt: null, expiresAt: null };

describe("endereço do cadastro", () => {
  it("monta a URL absoluta", () => {
    expect(urlDoCadastro(ORIGEM)).toBe("https://www.confeccontrol.com/cadastro");
  });

  it("não duplica a barra quando a origem vem com uma no fim", () => {
    expect(urlDoCadastro("https://www.confeccontrol.com/")).toBe("https://www.confeccontrol.com/cadastro");
  });
});

describe("prazo do convite", () => {
  it("soma os dias de validade à data de criação", () => {
    const criado = new Date("2026-08-28T12:00:00.000Z");
    const prazo = calcularExpiracao(criado);
    const dias = (prazo.getTime() - criado.getTime()) / (1000 * 60 * 60 * 24);
    expect(dias).toBe(DIAS_DE_VALIDADE_DO_CONVITE);
  });

  it("não altera a data recebida", () => {
    const criado = new Date("2026-08-28T12:00:00.000Z");
    calcularExpiracao(criado);
    expect(criado.toISOString()).toBe("2026-08-28T12:00:00.000Z");
  });
});

describe("estado do convite", () => {
  it("token novo com prazo à frente está disponível", () => {
    const token = { usedAt: null, revokedAt: null, expiresAt: new Date("2026-09-11T12:00:00.000Z") };
    expect(estadoDoConvite(token, AGORA)).toBe("disponivel");
    expect(conviteUtilizavel(token, AGORA)).toBe(true);
  });

  it("token vencido não serve mais", () => {
    const token = { usedAt: null, revokedAt: null, expiresAt: new Date("2026-08-27T12:00:00.000Z") };
    expect(estadoDoConvite(token, AGORA)).toBe("expirado");
    expect(conviteUtilizavel(token, AGORA)).toBe(false);
  });

  it("vence no instante exato do prazo, não depois", () => {
    // Limite fechado: expiresAt igual a agora já está expirado. Evita a janela
    // de um milissegundo em que a tela diz uma coisa e o banco outra.
    const token = { usedAt: null, revokedAt: null, expiresAt: new Date(AGORA) };
    expect(estadoDoConvite(token, AGORA)).toBe("expirado");
  });

  it("token antigo sem prazo continua valendo", () => {
    // Migração não fez backfill de propósito: invalidar convite já enviado
    // quebraria a ativação de alguém sem aviso.
    expect(estadoDoConvite(semPrazo, AGORA)).toBe("disponivel");
  });

  it("revogado vence usado", () => {
    const token = { usedAt: AGORA, revokedAt: AGORA, expiresAt: null };
    expect(estadoDoConvite(token, AGORA)).toBe("revogado");
  });

  it("usado vence expirado", () => {
    // Quem já ativou não pode aparecer como "expirado" na tela do dono.
    const token = { usedAt: AGORA, revokedAt: null, expiresAt: new Date("2020-01-01T00:00:00.000Z") };
    expect(estadoDoConvite(token, AGORA)).toBe("usado");
  });
});

describe("convite preso a um e-mail", () => {
  it("aceita o e-mail combinado", () => {
    expect(emailPodeUsarConvite("maria@malharia.com.br", "maria@malharia.com.br")).toBe(true);
  });

  it("ignora diferença de maiúscula e espaço", () => {
    expect(emailPodeUsarConvite("  Maria@Malharia.com.br ", "maria@malharia.com.br")).toBe(true);
  });

  it("recusa e-mail diferente", () => {
    expect(emailPodeUsarConvite("maria@malharia.com.br", "outro@empresa.com")).toBe(false);
  });

  it("sem e-mail combinado, qualquer um serve", () => {
    // A escolha é do dono: deixar em branco significa "quem receber, ativa".
    expect(emailPodeUsarConvite(null, "qualquer@empresa.com")).toBe(true);
    expect(emailPodeUsarConvite("   ", "qualquer@empresa.com")).toBe(true);
  });
});

describe("mensagem de convite", () => {
  const convite = montarConvite({
    code: "48273915",
    clientName: "Malharia Duas Irmãs",
    contactEmail: null,
    expiresAt: new Date("2026-09-11T12:00:00.000Z"),
    origin: ORIGEM,
  });

  it("carrega o código exatamente como recebido", () => {
    expect(convite).toContain("48273915");
  });

  it("leva o cliente direto para o cadastro", () => {
    expect(convite).toContain("https://www.confeccontrol.com/cadastro");
  });

  it("chama o cliente pelo nome", () => {
    expect(convite).toContain("Oi, Malharia Duas Irmãs!");
  });

  it("avisa a regra da senha, que é o ponto onde o cadastro trava", () => {
    expect(convite).toMatch(/10 caracteres/);
  });

  it("diz até quando o código vale", () => {
    expect(convite).toContain("11/09/2026");
  });

  it("não promete prazo de execução que ninguém mediu", () => {
    // "no ar em uma tarde" e "conta em dois minutos" já foram publicados sem
    // nenhuma medição por trás. Convite que promete tempo faz o cliente
    // cronometrar.
    expect(convite).not.toMatch(/uma tarde|dois minutos|em minutos|rapidinho|instantâneo/i);
  });

  it("não usa markdown, que vira lixo fora do WhatsApp", () => {
    expect(convite).not.toMatch(/\*\*|__|^#/m);
  });

  it("numera os passos sem buraco quando não há e-mail preso", () => {
    expect(convite).toContain("1. Abra");
    expect(convite).toContain("2. Digite o código");
    expect(convite).toContain("3. Preencha o nome da confecção");
    expect(convite).not.toContain("4.");
  });
});

describe("mensagem quando o convite é de um e-mail só", () => {
  const convite = montarConvite({
    code: "48273915",
    clientName: "Rosa Norte",
    contactEmail: "rosa@rosanorte.com.br",
    expiresAt: new Date("2026-09-11T12:00:00.000Z"),
    origin: ORIGEM,
  });

  it("diz qual e-mail usar, senão o cliente descobre no erro", () => {
    expect(convite).toContain("rosa@rosanorte.com.br");
  });

  it("insere o passo do e-mail e renumera o resto", () => {
    expect(convite).toContain("3. Cadastre-se com o e-mail rosa@rosanorte.com.br");
    expect(convite).toContain("4. Preencha o nome da confecção");
  });
});

describe("convite sem nome de cliente", () => {
  it("usa saudação neutra em vez de deixar buraco no texto", () => {
    const convite = montarConvite({ code: "10000000", clientName: null, origin: ORIGEM });
    expect(convite).toContain("Oi!");
    expect(convite).not.toContain("undefined");
    expect(convite).not.toContain("null");
  });

  it("trata nome só com espaços como ausente", () => {
    const convite = montarConvite({ code: "10000000", clientName: "   ", origin: ORIGEM });
    expect(convite).toContain("Oi!");
  });

  it("token sem prazo não inventa data na mensagem", () => {
    const convite = montarConvite({ code: "10000000", clientName: null, expiresAt: null, origin: ORIGEM });
    expect(convite).toContain("vale uma vez só.");
    expect(convite).not.toMatch(/até\s/);
  });
});
