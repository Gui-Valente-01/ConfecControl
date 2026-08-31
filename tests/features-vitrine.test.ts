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
// Em 18/08/2026 a pagina publica /planos passou a vender "Nota fiscal (NF-e) --
// emissao e acompanhamento com XML e DANFE". O recurso nao existe: o provedor
// configurado e o falso e nao ha integracao com a SEFAZ.
//
// Ninguem escreveu esse anuncio. Bastou acrescentar a feature em
// sellableFeatures: a vitrine lia a lista inteira, e o preset "Completo" usava
// [...featureKeys]. Um modulo interno virou promessa comercial sozinho.
//
// A regra agora: vitrine le publicFeatures; sellableFeatures continua completa
// para o painel interno e para o controle de acesso por rota.

const RAIZ = process.cwd();
const lerFonte = (rel: string) => readFileSync(join(RAIZ, rel), "utf-8");

describe("separacao entre modulo existente e modulo anunciavel", () => {
  it("fiscal existe no sistema mas nao e anunciavel", () => {
    expect(featureKeys).toContain("fiscal");
    expect(publicFeatures.map((f) => f.key)).not.toContain("fiscal");
  });

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
  it("a rota /fiscal continua protegida por plano", () => {
    expect(planAllowsRoute([], "/fiscal")).toBe(false);
    expect(planAllowsRoute(["fiscal"], "/fiscal")).toBe(true);
  });

  it("o painel interno ainda consegue atribuir fiscal a mao", () => {
    expect(sanitizeFeatures(["fiscal"])).toContain("fiscal");
  });

  it("as rotas dos modulos nao anunciaveis seguem mapeadas", () => {
    for (const f of sellableFeatures.filter((x) => x.anunciavel === false)) {
      expect(planAllowsRoute([], f.route), `${f.route} ficou liberada sem plano`).toBe(false);
    }
  });
});
