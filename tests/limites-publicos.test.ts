import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { compromissosManuais, limiteKeys, limites } from "@/lib/limites";

// O que este arquivo protege
// ---------------------------------------------------------------------------
// features-vitrine.test.ts cuida do lado positivo da promessa: nenhum modulo
// aparece a venda antes de existir. Falta o lado negativo, que ja custou caro:
// o modulo fiscal foi removido do produto, mas o texto que o mencionava ficou
// espalhado por pagina publica e manual. Cliente que le "conferir os dados
// fiscais antes de emitir" conclui, com razao, que o sistema emite.
//
// A regra aqui: paginas de divulgacao nao falam de fiscal de jeito nenhum;
// /planos e /termos podem falar, porque falam para NEGAR. E a negacao precisa
// existir de fato, senao o silencio volta a vender sozinho.

const RAIZ = process.cwd();
const ler = (rel: string) => readFileSync(join(RAIZ, rel), "utf-8");

// \b evita o falso positivo classico: "co-nfe-ccao" casa com /nfe/ sem borda.
const TERMO_FISCAL = /\bnf-?e\b|\bnfs-?e\b|nota fiscal|\bsefaz\b|\bdanfe\b/i;

describe("catalogo de limites", () => {
  it("todo limite diz o que nao faz, por que, e o que a pessoa faz no lugar", () => {
    expect(limites.length).toBeGreaterThan(0);
    for (const limite of limites) {
      expect(limite.titulo.trim(), `${limite.key} sem titulo`).not.toHaveLength(0);
      expect(limite.porque.trim(), `${limite.key} sem justificativa`).not.toHaveLength(0);
      // Dizer "nao faz" e parar deixa a pessoa sem caminho: ela conclui que o
      // sistema e incompleto em vez de focado. A saida e obrigatoria.
      expect(limite.saida.trim(), `${limite.key} sem saida pratica`).not.toHaveLength(0);
    }
  });

  it("nao ha limite duplicado", () => {
    expect(new Set(limiteKeys).size).toBe(limiteKeys.length);
  });

  it("o limite fiscal continua declarado", () => {
    // Enquanto nao houver provedor fiscal real, este item nao pode sumir da
    // lista por 'limpeza de texto'.
    const fiscal = limites.find((l) => l.key === "fiscal");
    expect(fiscal, "o limite fiscal sumiu do catalogo").toBeDefined();
    expect(fiscal!.porque).toMatch(TERMO_FISCAL);
  });

  it("todo compromisso manual explica quem executa", () => {
    for (const item of compromissosManuais) {
      expect(item.detalhe.trim(), `${item.key} sem detalhe`).not.toHaveLength(0);
    }
  });
});

describe("paginas de divulgacao nao tocam em fiscal", () => {
  // Estas paginas existem para atrair e explicar o produto. Uma mencao a nota
  // fiscal aqui, ainda que negativa, ja planta a ideia de que o assunto existe
  // no sistema. E uma mencao positiva seria promessa de recurso removido.
  const DIVULGACAO = [
    "src/app/page.tsx",
    "src/lib/segmentos.ts",
    "src/app/para/[segmento]/page.tsx",
    "public/manual.html",
  ];

  for (const arquivo of DIVULGACAO) {
    it(`${arquivo} nao menciona documento fiscal`, () => {
      const encontrado = ler(arquivo).match(TERMO_FISCAL);
      expect(encontrado?.[0], `${arquivo} voltou a falar de fiscal`).toBeUndefined();
    });
  }
});

describe("as paginas de contratacao negam explicitamente", () => {
  it("/planos mostra o catalogo de limites", () => {
    // Teste de fonte: se alguem apagar a secao para 'deixar a pagina mais
    // limpa', o import cai junto e isto quebra.
    const fonte = ler("src/app/planos/page.tsx");
    expect(fonte).toContain("@/lib/limites");
    expect(fonte).toContain("limites.map");
  });

  it("/planos avisa que a conta depende de codigo de ativacao", () => {
    // A pessoa nao pode descobrir no meio do cadastro que precisa falar comigo.
    expect(ler("src/app/planos/page.tsx")).toMatch(/c[oó]digo de ativa[cç][aã]o/i);
  });

  it("/termos declara que o sistema nao emite documento fiscal", () => {
    const fonte = ler("src/app/termos/page.tsx");
    expect(fonte).toMatch(/n[aã]o emite documentos fiscais/i);
    expect(fonte).toMatch(/\bsefaz\b/i);
  });

  it("/termos nao obriga o contratante a conferir dados antes de emitir", () => {
    // Redacao antiga. Toda obrigacao escrita como se o sistema emitisse volta a
    // sugerir que ele emite.
    expect(ler("src/app/termos/page.tsx")).not.toMatch(/antes de emitir qualquer documento/i);
  });
});
