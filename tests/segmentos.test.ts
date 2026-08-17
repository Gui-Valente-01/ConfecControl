import { describe, expect, it } from "vitest";
import { featureKeys } from "@/lib/features";
import { acharSegmento, rotasDosSegmentos, segmentos } from "@/lib/segmentos";

describe("acharSegmento", () => {
  it("acha pelo endereco", () => {
    expect(acharSegmento("estamparias")?.nome).toBe("Estamparias e serigrafias");
  });

  it("endereco que nao existe devolve nulo, para a pagina dar 404", () => {
    expect(acharSegmento("padarias")).toBeNull();
    expect(acharSegmento("")).toBeNull();
  });
});

describe("conteudo dos segmentos", () => {
  it("cada endereco aparece uma vez so: dois iguais quebrariam a geracao das paginas", () => {
    const slugs = segmentos.map((s) => s.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("so aponta para modulo que existe de verdade", () => {
    for (const segmento of segmentos) {
      for (const recurso of segmento.recursos) {
        expect(featureKeys, `${segmento.slug} cita um modulo inexistente`).toContain(recurso);
      }
    }
  });

  it("cada pagina tem titulo e descricao proprios: repetir faz o Google tratar como pagina duplicada", () => {
    const titulos = segmentos.map((s) => s.metaTitulo);
    const descricoes = segmentos.map((s) => s.metaDescricao);
    expect(new Set(titulos).size).toBe(titulos.length);
    expect(new Set(descricoes).size).toBe(descricoes.length);
  });

  it("a descricao cabe no que a busca mostra", () => {
    for (const segmento of segmentos) {
      // Acima disso o Google corta a frase no meio.
      expect(segmento.metaDescricao.length, segmento.slug).toBeLessThanOrEqual(165);
      expect(segmento.metaDescricao.length, segmento.slug).toBeGreaterThan(70);
    }
  });

  it("nenhuma pagina fica sem dor e sem pergunta", () => {
    for (const segmento of segmentos) {
      expect(segmento.dores.length, segmento.slug).toBeGreaterThanOrEqual(3);
      expect(segmento.perguntas.length, segmento.slug).toBeGreaterThanOrEqual(3);
    }
  });

  it("as rotas seguem o formato que o sitemap e o rodape esperam", () => {
    expect(rotasDosSegmentos).toEqual(segmentos.map((s) => `/para/${s.slug}`));
    for (const rota of rotasDosSegmentos) {
      expect(rota).toMatch(/^\/para\/[a-z-]+$/);
    }
  });
});
