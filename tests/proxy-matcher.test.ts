import { readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CAPACIDADE_DA_ROTA } from "@/lib/capabilities";
import { ROTAS_INTERNAS, config } from "@/proxy";

// O que este arquivo protege
// ---------------------------------------------------------------------------
// O middleware passou a rodar SÓ nas telas internas, em vez de rodar em tudo
// menos numa lista de exceções. Foi assim que endereço inexistente deixou de
// cair no login e passou a responder 404.
//
// O preço dessa inversão é que a lista precisa acompanhar o sistema: tela nova
// que não entre ali não é barrada pelo middleware. Não vira brecha — a página
// se protege sozinha —, mas o visitante faria uma viagem à toa até o servidor.
// Os testes abaixo cobram essa sincronia.

const RAIZ_APP = join(process.cwd(), "src", "app");

/** Rotas de primeiro nível que têm page.tsx e exigem login. */
function telasComPagina(): string[] {
  return readdirSync(RAIZ_APP, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .filter((e) => !e.name.startsWith("(") && !e.name.startsWith("[") && !e.name.startsWith("_"))
    .filter((e) => existsSync(join(RAIZ_APP, e.name, "page.tsx")))
    .map((e) => `/${e.name}`);
}

/** As públicas, que NÃO podem estar no matcher. */
const PUBLICAS = ["/login", "/cadastro", "/planos", "/privacidade", "/termos", "/para", "/portal"];

describe("matcher do middleware", () => {
  it("cada rota interna aparece no matcher com o sufixo de subcaminho", () => {
    for (const rota of ROTAS_INTERNAS) {
      expect(config.matcher, rota).toContain(`${rota}/:path*`);
    }
    expect(config.matcher).toHaveLength(ROTAS_INTERNAS.length);
  });

  it("nenhuma rota publica entrou no matcher", () => {
    // Uma publica aqui dentro esconderia a pagina de vendas atras do login --
    // ja aconteceu antes com /planos.
    for (const publica of PUBLICAS) {
      for (const entrada of config.matcher) {
        expect(entrada.startsWith(`${publica}/`), `${publica} em ${entrada}`).toBe(false);
      }
    }
  });

  it("toda rota com capacidade declarada e protegida pelo middleware", () => {
    // capabilities.ts diz quais telas exigem permissao. Se uma delas nao estiver
    // no matcher, ha divergencia entre os dois lugares.
    for (const rota of Object.keys(CAPACIDADE_DA_ROTA)) {
      const raiz = `/${rota.split("/")[1]}`;
      expect(ROTAS_INTERNAS as readonly string[], `${rota} fora do matcher`).toContain(raiz);
    }
  });

  it("toda tela com page.tsx e publica declarada OU esta no matcher", () => {
    // O teste que pega tela nova esquecida: ou ela e assumidamente publica, ou
    // precisa estar protegida.
    const conhecidas = new Set<string>([...ROTAS_INTERNAS, ...PUBLICAS]);
    const orfas = telasComPagina().filter((r) => !conhecidas.has(r));
    expect(orfas, `telas sem classificacao: ${orfas.join(", ")}`).toEqual([]);
  });

  it("as rotas que precisam responder sem login ficam de fora", () => {
    // /api responde JSON e tem guarda propria; /monitoring e o tunel do Sentry,
    // que recebe POST de visitante deslogado -- ja morreu uma vez por causa
    // disso.
    for (const fora of ["/api", "/monitoring"]) {
      for (const entrada of config.matcher) {
        expect(entrada.startsWith(`${fora}/`), `${fora} em ${entrada}`).toBe(false);
      }
    }
  });

  it("a lista nao tem repetido nem esta desordenada", () => {
    const lista = [...ROTAS_INTERNAS];
    expect(new Set(lista).size).toBe(lista.length);
    expect(lista).toEqual([...lista].sort());
  });
});
