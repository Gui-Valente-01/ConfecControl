import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  featureKeys,
  featurePresets,
  planAllowsRoute,
  publicFeatures,
  sanitizeFeatures,
  sellableFeatures,
} from "@/lib/features";

// O que este arquivo protege
// ---------------------------------------------------------------------------
// Ja aconteceu de a pagina publica /planos passar a vender um modulo que o
// sistema nao entregava. Ninguem escreveu o anuncio: bastou acrescentar a
// feature em sellableFeatures, porque a vitrine lia a lista inteira e o preset
// "Completo" usava [...featureKeys]. Um modulo interno virou promessa
// comercial sozinho.
//
// A regra desde entao: vitrine le publicFeatures; sellableFeatures continua
// completa para o painel interno e para o controle de acesso por rota.
//
// Hoje nenhum modulo esta marcado anunciavel:false, entao os testes que varrem
// essa lista passam a vazio. Eles ficam de proposito: sao a rede para o
// proximo modulo que entrar antes de estar pronto.

const RAIZ = process.cwd();
const lerFonte = (rel: string) => readFileSync(join(RAIZ, rel), "utf-8");

describe("separacao entre modulo existente e modulo anunciavel", () => {
  it("publicFeatures e subconjunto de sellableFeatures", () => {
    const todas = new Set(sellableFeatures.map((f) => f.key));
    for (const f of publicFeatures) expect(todas.has(f.key)).toBe(true);
  });

  it("nenhum modulo marcado como nao anunciavel escapa para a vitrine", () => {
    const bloqueados = sellableFeatures.filter((f) => f.anunciavel === false).map((f) => f.key);
    for (const key of bloqueados) {
      expect(publicFeatures.map((f) => f.key), `${key} vazou`).not.toContain(key);
    }
  });
});

describe("presets", () => {
  it("nenhum preset concede modulo que nao pode ser anunciado", () => {
    // Vender "Completo" e entregar um modulo que avisa ser simulacao seria
    // prometer no ato da compra o que a tela depois desmente.
    const bloqueados = new Set(sellableFeatures.filter((f) => f.anunciavel === false).map((f) => f.key));
    for (const preset of featurePresets) {
      for (const key of preset.features) {
        expect(bloqueados.has(key), `preset ${preset.key} inclui ${key}`).toBe(false);
      }
    }
  });

  it("todo modulo de preset existe de fato", () => {
    for (const preset of featurePresets) {
      for (const key of preset.features) expect(featureKeys).toContain(key);
    }
  });
});

describe("as paginas publicas nao leem a lista completa", () => {
  // Teste de fonte, e nao de render: o erro original foi de importacao, e e ali
  // que ele reaparece se alguem trocar de volta por conveniencia.
  const VITRINES = ["src/app/planos/page.tsx", "src/app/para/[segmento]/page.tsx"];

  for (const arquivo of VITRINES) {
    it(`${arquivo} usa publicFeatures`, () => {
      const fonte = lerFonte(arquivo);
      expect(fonte).toContain("publicFeatures");
      expect(fonte, "vitrine nao pode ler sellableFeatures").not.toContain("sellableFeatures");
    });
  }
});

describe("o que a separacao nao pode quebrar", () => {
  it("uma rota de modulo continua protegida por plano", () => {
    expect(planAllowsRoute([], "/bancada")).toBe(false);
    expect(planAllowsRoute(["bancada"], "/bancada")).toBe(true);
  });

  it("o painel interno ainda consegue atribuir modulo a mao", () => {
    expect(sanitizeFeatures(["bancada"])).toContain("bancada");
  });

  it("as rotas dos modulos nao anunciaveis seguem mapeadas", () => {
    for (const f of sellableFeatures.filter((x) => x.anunciavel === false)) {
      expect(planAllowsRoute([], f.route), `${f.route} ficou liberada sem plano`).toBe(false);
    }
  });
});
