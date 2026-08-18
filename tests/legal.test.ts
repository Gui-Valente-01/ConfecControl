import { describe, expect, it } from "vitest";
import { dadosLegais, pendenciasLegais } from "@/lib/legal";

// O que este arquivo protege
// ---------------------------------------------------------------------------
// As paginas de privacidade e termos so podem valer se identificarem quem
// responde pelos dados. O risco aqui e duplo e simetrico:
//
//   - deixar passar como "pronto" um documento sem controlador identificavel;
//   - cobrar CNPJ de quem nao tem empresa, prendendo a pagina em pendencia
//     eterna e empurrando a pessoa a inventar um numero.
//
// Por isso o tipo do controlador muda quais campos sao exigidos.

const PJ_COMPLETA = {
  LEGAL_TIPO_CONTROLADOR: "pj",
  LEGAL_NOME_CONTROLADOR: "Exemplo Sistemas Ltda",
  LEGAL_CNPJ: "00.000.000/0001-00",
  LEGAL_ENDERECO: "Rua Exemplo, 1 - Cidade/UF",
  LEGAL_EMAIL_PRIVACIDADE: "privacidade@exemplo.com",
  LEGAL_ENCARREGADO_NOME: "Fulano de Tal",
};

const PF_COMPLETA = {
  LEGAL_TIPO_CONTROLADOR: "pf",
  LEGAL_NOME_CONTROLADOR: "Fulano de Tal",
  LEGAL_EMAIL_PRIVACIDADE: "privacidade@exemplo.com",
  LEGAL_ENCARREGADO_NOME: "Fulano de Tal",
};

describe("tipo de controlador", () => {
  it("assume pessoa juridica quando nada e declarado", () => {
    expect(dadosLegais({}).tipo).toBe("pj");
    expect(dadosLegais({ LEGAL_TIPO_CONTROLADOR: "qualquer coisa" }).tipo).toBe("pj");
  });

  it("aceita pf em maiuscula e com espaco", () => {
    expect(dadosLegais({ LEGAL_TIPO_CONTROLADOR: " PF " }).tipo).toBe("pf");
  });

  it("usa o rotulo certo para cada tipo", () => {
    expect(dadosLegais(PJ_COMPLETA).rotuloNome).toBe("Razão social");
    expect(dadosLegais(PF_COMPLETA).rotuloNome).toBe("Responsável");
  });
});

describe("pessoa juridica", () => {
  it("so fica completa com os cinco campos", () => {
    expect(dadosLegais(PJ_COMPLETA).completo).toBe(true);
    for (const chave of Object.keys(PJ_COMPLETA).filter((k) => k !== "LEGAL_TIPO_CONTROLADOR")) {
      const faltando = { ...PJ_COMPLETA, [chave]: "" };
      expect(dadosLegais(faltando).completo, `sem ${chave}`).toBe(false);
    }
  });

  it("cobra CNPJ e endereco na lista de pendencias", () => {
    const chaves = pendenciasLegais(dadosLegais({ LEGAL_TIPO_CONTROLADOR: "pj" })).map((p) => p.chave);
    expect(chaves).toContain("LEGAL_CNPJ");
    expect(chaves).toContain("LEGAL_ENDERECO");
  });
});

describe("pessoa fisica", () => {
  it("fica completa sem CNPJ e sem endereco", () => {
    // O ponto central da mudanca: quem ainda nao abriu empresa consegue ter
    // documento valido, identificando-se pelo nome e por um canal de contato.
    expect(dadosLegais(PF_COMPLETA).completo).toBe(true);
  });

  it("nunca expoe CNPJ, mesmo se a variavel estiver preenchida por engano", () => {
    const dados = dadosLegais({ ...PF_COMPLETA, LEGAL_CNPJ: "00.000.000/0001-00" });
    expect(dados.cnpj).toBeNull();
  });

  it("nao cobra CNPJ nem endereco nas pendencias", () => {
    const chaves = pendenciasLegais(dadosLegais({ LEGAL_TIPO_CONTROLADOR: "pf" })).map((p) => p.chave);
    expect(chaves).not.toContain("LEGAL_CNPJ");
    expect(chaves).not.toContain("LEGAL_ENDERECO");
  });

  it("continua exigindo nome e canal de contato", () => {
    const chaves = pendenciasLegais(dadosLegais({ LEGAL_TIPO_CONTROLADOR: "pf" })).map((p) => p.chave);
    expect(chaves).toContain("LEGAL_NOME_CONTROLADOR");
    expect(chaves).toContain("LEGAL_EMAIL_PRIVACIDADE");
    expect(chaves).toContain("LEGAL_ENCARREGADO_NOME");
  });

  it("pede o nome civil, e nao razao social, na mensagem de pendencia", () => {
    const pendencia = pendenciasLegais(dadosLegais({ LEGAL_TIPO_CONTROLADOR: "pf" })).find(
      (p) => p.chave === "LEGAL_NOME_CONTROLADOR",
    );
    expect(pendencia?.oQue).toMatch(/nome civil/i);
  });

  it("mostra o endereco se a pessoa escolher publicar", () => {
    const dados = dadosLegais({ ...PF_COMPLETA, LEGAL_ENDERECO: "Rua Exemplo, 1" });
    expect(dados.endereco).toBe("Rua Exemplo, 1");
    expect(dados.completo).toBe(true);
  });
});

describe("compatibilidade e contato", () => {
  it("LEGAL_RAZAO_SOCIAL continua funcionando para quem ja configurou", () => {
    const dados = dadosLegais({ ...PJ_COMPLETA, LEGAL_NOME_CONTROLADOR: "", LEGAL_RAZAO_SOCIAL: "Antiga Ltda" });
    expect(dados.nomeControlador).toBe("Antiga Ltda");
    expect(dados.completo).toBe(true);
  });

  it("o nome novo vence o antigo quando os dois existem", () => {
    const dados = dadosLegais({ LEGAL_NOME_CONTROLADOR: "Novo", LEGAL_RAZAO_SOCIAL: "Antigo" });
    expect(dados.nomeControlador).toBe("Novo");
  });

  it("o e-mail do encarregado cai no de privacidade quando nao informado", () => {
    expect(dadosLegais(PF_COMPLETA).encarregadoEmail).toBe("privacidade@exemplo.com");
  });

  it("espaco em branco nao conta como valor preenchido", () => {
    expect(dadosLegais({ LEGAL_TIPO_CONTROLADOR: "pf", LEGAL_NOME_CONTROLADOR: "   " }).nomeControlador).toBeNull();
  });
});
