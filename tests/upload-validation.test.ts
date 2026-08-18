import { describe, expect, it } from "vitest";
import {
  TAMANHO_MAXIMO_BYTES,
  caminhoNoBucket,
  caminhoPertenceAEmpresa,
  extensaoDe,
  normalizarNome,
  tipoRealDoConteudo,
  validarArquivo,
} from "@/lib/upload-validation";

/** Monta bytes iniciais a partir de uma assinatura conhecida. */
function bytes(assinatura: number[], tamanho = 32): Uint8Array {
  const b = new Uint8Array(tamanho);
  assinatura.forEach((v, i) => {
    b[i] = v;
  });
  return b;
}

const JPEG = bytes([0xff, 0xd8, 0xff, 0xe0]);
const PNG = bytes([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const PDF = bytes([0x25, 0x50, 0x44, 0x46, 0x2d]);
const GIF = bytes([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]);
// "<html>" — o arquivo perigoso que um bucket publico serviria como pagina.
const HTML = bytes([0x3c, 0x68, 0x74, 0x6d, 0x6c, 0x3e]);

function webp(): Uint8Array {
  const b = new Uint8Array(32);
  [0x52, 0x49, 0x46, 0x46].forEach((v, i) => (b[i] = v));
  [0x57, 0x45, 0x42, 0x50].forEach((v, i) => (b[8 + i] = v));
  return b;
}

describe("tipoRealDoConteudo", () => {
  it("reconhece os formatos aceitos pela assinatura", () => {
    expect(tipoRealDoConteudo(JPEG)).toBe("image/jpeg");
    expect(tipoRealDoConteudo(PNG)).toBe("image/png");
    expect(tipoRealDoConteudo(GIF)).toBe("image/gif");
    expect(tipoRealDoConteudo(webp())).toBe("image/webp");
    expect(tipoRealDoConteudo(PDF)).toBe("application/pdf");
  });

  it("nao reconhece HTML nem lixo", () => {
    expect(tipoRealDoConteudo(HTML)).toBeNull();
    expect(tipoRealDoConteudo(new Uint8Array(16))).toBeNull();
  });
});

describe("validarArquivo", () => {
  it("aceita foto de celular comum", () => {
    const r = validarArquivo({
      nome: "IMG_20260818.jpg",
      tamanho: 2_000_000,
      declarado: "image/jpeg",
      bytesIniciais: JPEG,
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.mime).toBe("image/jpeg");
  });

  it("aceita PDF da arte", () => {
    const r = validarArquivo({
      nome: "arte-final.pdf",
      tamanho: 500_000,
      declarado: "application/pdf",
      bytesIniciais: PDF,
    });
    expect(r.ok).toBe(true);
  });

  it("RECUSA html renomeado para .jpg e declarado como imagem", () => {
    // O ataque que o bucket publico transformava em pagina hospedada no
    // dominio do Storage. As duas primeiras checagens passariam: so o
    // conteudo denuncia.
    const r = validarArquivo({
      nome: "foto.jpg",
      tamanho: 1_000,
      declarado: "image/jpeg",
      bytesIniciais: HTML,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.erro).toMatch(/reconhecer|corresponde/i);
  });

  it("RECUSA imagem de verdade com extensao mentirosa", () => {
    const r = validarArquivo({
      nome: "arte.pdf",
      tamanho: 1_000,
      declarado: "application/pdf",
      bytesIniciais: JPEG,
    });
    expect(r.ok).toBe(false);
  });

  it("RECUSA tipo declarado divergente do conteudo", () => {
    const r = validarArquivo({
      nome: "foto.jpg",
      tamanho: 1_000,
      declarado: "text/html",
      bytesIniciais: JPEG,
    });
    expect(r.ok).toBe(false);
  });

  it("aceita quando o navegador nao declara tipo", () => {
    const r = validarArquivo({ nome: "foto.png", tamanho: 1_000, declarado: null, bytesIniciais: PNG });
    expect(r.ok).toBe(true);
  });

  it("RECUSA extensao fora da lista de permitidos", () => {
    for (const nome of ["arte.cdr", "planilha.xlsx", "script.js", "pacote.zip", "semextensao"]) {
      expect(validarArquivo({ nome, tamanho: 1_000, declarado: null, bytesIniciais: JPEG }).ok, nome).toBe(false);
    }
  });

  it("RECUSA arquivo vazio e acima do teto", () => {
    expect(validarArquivo({ nome: "a.jpg", tamanho: 0, declarado: null, bytesIniciais: JPEG }).ok).toBe(false);
    expect(
      validarArquivo({
        nome: "a.jpg",
        tamanho: TAMANHO_MAXIMO_BYTES + 1,
        declarado: null,
        bytesIniciais: JPEG,
      }).ok,
    ).toBe(false);
  });

  it("extensao em maiuscula funciona: o celular manda .JPG", () => {
    const r = validarArquivo({ nome: "FOTO.JPG", tamanho: 1_000, declarado: null, bytesIniciais: JPEG });
    expect(r.ok).toBe(true);
  });
});

describe("extensaoDe", () => {
  it("le a ultima extensao, em minuscula", () => {
    expect(extensaoDe("foto.JPG")).toBe("jpg");
    expect(extensaoDe("arte.final.pdf")).toBe("pdf");
  });

  it("sem extensao devolve vazio", () => {
    expect(extensaoDe("arquivo")).toBe("");
    expect(extensaoDe("termina.")).toBe("");
  });
});

describe("normalizarNome", () => {
  it("tira acento, espaco e simbolo", () => {
    expect(normalizarNome("Camisa Ação Final.jpg", "jpg")).toBe("camisa-acao-final.jpg");
  });

  it("neutraliza travessia de diretorio", () => {
    const nome = normalizarNome("../../etc/passwd.jpg", "jpg");
    expect(nome).not.toContain("..");
    expect(nome).not.toContain("/");
  });

  it("nome so de simbolos ainda gera arquivo utilizavel", () => {
    expect(normalizarNome("!!!.png", "png")).toBe("arquivo.png");
  });
});

describe("isolamento entre empresas", () => {
  it("o caminho comeca pela empresa", () => {
    const caminho = caminhoNoBucket({
      companyId: "empresa-a",
      orderId: "pedido-1",
      nomeArquivo: "foto.jpg",
      sufixoUnico: "abc",
    });
    expect(caminho.startsWith("empresa-a/")).toBe(true);
  });

  it("anexo de outra empresa e recusado", () => {
    expect(caminhoPertenceAEmpresa("empresa-a/pedido-1/x.jpg", "empresa-a")).toBe(true);
    expect(caminhoPertenceAEmpresa("empresa-b/pedido-1/x.jpg", "empresa-a")).toBe(false);
  });

  it("caminho com travessia e recusado mesmo comecando certo", () => {
    expect(caminhoPertenceAEmpresa("empresa-a/../empresa-b/x.jpg", "empresa-a")).toBe(false);
  });

  it("caminho vazio e recusado", () => {
    expect(caminhoPertenceAEmpresa("", "empresa-a")).toBe(false);
  });

  it("prefixo parecido nao passa: empresa-a10 nao e empresa-a", () => {
    expect(caminhoPertenceAEmpresa("empresa-a10/pedido/x.jpg", "empresa-a")).toBe(false);
  });
});
